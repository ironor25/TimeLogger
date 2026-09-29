import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD, Reflector } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { TenantContext } from './common/context/tenant-context.service';

import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { RolesGuard } from './common/guards/roles.guard';

import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { EmployeesModule } from './employees/employees.module';
import { DepartmentsModule } from './departments/departments.module';
import { SchedulesModule } from './schedules/schedules.module';
import { DevicesModule } from './devices/devices.module';
import { WorkSessionsModule } from './work-sessions/work-sessions.module';
import { ActivityModule } from './activity/activity.module';
import { ScreenshotsModule } from './screenshots/screenshots.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { AttendanceModule } from './attendance/attendance.module';
import { LeavesModule } from './leaves/leaves.module';
import { TimeEntriesModule } from './time-entries/time-entries.module';
import { ReportsModule } from './reports/reports.module';
import { RolesModule } from './roles/roles.module';
import { AuditModule } from './audit/audit.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    PrismaModule,
    StorageModule,
    AuthModule,
    OrganizationsModule,
    EmployeesModule,
    DepartmentsModule,
    SchedulesModule,
    DevicesModule,
    WorkSessionsModule,
    ActivityModule,
    ScreenshotsModule,
    ProjectsModule,
    TasksModule,
    AttendanceModule,
    LeavesModule,
    TimeEntriesModule,
    ReportsModule,
    RolesModule,
    AuditModule,
    HealthModule,
  ],
  providers: [
    Reflector,
    TenantContext,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [TenantContext],
})
export class AppModule {}
