import { PrismaClient, UserStatus, PlatformType, WorkSessionStatus, AttendanceStatus, LeaveStatus, TimeApprovalStatus, ProjectStatus, TaskPriority, TaskStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { key: 'employees.view', description: 'View organization employees' },
  { key: 'employees.create', description: 'Create new employees' },
  { key: 'employees.update', description: 'Update employee details' },
  { key: 'employees.delete', description: 'Remove or deactivate employees' },
  { key: 'attendance.view', description: 'View attendance records' },
  { key: 'attendance.edit', description: 'Edit or correct attendance' },
  { key: 'attendance.approve', description: 'Approve attendance corrections' },
  { key: 'screenshots.view', description: 'View captured employee screenshots' },
  { key: 'screenshots.delete', description: 'Delete employee screenshots' },
  { key: 'projects.view', description: 'View projects' },
  { key: 'projects.create', description: 'Create projects' },
  { key: 'projects.update', description: 'Update projects' },
  { key: 'projects.delete', description: 'Archive or delete projects' },
  { key: 'tasks.view', description: 'View tasks' },
  { key: 'tasks.create', description: 'Create tasks' },
  { key: 'tasks.update', description: 'Update tasks' },
  { key: 'tasks.delete', description: 'Delete tasks' },
  { key: 'reports.view', description: 'View productivity and time reports' },
  { key: 'reports.export', description: 'Export reports to CSV/Excel' },
  { key: 'leaves.view', description: 'View leave requests and balances' },
  { key: 'leaves.apply', description: 'Apply for leaves' },
  { key: 'leaves.approve', description: 'Approve or reject leave applications' },
  { key: 'settings.view', description: 'View organization configuration' },
  { key: 'settings.update', description: 'Modify organization configuration' },
  { key: 'roles.view', description: 'View system roles and permissions' },
  { key: 'roles.manage', description: 'Create and assign roles and permissions' },
];

