"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const request = require("supertest");
const app_module_1 = require("../src/app.module");
const prisma_service_1 = require("../src/prisma/prisma.service");
const bcrypt = require("bcryptjs");
describe('Multi-Tenant Data Isolation (e2e Security Test)', () => {
    let app;
    let prisma;
    let orgA;
    let orgB;
    let tokenA;
    let tokenB;
    let employeeA;
    let employeeB;
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('api/v1');
        app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
        await app.init();
        prisma = app.get(prisma_service_1.PrismaService);
        const passHash = await bcrypt.hash('Password123!', 10);
        orgA = await prisma.organization.upsert({
            where: { slug: 'test-org-alpha' },
            update: {},
            create: {
                name: 'Organization Alpha',
                slug: 'test-org-alpha',
                timezone: 'UTC',
            },
        });
        orgB = await prisma.organization.upsert({
            where: { slug: 'test-org-beta' },
            update: {},
            create: {
                name: 'Organization Beta',
                slug: 'test-org-beta',
                timezone: 'UTC',
            },
        });
        const roleA = await prisma.role.upsert({
            where: { organizationId_name: { organizationId: orgA.id, name: 'OWNER' } },
            update: {},
            create: { organizationId: orgA.id, name: 'OWNER', isSystem: true },
        });
        const roleB = await prisma.role.upsert({
            where: { organizationId_name: { organizationId: orgB.id, name: 'OWNER' } },
            update: {},
            create: { organizationId: orgB.id, name: 'OWNER', isSystem: true },
        });
        const userA = await prisma.user.upsert({
            where: { email: 'admin.alpha@test.local' },
            update: { passwordHash: passHash },
            create: { email: 'admin.alpha@test.local', passwordHash: passHash },
        });
        await prisma.userOrganizationRole.upsert({
            where: { userId_organizationId: { userId: userA.id, organizationId: orgA.id } },
            update: { roleId: roleA.id },
            create: { userId: userA.id, organizationId: orgA.id, roleId: roleA.id },
        });
        employeeA = await prisma.employee.upsert({
            where: { organizationId_employeeCode: { organizationId: orgA.id, employeeCode: 'ALPHA-001' } },
            update: {},
            create: {
                organizationId: orgA.id,
                userId: userA.id,
                employeeCode: 'ALPHA-001',
                firstName: 'Alice',
                lastName: 'Alpha',
                displayName: 'Alice Alpha',
                email: userA.email,
            },
        });
        const userB = await prisma.user.upsert({
            where: { email: 'admin.beta@test.local' },
            update: { passwordHash: passHash },
            create: { email: 'admin.beta@test.local', passwordHash: passHash },
        });
        await prisma.userOrganizationRole.upsert({
            where: { userId_organizationId: { userId: userB.id, organizationId: orgB.id } },
            update: { roleId: roleB.id },
            create: { userId: userB.id, organizationId: orgB.id, roleId: roleB.id },
        });
        employeeB = await prisma.employee.upsert({
            where: { organizationId_employeeCode: { organizationId: orgB.id, employeeCode: 'BETA-001' } },
            update: {},
            create: {
                organizationId: orgB.id,
                userId: userB.id,
                employeeCode: 'BETA-001',
                firstName: 'Bob',
                lastName: 'Beta',
                displayName: 'Bob Beta',
                email: userB.email,
            },
        });
        await prisma.project.upsert({
            where: { organizationId_code: { organizationId: orgB.id, code: 'CONFIDENTIAL-B' } },
            update: {},
            create: {
                organizationId: orgB.id,
                name: 'Secret Project Beta',
                code: 'CONFIDENTIAL-B',
            },
        });
        const loginARes = await request(app.getHttpServer())
            .post('/api/v1/auth/login')
            .send({ email: 'admin.alpha@test.local', password: 'Password123!' });
        tokenA = loginARes.body.data.tokens.accessToken;
        const loginBRes = await request(app.getHttpServer())
            .post('/api/v1/auth/login')
            .send({ email: 'admin.beta@test.local', password: 'Password123!' });
        tokenB = loginBRes.body.data.tokens.accessToken;
    });
    afterAll(async () => {
        await app.close();
    });
    it('Organization A MUST NEVER see employees belonging to Organization B', async () => {
        const res = await request(app.getHttpServer())
            .get('/api/v1/employees')
            .set('Authorization', `Bearer ${tokenA}`)
            .expect(200);
        expect(res.body.success).toBe(true);
        const employees = Array.isArray(res.body.data) ? res.body.data : res.body.data?.data || [];
        const hasEmployeeB = employees.some((e) => e.employeeCode === 'BETA-001');
        expect(hasEmployeeB).toBe(false);
    });
    it('Organization A MUST get 404 when directly requesting Organization B employee details by ID', async () => {
        await request(app.getHttpServer())
            .get(`/api/v1/employees/${employeeB.id}`)
            .set('Authorization', `Bearer ${tokenA}`)
            .expect(404);
    });
    it('Organization A MUST NEVER see projects belonging to Organization B', async () => {
        const res = await request(app.getHttpServer())
            .get('/api/v1/projects')
            .set('Authorization', `Bearer ${tokenA}`)
            .expect(200);
        expect(res.body.success).toBe(true);
        const projects = res.body.data;
        const hasProjectB = projects.some((p) => p.code === 'CONFIDENTIAL-B');
        expect(hasProjectB).toBe(false);
    });
    it('Desktop Agent cannot punch in for an employee belonging to another organization', async () => {
        const res = await request(app.getHttpServer())
            .post('/api/v1/agent/work-sessions/start')
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ notes: 'Cross-tenant attack attempt' });
        expect(res.status).toBe(200);
        expect(res.body.data.employeeId).toBe(employeeA.id);
        expect(res.body.data.organizationId).toBe(orgA.id);
        await request(app.getHttpServer())
            .post('/api/v1/agent/work-sessions/stop')
            .set('Authorization', `Bearer ${tokenA}`)
            .send({});
    });
});
//# sourceMappingURL=tenant-isolation.spec.js.map