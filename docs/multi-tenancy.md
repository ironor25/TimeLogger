# Multi-Tenancy & Data Isolation

PulseTime is designed from the ground up as a strict multi-tenant SaaS application. Data isolation is enforced at the server layer.

---

## 1. Tenant Resolution

Every authenticated HTTP request contains a verified JWT bearing the tenant's `organizationId`. 

The `@CurrentTenant()` decorator and NestJS `JwtAuthGuard` extract the organization ID securely. Clients are never permitted to specify `organizationId` in query strings or body parameters to access another tenant's data.

```typescript
@Get()
async getEmployees(@CurrentTenant() orgId: string) {
  return this.employeesService.findAll(orgId);
}
```

---

## 2. Server-Side Scoping

Every Prisma database query contains an explicit `organizationId` filter:
```typescript
const employee = await this.prisma.employee.findFirst({
  where: {
    id: employeeId,
    organizationId: tenantOrgId, // Strict tenant boundary
  },
});
```

---

## 3. Automated Cross-Tenant Security Verification

A dedicated End-to-End security test suite (`apps/api/test/tenant-isolation.spec.ts`) automatically validates:
1. Organization A cannot view Organization B's employees.
2. Organization A cannot fetch Organization B's project or task details (returns 404).
3. Desktop agents cannot record activity or work sessions across tenant boundaries.

Run the test suite:
```bash
pnpm --filter @pulsetime/api test:e2e
```
