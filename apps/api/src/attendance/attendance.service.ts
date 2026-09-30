import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getDailyOverview(organizationId: string, dateStr?: string) {
    const todayStr = new Date().toISOString().split('T')[0];
    const targetStr = dateStr || todayStr;
    const startOfDay = new Date(`${targetStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${targetStr}T23:59:59.999Z`);

    const [allEmployees, todaySessions, activityRecords, attendanceRecords] = await Promise.all([
      this.prisma.employee.findMany({
        where: { organizationId, status: 'ACTIVE' },
        include: {
          department: { select: { name: true } },
          devices: {
            take: 1,
            orderBy: { lastSeenAt: 'desc' },
          },
        },
        orderBy: { displayName: 'asc' },
      }),
      this.prisma.workSession.findMany({
        where: {
          organizationId,
          startedAt: { gte: startOfDay, lte: endOfDay },
        },
        include: {
          breaks: true,
          project: { select: { name: true, code: true } },
          task: { select: { title: true } },
        },
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.activityRecord.findMany({
        where: {
          organizationId,
          capturedAt: { gte: startOfDay, lte: endOfDay },
        },
        select: {
          employeeId: true,
          activeSeconds: true,
          idleSeconds: true,
        },
      }),
      this.prisma.attendanceRecord.findMany({
        where: {
          organizationId,
          date: { gte: startOfDay, lte: endOfDay },
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
      // Find employee's sessions and activity strictly for today (matching timeline logic)
      const empSessions = todaySessions.filter((s) => s.employeeId === emp.id);
      const empActivity = activityRecords.filter((a) => a.employeeId === emp.id);
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

      let grossSessionSec = 0;
      let breakSec = 0;
      let manualSec = 0;

      for (const s of empSessions) {
        if (s.endedAt) {
          grossSessionSec += s.durationSeconds;
        } else {
          grossSessionSec += Math.max(0, Math.floor((new Date().getTime() - s.startedAt.getTime()) / 1000));
        }

        if (s.startSource === 'MANUAL') {
          manualSec += s.durationSeconds;
        }

        if (s.breaks) {
          for (const b of s.breaks) {
            breakSec += b.durationSeconds || 0;
          }
        }
      }

      let idleSec = 0;
      for (const a of empActivity) {
        idleSec += a.idleSeconds || 0;
      }

      // Exact same formula as Work Timeline: Net worked seconds = gross - breaks - idle
      const empWorkedSec = Math.max(0, grossSessionSec - breakSec - idleSec);
      const empActiveSec = empWorkedSec;

      totalWorkSeconds += empWorkedSec;
      totalActiveSeconds += empActiveSec;
      totalIdleSeconds += idleSec;

      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        displayName: emp.displayName,
        department: emp.department?.name || null,
        status,
        firstPunchIn: attRecord?.firstPunchIn || (empSessions[empSessions.length - 1]?.startedAt || null),
        lastPunchOut: attRecord?.lastPunchOut || null,
        todayWorkedSeconds: empWorkedSec,
        todayActiveSeconds: empActiveSec,
        todayBreakSeconds: breakSec,
        todayIdleSeconds: idleSec,
        formattedWorked: this.formatSeconds(empWorkedSec),
        formattedActive: this.formatSeconds(empActiveSec),
        formattedBreak: this.formatSeconds(breakSec),
        formattedIdle: this.formatSeconds(idleSec),
        activeSession: currentSessionData,
        lastSeenDevice: emp.devices[0]?.deviceName || null,
      };
    });

    const totalTrackedSec = totalActiveSeconds + totalIdleSeconds;
    const activePercentage =
      totalTrackedSec > 0 ? Math.round((totalActiveSeconds / totalTrackedSec) * 100) : totalWorkSeconds > 0 ? 100 : 0;

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
        formattedTotalActive: this.formatSeconds(totalActiveSeconds),
        formattedTotalIdle: this.formatSeconds(totalIdleSeconds),
        activePercentage,
      },
      employees: employeeList,
    };
  }

  async getAttendanceList(
    organizationId: string,
    options: { date?: string; startDate?: string; endDate?: string; departmentId?: string },
  ) {
    const todayStr = new Date().toISOString().split('T')[0];
    const startStr = options.date || options.startDate || todayStr;
    const endStr = options.date || options.endDate || todayStr;

    const startOfDay = new Date(`${startStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${endStr}T23:59:59.999Z`);

    const empWhere: any = { organizationId, status: 'ACTIVE' };
    if (options.departmentId) {
      empWhere.departmentId = options.departmentId;
    }

    const [allEmployees, sessions, activityRecords, attendanceRecords, leaveRequests] = await Promise.all([
      this.prisma.employee.findMany({
        where: empWhere,
        include: {
          department: { select: { name: true } },
        },
        orderBy: { displayName: 'asc' },
      }),
      this.prisma.workSession.findMany({
        where: {
          organizationId,
          startedAt: { gte: startOfDay, lte: endOfDay },
        },
        include: {
          breaks: true,
        },
        orderBy: { startedAt: 'asc' },
      }),
      this.prisma.activityRecord.findMany({
        where: {
          organizationId,
          capturedAt: { gte: startOfDay, lte: endOfDay },
        },
        select: {
          employeeId: true,
          activeSeconds: true,
          idleSeconds: true,
          capturedAt: true,
        },
      }),
      this.prisma.attendanceRecord.findMany({
        where: {
          organizationId,
          date: { gte: startOfDay, lte: endOfDay },
        },
      }),
      this.prisma.leaveRequest.findMany({
        where: {
          organizationId,
          status: 'APPROVED',
          startDate: { lte: endOfDay },
          endDate: { gte: startOfDay },
        },
      }),
    ]);

    const records: any[] = [];
    const curr = new Date(endOfDay);
    const minDate = new Date(startOfDay);

    while (curr >= minDate) {
      const dayStart = new Date(curr);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(curr);
      dayEnd.setUTCHours(23, 59, 59, 999);
      const dateKey = dayStart.toISOString().split('T')[0];

      for (const emp of allEmployees) {
        const empSessions = sessions.filter(
          (s) => s.employeeId === emp.id && s.startedAt >= dayStart && s.startedAt <= dayEnd,
        );
        const empActivity = activityRecords.filter(
          (a) => a.employeeId === emp.id && a.capturedAt >= dayStart && a.capturedAt <= dayEnd,
        );

        let grossSessionSec = 0;
        let breakSec = 0;
        for (const s of empSessions) {
          if (s.endedAt) {
            grossSessionSec += s.durationSeconds;
          } else {
            grossSessionSec += Math.max(0, Math.floor((new Date().getTime() - s.startedAt.getTime()) / 1000));
          }
          if (s.breaks) {
            for (const b of s.breaks) {
              breakSec += b.durationSeconds || 0;
            }
          }
        }

        let idleSec = 0;
        for (const a of empActivity) {
          idleSec += a.idleSeconds || 0;
        }

        const workedSec = Math.max(0, grossSessionSec - breakSec - idleSec);
        const activeSec = workedSec;

        const attRecord = attendanceRecords.find(
          (a) => a.employeeId === emp.id && a.date >= dayStart && a.date <= dayEnd,
        );
        const empLeave = leaveRequests.find(
          (l) => l.employeeId === emp.id && l.startDate <= dayEnd && l.endDate >= dayStart,
        );

        let status = 'ABSENT';
        if (empLeave) {
          status = 'LEAVE';
        } else if (workedSec > 0 || empSessions.length > 0) {
          status = 'PRESENT';
        }

        const firstPunchIn = attRecord?.firstPunchIn || (empSessions.length > 0 ? empSessions[0].startedAt : null);
        let lastPunchOut = attRecord?.lastPunchOut || null;
        if (!lastPunchOut && empSessions.length > 0) {
          const hasActive = empSessions.some((s) => !s.endedAt);
          if (!hasActive) {
            lastPunchOut = empSessions[empSessions.length - 1].endedAt;
          }
        }

        records.push({
          id: `${emp.id}_${dateKey}`,
          date: dayStart.toISOString(),
          employeeId: emp.id,
          employee: {
            id: emp.id,
            displayName: emp.displayName,
            employeeCode: emp.employeeCode,
            department: emp.department ? { name: emp.department.name } : null,
          },
          status,
          firstPunchIn: firstPunchIn ? (firstPunchIn instanceof Date ? firstPunchIn.toISOString() : firstPunchIn) : null,
          lastPunchOut: lastPunchOut ? (lastPunchOut instanceof Date ? lastPunchOut.toISOString() : lastPunchOut) : null,
          totalWorkSeconds: workedSec,
          totalActiveSeconds: activeSec,
          totalIdleSeconds: idleSec,
          totalBreakSeconds: breakSec,
          formattedWork: this.formatSeconds(workedSec),
          formattedActive: this.formatSeconds(activeSec),
          formattedIdle: this.formatSeconds(idleSec),
          formattedBreak: this.formatSeconds(breakSec),
        });
      }

      // Decrement by 1 day
      curr.setUTCDate(curr.getUTCDate() - 1);
    }

    return records;
  }

  private formatSeconds(sec: number): string {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}