async function main() {
  console.log('🌱 Starting comprehensive database seed for PulseTime...');

  // 1. Create or ensure permissions
  console.log('1. Seeding system permissions...');
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { description: perm.description },
      create: perm,
    });
  }
  const allPermissions = await prisma.permission.findMany();

  // 2. Create Organization
  console.log('2. Seeding Acme Technologies Organization...');
  const org = await prisma.organization.upsert({
    where: { slug: 'acme' },
    update: {},
    create: {
      name: 'Acme Technologies Inc.',
      slug: 'acme',
      timezone: 'Asia/Kolkata',
      dayResetTime: '04:00',
      screenshotIntervalMinutes: 5,
      idleThresholdMinutes: 5,
      autoPunchOutTime: '19:00',
      allowManualTime: true,
      allowEmployeeEditTime: false,
      allowScreenshotDelete: true,
      activityTrackingEnabled: true,
      screenshotTrackingEnabled: true,
      projectTrackingEnabled: true,
    },
  });

  // 3. Create System Roles
  console.log('3. Seeding Organization Roles...');
  const roleDefs = [
    { name: 'OWNER', isSystem: true, permFilter: () => true },
    { name: 'ADMIN', isSystem: true, permFilter: (p: any) => p.key !== 'roles.manage' },
    {
      name: 'MANAGER',
      isSystem: true,
      permFilter: (p: any) =>
        p.key.startsWith('employees.view') ||
        p.key.startsWith('attendance.') ||
        p.key.startsWith('screenshots.view') ||
        p.key.startsWith('projects.') ||
        p.key.startsWith('tasks.') ||
        p.key.startsWith('reports.') ||
        p.key.startsWith('leaves.') ||
        p.key === 'settings.view',
    },
    {
      name: 'EMPLOYEE',
      isSystem: true,
      permFilter: (p: any) =>
        p.key === 'attendance.view' ||
        p.key === 'leaves.apply' ||
        p.key === 'leaves.view' ||
        p.key === 'projects.view' ||
        p.key === 'tasks.view' ||
        p.key === 'tasks.update' ||
        p.key === 'screenshots.view',
    },
  ];

  const roleMap: Record<string, string> = {};
  for (const r of roleDefs) {
    const role = await prisma.role.upsert({
      where: {
        organizationId_name: {
          organizationId: org.id,
          name: r.name,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        name: r.name,
        isSystem: r.isSystem,
      },
    });
    roleMap[r.name] = role.id;

    // Connect permissions
    const permsToAssign = allPermissions.filter(r.permFilter);
    for (const p of permsToAssign) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: p.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: p.id,
        },
      });
    }
  }

  // 4. Create Work Schedules
  console.log('4. Seeding Work Schedules...');
  const defaultSchedule = await prisma.workSchedule.create({
    data: {
      organizationId: org.id,
      name: 'General Shift (9:00 - 18:30)',
      timezone: 'Asia/Kolkata',
      punchInAllowedFrom: '08:30',
      workStarts: '09:00',
      workEnds: '18:30',
      dayResetTime: '04:00',
      screenshotIntervalMinutes: 5,
      idleThresholdMinutes: 5,
      autoPunchOut: true,
      autoPunchOutTime: '19:00',
      isDefault: true,
    },
  });

  await prisma.workSchedule.create({
    data: {
      organizationId: org.id,
      name: 'Night Shift (21:00 - 05:30)',
      timezone: 'Asia/Kolkata',
      punchInAllowedFrom: '20:30',
      workStarts: '21:00',
      workEnds: '05:30',
      dayResetTime: '14:00',
      screenshotIntervalMinutes: 5,
      idleThresholdMinutes: 5,
      autoPunchOut: true,
      autoPunchOutTime: '06:00',
      isDefault: false,
    },
  });

  await prisma.workSchedule.create({
    data: {
      organizationId: org.id,
      name: 'Flexible Hours (Open)',
      timezone: 'Asia/Kolkata',
      punchInAllowedFrom: '00:00',
      workStarts: '09:00',
      workEnds: '18:00',
      dayResetTime: '04:00',
      screenshotIntervalMinutes: 5,
      idleThresholdMinutes: 5,
      autoPunchOut: false,
      isDefault: false,
    },
  });

  // 5. Create Departments
  console.log('5. Seeding Departments...');
  const deptData = [
    { name: 'Engineering', code: 'ENG' },
    { name: 'Product & Design', code: 'DES' },
    { name: 'Human Resources', code: 'HR' },
    { name: 'Sales & Marketing', code: 'SALES' },
  ];

  const deptMap: Record<string, string> = {};
  for (const d of deptData) {
    const dept = await prisma.department.upsert({
      where: {
        organizationId_name: {
          organizationId: org.id,
          name: d.name,
        },
      },
      update: { code: d.code },
      create: {
        organizationId: org.id,
        name: d.name,
        code: d.code,
      },
    });
    deptMap[d.name] = dept.id;
  }

  // 6. Create Leave Types
  console.log('6. Seeding Leave Types...');
  const leaveTypesData = [
    { name: 'Paid Time Off (PTO)', daysAllowed: 18, isPaid: true },
    { name: 'Sick Leave', daysAllowed: 10, isPaid: true },
    { name: 'Casual Leave', daysAllowed: 7, isPaid: true },
    { name: 'Unpaid Leave', daysAllowed: 30, isPaid: false },
  ];
  const leaveTypeMap: Record<string, string> = {};
  for (const lt of leaveTypesData) {
    const leaveType = await prisma.leaveType.upsert({
      where: {
        organizationId_name: {
          organizationId: org.id,
          name: lt.name,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        name: lt.name,
        daysAllowed: lt.daysAllowed,
        isPaid: lt.isPaid,
      },
    });
    leaveTypeMap[lt.name] = leaveType.id;
  }

  // 7. Seed Demo Users & 20+ Employees
  console.log('7. Seeding 24 Employees & Demo Users...');
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const employeeSeeds = [
    // Executive / Owner
    {
      email: 'owner@demo.local',
      role: 'OWNER',
      code: 'EMP-001',
      firstName: 'Alex',
      lastName: 'Mercer',
      dept: 'Engineering',
      isManager: true,
      title: 'Chief Technology Officer',
    },
    // Admin
    {
      email: 'admin@demo.local',
      role: 'ADMIN',
      code: 'EMP-002',
      firstName: 'Sarah',
      lastName: 'Connor',
      dept: 'Human Resources',
      isManager: true,
      title: 'VP of People & Operations',
    },
    // Manager
    {
      email: 'manager@demo.local',
      role: 'MANAGER',
      code: 'EMP-003',
      firstName: 'David',
      lastName: 'Miller',
      dept: 'Engineering',
      isManager: true,
      title: 'Engineering Director',
    },
    // Standard Demo Employee
    {
      email: 'employee@demo.local',
      role: 'EMPLOYEE',
      code: 'EMP-004',
      firstName: 'John',
      lastName: 'Doe',
      dept: 'Engineering',
      isManager: false,
      title: 'Senior Full Stack Engineer',
    },
    // Engineering Team
    { email: 'emily.watson@acme.local', role: 'EMPLOYEE', code: 'EMP-005', firstName: 'Emily', lastName: 'Watson', dept: 'Engineering', isManager: false, title: 'Backend Systems Engineer' },
    { email: 'robert.chen@acme.local', role: 'EMPLOYEE', code: 'EMP-006', firstName: 'Robert', lastName: 'Chen', dept: 'Engineering', isManager: false, title: 'Frontend Architect' },
    { email: 'priya.sharma@acme.local', role: 'EMPLOYEE', code: 'EMP-007', firstName: 'Priya', lastName: 'Sharma', dept: 'Engineering', isManager: false, title: 'DevOps / Cloud Engineer' },
    { email: 'marcus.vance@acme.local', role: 'EMPLOYEE', code: 'EMP-008', firstName: 'Marcus', lastName: 'Vance', dept: 'Engineering', isManager: false, title: 'QA Automation Engineer' },
    { email: 'aisha.khan@acme.local', role: 'EMPLOYEE', code: 'EMP-009', firstName: 'Aisha', lastName: 'Khan', dept: 'Engineering', isManager: false, title: 'Full Stack Engineer' },
    { email: 'lucas.silva@acme.local', role: 'EMPLOYEE', code: 'EMP-010', firstName: 'Lucas', lastName: 'Silva', dept: 'Engineering', isManager: false, title: 'Mobile Developer' },
    { email: 'hannah.schmidt@acme.local', role: 'EMPLOYEE', code: 'EMP-011', firstName: 'Hannah', lastName: 'Schmidt', dept: 'Engineering', isManager: false, title: 'Data Engineer' },
    { email: 'kai.takahashi@acme.local', role: 'EMPLOYEE', code: 'EMP-012', firstName: 'Kai', lastName: 'Takahashi', dept: 'Engineering', isManager: false, title: 'Software Engineer II' },

    // Design Team
    { email: 'elena.rostova@acme.local', role: 'MANAGER', code: 'EMP-013', firstName: 'Elena', lastName: 'Rostova', dept: 'Product & Design', isManager: true, title: 'Head of Product Design' },
    { email: 'liam.smith@acme.local', role: 'EMPLOYEE', code: 'EMP-014', firstName: 'Liam', lastName: 'Smith', dept: 'Product & Design', isManager: false, title: 'Senior UI/UX Designer' },
    { email: 'sophia.martinez@acme.local', role: 'EMPLOYEE', code: 'EMP-015', firstName: 'Sophia', lastName: 'Martinez', dept: 'Product & Design', isManager: false, title: 'Product Designer' },
    { email: 'noah.kim@acme.local', role: 'EMPLOYEE', code: 'EMP-016', firstName: 'Noah', lastName: 'Kim', dept: 'Product & Design', isManager: false, title: 'Visual & Motion Designer' },

    // HR Team
    { email: 'clara.oswald@acme.local', role: 'EMPLOYEE', code: 'EMP-017', firstName: 'Clara', lastName: 'Oswald', dept: 'Human Resources', isManager: false, title: 'HR Generalist' },
    { email: 'daniel.jackson@acme.local', role: 'EMPLOYEE', code: 'EMP-018', firstName: 'Daniel', lastName: 'Jackson', dept: 'Human Resources', isManager: false, title: 'Talent Acquisition Lead' },

    // Sales & Marketing Team
    { email: 'olivia.bennett@acme.local', role: 'MANAGER', code: 'EMP-019', firstName: 'Olivia', lastName: 'Bennett', dept: 'Sales & Marketing', isManager: true, title: 'VP of Growth' },
    { email: 'ethan.hunt@acme.local', role: 'EMPLOYEE', code: 'EMP-020', firstName: 'Ethan', lastName: 'Hunt', dept: 'Sales & Marketing', isManager: false, title: 'Account Executive' },
    { email: 'maya.patel@acme.local', role: 'EMPLOYEE', code: 'EMP-021', firstName: 'Maya', lastName: 'Patel', dept: 'Sales & Marketing', isManager: false, title: 'Enterprise Sales Manager' },
    { email: 'jordan.bell@acme.local', role: 'EMPLOYEE', code: 'EMP-022', firstName: 'Jordan', lastName: 'Bell', dept: 'Sales & Marketing', isManager: false, title: 'Marketing Specialist' },
    { email: 'chloe.dupont@acme.local', role: 'EMPLOYEE', code: 'EMP-023', firstName: 'Chloe', lastName: 'Dupont', dept: 'Sales & Marketing', isManager: false, title: 'Customer Success Manager' },
    { email: 'victor.creed@acme.local', role: 'EMPLOYEE', code: 'EMP-024', firstName: 'Victor', lastName: 'Creed', dept: 'Sales & Marketing', isManager: false, title: 'Sales Development Rep' },
  ];

  const createdEmployees: any[] = [];
  let managerEmployeeId: string | null = null;

  for (const s of employeeSeeds) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: { passwordHash },
      create: {
        email: s.email,
        passwordHash,
        status: UserStatus.ACTIVE,
      },
    });

    // Assign Role
    await prisma.userOrganizationRole.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: org.id,
        },
      },
      update: { roleId: roleMap[s.role] },
      create: {
        userId: user.id,
        organizationId: org.id,
        roleId: roleMap[s.role],
      },
    });

    // Create Employee record
    const emp: any = await prisma.employee.upsert({
      where: {
        organizationId_employeeCode: {
          organizationId: org.id,
          employeeCode: s.code,
        },
      },
      update: {
        firstName: s.firstName,
        lastName: s.lastName,
        displayName: `${s.firstName} ${s.lastName}`,
        departmentId: deptMap[s.dept],
        managerId: s.code === 'EMP-003' || s.code === 'EMP-001' ? null : managerEmployeeId,
      },
      create: {
        organizationId: org.id,
        userId: user.id,
        employeeCode: s.code,
        firstName: s.firstName,
        lastName: s.lastName,
        displayName: `${s.firstName} ${s.lastName}`,
        email: s.email,
        phone: `+1-555-01${s.code.split('-')[1]}`,
        departmentId: deptMap[s.dept],
        managerId: s.code === 'EMP-003' || s.code === 'EMP-001' ? null : managerEmployeeId,
        status: UserStatus.ACTIVE,
        joiningDate: new Date('2024-01-15T09:00:00Z'),
        timezone: 'Asia/Kolkata',
      },
    });

    if (s.code === 'EMP-003') {
      managerEmployeeId = emp.id;
    }

    // Assign schedule
    await prisma.scheduleAssignment.create({
      data: {
        organizationId: org.id,
        employeeId: emp.id,
        workScheduleId: defaultSchedule.id,
      },
    });

    // Seed Leave Balances for 2026
    for (const [ltName, ltId] of Object.entries(leaveTypeMap)) {
      const allowed = ltName.includes('PTO') ? 18 : ltName.includes('Sick') ? 10 : 7;
      await prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: emp.id,
            leaveTypeId: ltId,
            year: 2026,
          },
        },
        update: {},
        create: {
          organizationId: org.id,
          employeeId: emp.id,
          leaveTypeId: ltId,
          year: 2026,
          totalDays: allowed,
          usedDays: Math.floor(Math.random() * 3),
          remainingDays: allowed - Math.floor(Math.random() * 3),
        },
      });
    }

    createdEmployees.push(emp);
  }

  // 8. Create Projects & Tasks
  console.log('8. Seeding Projects & Tasks...');
  const projectsData = [
    {
      name: 'Website Revamp & Rebranding',
      code: 'WEB',
      description: 'Complete overhaul of marketing website, landing pages, and interactive product demo.',
      status: ProjectStatus.ACTIVE,
      tasks: [
        { title: 'Responsive Hero section and animations', priority: TaskPriority.HIGH, status: TaskStatus.DONE, est: 480 },
        { title: 'Interactive feature tour modal', priority: TaskPriority.MEDIUM, status: TaskStatus.IN_PROGRESS, est: 360 },
        { title: 'SEO meta tags, sitemap and canonical URLs', priority: TaskPriority.LOW, status: TaskStatus.TODO, est: 240 },
        { title: 'Dark mode theme toggle and persistent state', priority: TaskPriority.MEDIUM, status: TaskStatus.DONE, est: 180 },
      ],
    },
    {
      name: 'Mobile Application (iOS & Android)',
      code: 'MOB',
      description: 'Cross-platform mobile companion app for team check-ins, push alerts, and leave applications.',
      status: ProjectStatus.ACTIVE,
      tasks: [
        { title: 'Biometric FaceID / Fingerprint auth', priority: TaskPriority.URGENT, status: TaskStatus.IN_PROGRESS, est: 420 },
        { title: 'Real-time WebSocket heartbeat listener', priority: TaskPriority.HIGH, status: TaskStatus.IN_PROGRESS, est: 600 },
        { title: 'Offline sync queue for poor connectivity', priority: TaskPriority.HIGH, status: TaskStatus.TODO, est: 720 },
        { title: 'Push notification deep-linking', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, est: 300 },
      ],
    },
    {
      name: 'Internal Platform & Telemetry Ingestion',
      code: 'INT',
      description: 'Core backend micro-architecture, multi-tenant isolation, real-time activity ingestion, and reporting engine.',
      status: ProjectStatus.ACTIVE,
      tasks: [
        { title: 'High-throughput activity heartbeat endpoint', priority: TaskPriority.URGENT, status: TaskStatus.DONE, est: 540 },
        { title: 'Presigned S3 upload handler for screenshot captures', priority: TaskPriority.HIGH, status: TaskStatus.DONE, est: 360 },
        { title: 'Server-side employee daily productivity aggregator', priority: TaskPriority.HIGH, status: TaskStatus.IN_PROGRESS, est: 480 },
        { title: 'Multi-tenant database isolation security suite', priority: TaskPriority.URGENT, status: TaskStatus.DONE, est: 360 },
      ],
    },
  ];

  const createdTasks: any[] = [];
  const createdProjects: any[] = [];

  for (const p of projectsData) {
    const project = await prisma.project.upsert({
      where: {
        organizationId_code: {
          organizationId: org.id,
          code: p.code,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        name: p.name,
        code: p.code,
        description: p.description,
        status: p.status,
        startDate: new Date('2026-01-01'),
        createdById: createdEmployees[0].id,
      },
    });
    createdProjects.push(project);

    // Assign project members
    for (let i = 0; i < 6; i++) {
      const emp = createdEmployees[i];
      await prisma.projectMember.upsert({
        where: {
          projectId_employeeId: {
            projectId: project.id,
            employeeId: emp.id,
          },
        },
        update: {},
        create: {
          organizationId: org.id,
          projectId: project.id,
          employeeId: emp.id,
          role: i === 0 ? 'LEAD' : 'MEMBER',
        },
      });
    }

    // Create Tasks
    for (let tIdx = 0; tIdx < p.tasks.length; tIdx++) {
      const t = p.tasks[tIdx];
      const assignedEmp = createdEmployees[tIdx % createdEmployees.length];
      const task = await prisma.task.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          title: t.title,
          description: `Detailed technical criteria for ${t.title}`,
          status: t.status,
          priority: t.priority,
          assignedEmployeeId: assignedEmp.id,
          estimatedMinutes: t.est,
          dueDate: new Date(Date.now() + 86400000 * 7),
        },
      });
      createdTasks.push(task);
    }
  }

  // 9. Seed Devices, Work Sessions, Breaks, Activity & Screenshots for Demo
  console.log('9. Seeding Work Sessions, Activity Heartbeats & Screenshots...');
  const appPool = ['Visual Studio Code', 'Figma', 'Google Chrome - Jira', 'Postman', 'Slack', 'Terminal / PowerShell'];

  // Seed for the primary demo employees
  const targetEmployees = createdEmployees.slice(0, 10);
  const now = new Date();

  for (let i = 0; i < targetEmployees.length; i++) {
    const emp = targetEmployees[i];

    // Create device
    const device = await prisma.device.upsert({
      where: {
        organizationId_employeeId_deviceIdentifier: {
          organizationId: org.id,
          employeeId: emp.id,
          deviceIdentifier: `DEV-DESKTOP-${emp.employeeCode}`,
        },
      },
      update: { lastSeenAt: now },
      create: {
        organizationId: org.id,
        employeeId: emp.id,
        deviceIdentifier: `DEV-DESKTOP-${emp.employeeCode}`,
        deviceName: `${emp.firstName}'s WorkStation`,
        platform: i % 2 === 0 ? PlatformType.WINDOWS : PlatformType.MACOS,
        platformVersion: i % 2 === 0 ? 'Windows 11 Pro 23H2' : 'macOS Sonoma 14.5',
        appVersion: '1.4.0',
        lastSeenAt: now,
        status: 'ACTIVE',
      },
    });

    // Seed Yesterday's Session (Completed)
    const yesterdayStart = new Date(now.getTime() - 24 * 3600 * 1000);
    yesterdayStart.setHours(9, 30, 0, 0);
    const yesterdayEnd = new Date(yesterdayStart.getTime() + 8.5 * 3600 * 1000); // 8.5 hours
    const durationSec = Math.floor((yesterdayEnd.getTime() - yesterdayStart.getTime()) / 1000);

    const pastSession = await prisma.workSession.create({
      data: {
        organizationId: org.id,
        employeeId: emp.id,
        deviceId: device.id,
        projectId: createdProjects[i % createdProjects.length].id,
        taskId: createdTasks[i % createdTasks.length].id,
        startedAt: yesterdayStart,
        endedAt: yesterdayEnd,
        durationSeconds: durationSec,
        status: WorkSessionStatus.COMPLETED,
        timezone: 'Asia/Kolkata',
        startSource: 'DESKTOP_AGENT',
        endSource: 'MANUAL_STOP',
        notes: 'Feature development and unit testing',
        ipAddress: '192.168.1.10' + i,
      },
    });

    // Add a lunch break to past session
    const breakStart = new Date(yesterdayStart.getTime() + 4 * 3600 * 1000);
    const breakEnd = new Date(breakStart.getTime() + 45 * 60 * 1000); // 45 min
    await prisma.workSessionBreak.create({
      data: {
        organizationId: org.id,
        workSessionId: pastSession.id,
        employeeId: emp.id,
        startedAt: breakStart,
        endedAt: breakEnd,
        durationSeconds: 45 * 60,
        reason: 'Lunch break',
      },
    });

    // Attendance record for yesterday
    const attDate = new Date(yesterdayStart);
    attDate.setHours(0, 0, 0, 0);
    await prisma.attendanceRecord.upsert({
      where: {
        organizationId_employeeId_date: {
          organizationId: org.id,
          employeeId: emp.id,
          date: attDate,
        },
      },
      update: {},
      create: {
        organizationId: org.id,
        employeeId: emp.id,
        date: attDate,
        status: AttendanceStatus.PRESENT,
        firstPunchIn: yesterdayStart,
        lastPunchOut: yesterdayEnd,
        totalWorkSeconds: durationSec,
        totalActiveSeconds: Math.floor(durationSec * 0.85),
        totalIdleSeconds: Math.floor(durationSec * 0.15) - 45 * 60,
        totalBreakSeconds: 45 * 60,
        notes: 'Full workday completed normally',
      },
    });

    // Seed Today's Session (Active for first 6 employees, Paused for next 2)
    const todayStart = new Date();
    todayStart.setHours(9, 15, 0, 0);
    const isOngoing = i < 8;

    if (isOngoing) {
      const todaySession = await prisma.workSession.create({
        data: {
          organizationId: org.id,
          employeeId: emp.id,
          deviceId: device.id,
          projectId: createdProjects[i % createdProjects.length].id,
          taskId: createdTasks[i % createdTasks.length].id,
          startedAt: todayStart,
          endedAt: null,
          durationSeconds: Math.floor((now.getTime() - todayStart.getTime()) / 1000),
          status: i === 3 ? WorkSessionStatus.PAUSED : WorkSessionStatus.ACTIVE,
          timezone: 'Asia/Kolkata',
          startSource: 'DESKTOP_AGENT',
          notes: 'Daily sprint backlog execution',
          ipAddress: '192.168.1.10' + i,
        },
      });

      if (i === 3) {
        // Paused on coffee break
        await prisma.workSessionBreak.create({
          data: {
            organizationId: org.id,
            workSessionId: todaySession.id,
            employeeId: emp.id,
            startedAt: new Date(now.getTime() - 15 * 60 * 1000),
            endedAt: null,
            durationSeconds: 15 * 60,
            reason: 'Coffee & Stretch Break',
          },
        });
      }

      // Generate realistic periodic activity heartbeats (every 5 mins over the past 3 hours)
      const numHeartbeats = 15;
      for (let h = 0; h < numHeartbeats; h++) {
        const hbTime = new Date(now.getTime() - (numHeartbeats - h) * 5 * 60 * 1000);
        const isActive = Math.random() > 0.15;
        const activeSec = isActive ? 270 + Math.floor(Math.random() * 30) : 60;
        const idleSec = 300 - activeSec;
        const app = appPool[Math.floor(Math.random() * appPool.length)];

        await prisma.activityRecord.create({
          data: {
            organizationId: org.id,
            employeeId: emp.id,
            workSessionId: todaySession.id,
            deviceId: device.id,
            capturedAt: hbTime,
            activeSeconds: activeSec,
            idleSeconds: idleSec,
            activeApplication: app,
            windowTitle: `${app} - PulseTime SaaS`,
            keysPressed: Math.floor(Math.random() * 180),
            mouseClicks: Math.floor(Math.random() * 85),
          },
        });

        // Add screenshot every 2 heartbeats (approx every 10 min)
        if (h % 2 === 0) {
          await prisma.screenshot.create({
            data: {
              organizationId: org.id,
              employeeId: emp.id,
              workSessionId: todaySession.id,
              projectId: createdProjects[i % createdProjects.length].id,
              taskId: createdTasks[i % createdTasks.length].id,
              capturedAt: hbTime,
              storageKey: `screenshots/demo/${emp.employeeCode}_${hbTime.getTime()}.jpg`,
              mimeType: 'image/jpeg',
              fileSize: 185420 + Math.floor(Math.random() * 50000),
              width: 1920,
              height: 1080,
              activityPercentage: Math.round((activeSec / 300) * 100),
            },
          });
        }
      }

      // Attendance record for today (in progress)
      const todayAttDate = new Date();
      todayAttDate.setHours(0, 0, 0, 0);
      await prisma.attendanceRecord.upsert({
        where: {
          organizationId_employeeId_date: {
            organizationId: org.id,
            employeeId: emp.id,
            date: todayAttDate,
          },
        },
        update: {},
        create: {
          organizationId: org.id,
          employeeId: emp.id,
          date: todayAttDate,
          status: AttendanceStatus.PRESENT,
          firstPunchIn: todayStart,
          lastPunchOut: null,
          totalWorkSeconds: Math.floor((now.getTime() - todayStart.getTime()) / 1000),
          totalActiveSeconds: Math.floor((now.getTime() - todayStart.getTime()) / 1000 * 0.88),
          totalIdleSeconds: Math.floor((now.getTime() - todayStart.getTime()) / 1000 * 0.12),
          totalBreakSeconds: i === 3 ? 15 * 60 : 0,
        },
      });
    }
  }

  // 10. Seed Leave Requests & Manual Time Entries
  console.log('10. Seeding Leave Requests & Manual Time Approvals...');
  await prisma.leaveRequest.create({
    data: {
      organizationId: org.id,
      employeeId: createdEmployees[4].id, // Emily Watson
      leaveTypeId: leaveTypeMap['Paid Time Off (PTO)'],
      startDate: new Date('2026-10-05'),
      endDate: new Date('2026-10-07'),
      daysCount: 3,
      reason: 'Family wedding and travel',
      status: LeaveStatus.PENDING,
    },
  });

  await prisma.leaveRequest.create({
    data: {
      organizationId: org.id,
      employeeId: createdEmployees[5].id, // Robert Chen
      leaveTypeId: leaveTypeMap['Sick Leave'],
      startDate: new Date('2026-09-20'),
      endDate: new Date('2026-09-21'),
      daysCount: 1,
      reason: 'Doctor dental surgery recovery',
      status: LeaveStatus.APPROVED,
      approvedById: createdEmployees[2].id, // Manager
      actionedAt: new Date('2026-09-20T10:00:00Z'),
    },
  });

  // Manual Time Correction Request
  const yesterdayCorrectionDate = new Date();
  yesterdayCorrectionDate.setDate(yesterdayCorrectionDate.getDate() - 2);
  const mStart = new Date(yesterdayCorrectionDate);
  mStart.setHours(14, 0, 0, 0);
  const mEnd = new Date(yesterdayCorrectionDate);
  mEnd.setHours(16, 0, 0, 0);

  await prisma.manualTimeEntry.create({
    data: {
      organizationId: org.id,
      employeeId: createdEmployees[3].id, // John Doe
      date: yesterdayCorrectionDate,
      startTime: mStart,
      endTime: mEnd,
      durationSeconds: 7200,
      reason: 'Internet power outage at home; worked offline on local architecture diagrams.',
      status: TimeApprovalStatus.PENDING,
      createdById: createdEmployees[3].userId,
    },
  });

  console.log('✅ Database seed completed successfully!');
  console.log('----------------------------------------------------');
  console.log('🔑 DEMO CREDENTIALS (PASSWORD FOR ALL: Password123!)');
  console.log('  Owner:    owner@demo.local');
  console.log('  Admin:    admin@demo.local');
  console.log('  Manager:  manager@demo.local');
  console.log('  Employee: employee@demo.local');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
