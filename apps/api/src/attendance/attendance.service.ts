import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getDailyOverview(organizationId: string, dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [allEmployees, todaySessions, attendanceRecords] = await Promise.all([
      this.prisma.employee.findMany({
        where: { organizationId, status: 'ACTIVE' },
        include: {
          department: { select: { name: true } },
          devices: {
            take: 1,
            orderBy: { lastSeenAt: 'desc' },
          },
        },
      }),
      this.prisma.workSession.findMany({
        where: {
          organizationId,
          OR: [
            { startedAt: { gte: startOfDay, lte: endOfDay } },
            { status: { in: ['ACTIVE', 'PAUSED'] } },
          ],
        },
        include: {
          breaks: true,
          project: { select: { name: true, code: true } },
          task: { select: { title: true } },
        },
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.attendanceRecord.findMany({
        where: {
          organizationId,
          date: startOfDay,
        },
      }),
    ]);

    let workingCount = 0;
    let breakCount = 0;
    let offlineCount = 0;
    let totalWorkSeconds = 0;
    let totalActiveSeconds = 0;
    let totalIdleSeconds = 0;

    const employeeList = allEmployees.map((emp) => {
      // Find employee's sessions today
      const empSessions = todaySessions.filter((s) => s.employeeId === emp.id);
      const activeSession = empSessions.find((s) => s.status === 'ACTIVE' || s.status === 'PAUSED');
      const attRecord = attendanceRecords.find((a) => a.employeeId === emp.id);

      let status = 'OFFLINE';
      let currentSessionData: any = null;

      if (activeSession) {
        if (activeSession.status === 'PAUSED') {
          status = 'ON_BREAK';
          breakCount++;
        } else {
          status = 'WORKING';
          workingCount++;
        }
        currentSessionData = {
          id: activeSession.id,
          startedAt: activeSession.startedAt,
          status: activeSession.status,
          project: activeSession.project,
          task: activeSession.task,
        };
      } else {
        offlineCount++;
      }

      // Aggregate gross worked seconds and breaks for employee strictly within target day
      let empGrossSec = 0;
      let empBreakSec = 0;
      for (const s of empSessions) {
        const sessStart = new Date(s.startedAt);
        // Skip sessions that ended before start of today
        if (s.endedAt && new Date(s.endedAt) < startOfDay) {
          continue;
        }
        // Skip sessions that started after end of today
        if (sessStart > endOfDay) {
          continue;
        }

        const effectiveStart = sessStart < startOfDay ? startOfDay : sessStart;
        const effectiveEnd = s.endedAt
          ? new Date(s.endedAt) > endOfDay
            ? endOfDay
            : new Date(s.endedAt)
          : new Date() > endOfDay
          ? endOfDay
          : new Date();

        const dur = Math.max(0, Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / 1000));
        empGrossSec += dur;

        if (s.breaks) {
          for (const b of s.breaks) {
            const bStart = new Date(b.startedAt);
            if (bStart >= startOfDay && bStart <= endOfDay) {
              empBreakSec += b.durationSeconds || 0;
            }
          }
        }
      }

      const empIdleSec = attRecord?.totalIdleSeconds || 0;
      // Net time worked = gross - breaks - idle
      const empWorkedSec = Math.max(0, empGrossSec - empBreakSec - empIdleSec);

      totalWorkSeconds += empWorkedSec;
      totalActiveSeconds += empWorkedSec;
      totalIdleSeconds += empIdleSec;

      const todayEmpSessions = empSessions.filter((s) => new Date(s.startedAt) >= startOfDay);

      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        displayName: emp.displayName,
        department: emp.department?.name || null,
        status,
        firstPunchIn: attRecord?.firstPunchIn || (todayEmpSessions[0]?.startedAt || null),
        lastPunchOut: attRecord?.lastPunchOut || null,
        todayWorkedSeconds: empWorkedSec,
        todayBreakSeconds: empBreakSec,
        todayIdleSeconds: empIdleSec,
        formattedWorked: this.formatSeconds(empWorkedSec),
        activeSession: currentSessionData,
        lastSeenDevice: emp.devices[0]?.deviceName || null,
      };
    });

    return {
      date: startOfDay.toISOString().split('T')[0],
      metrics: {
        totalEmployees: allEmployees.length,
        workingCount,
        breakCount,
        offlineCount,
        totalWorkSeconds,
        totalActiveSeconds,
        totalIdleSeconds,
        formattedTotalWorked: this.formatSeconds(totalWorkSeconds),
        activePercentage: totalWorkSeconds > 0 ? Math.round((totalActiveSeconds / totalWorkSeconds) * 100) : 0,
      },
      employees: employeeList,
    };
  }

  async getAttendanceList(organizationId: string, options: { startDate?: string; endDate?: string; departmentId?: string }) {
    const start = options.startDate ? new Date(options.startDate) : new Date(Date.now() - 30 * 86400000);
    start.setHours(0, 0, 0, 0);
    const end = options.endDate ? new Date(options.endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const where: any = {
      organizationId,
      date: { gte: start, lte: end },
    };

    if (options.departmentId) {
      where.employee = { departmentId: options.departmentId };
    }

    const records = await this.prisma.attendanceRecord.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            displayName: true,
            employeeCode: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    return records.map((r) => ({
      ...r,
      formattedWork: this.formatSeconds(r.totalWorkSeconds),
      formattedActive: this.formatSeconds(r.totalActiveSeconds),
      formattedIdle: this.formatSeconds(r.totalIdleSeconds),
      formattedBreak: this.formatSeconds(r.totalBreakSeconds),
    }));
  }

  private formatSeconds(sec: number): string {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}
