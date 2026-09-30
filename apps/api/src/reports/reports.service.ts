import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { EmployeeSummaryQueryDto, TimelineQueryDto } from './dto/report-query.dto';
import { TimelineSegment } from '@pulsetime/types';
import { stringify } from 'csv-stringify/sync';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async getEmployeeSummary(organizationId: string, query: EmployeeSummaryQueryDto) {
    const todayStr = new Date().toISOString().split('T')[0];
    const startStr = query.startDate || todayStr;
    const endStr = query.endDate || todayStr;

    const startOfDay = new Date(`${startStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${endStr}T23:59:59.999Z`);

    const empWhere: any = { organizationId, status: 'ACTIVE' };
    if (query.departmentId) empWhere.departmentId = query.departmentId;
    if (query.employeeId) empWhere.id = query.employeeId;

    const [employees, sessions, activityRecords, screenshots] = await Promise.all([
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
      this.prisma.screenshot.findMany({
        where: {
          organizationId,
          capturedAt: { gte: startOfDay, lte: endOfDay },
          isDeleted: false,
        },
        select: { employeeId: true },
      }),
    ]);

    let orgTotalWorked = 0;
    let orgTotalActive = 0;
    let orgTotalIdle = 0;
    let orgEmployeesWorked = 0;

    const items = employees.map((emp) => {
      const empSessions = sessions.filter((s) => s.employeeId === emp.id);
      const empActivity = activityRecords.filter((a) => a.employeeId === emp.id);
      const empScreenshots = screenshots.filter((sc) => sc.employeeId === emp.id);

      let grossSessionSec = 0;
      let breakSec = 0;
      let manualSec = 0;
      let meetingSec = 0;

      for (const s of empSessions) {
        if (s.endedAt) {
          grossSessionSec += s.durationSeconds;
        } else {
          grossSessionSec += Math.floor((new Date().getTime() - s.startedAt.getTime()) / 1000);
        }

        if (s.startSource === 'MANUAL') {
          manualSec += s.durationSeconds;
        }

        if (s.breaks) {
          for (const b of s.breaks) {
            breakSec += b.durationSeconds;
          }
        }
      }

      let idleSec = 0;
      for (const a of empActivity) {
        idleSec += a.idleSeconds;
      }

      // Net worked seconds = Gross session duration minus break time and confirmed idle time
      const totalWorkedSec = Math.max(0, grossSessionSec - breakSec - idleSec);
      const activeSec = totalWorkedSec;

      const totalTrackedSec = activeSec + idleSec;
      const activePct = totalTrackedSec > 0 ? Math.round((activeSec / totalTrackedSec) * 100) : (totalWorkedSec > 0 ? 100 : 0);

      if (totalWorkedSec > 0) {
        orgEmployeesWorked++;
      }
      orgTotalWorked += totalWorkedSec;
      orgTotalActive += activeSec;
      orgTotalIdle += idleSec;

      const activeSession = empSessions.find((s) => s.status === 'ACTIVE' || s.status === 'PAUSED');
      let currentStatus: 'ACTIVE' | 'ON_BREAK' | 'IDLE' | 'OFFLINE' = 'OFFLINE';
      if (activeSession) {
        currentStatus = activeSession.status === 'PAUSED' ? 'ON_BREAK' : 'ACTIVE';
      }

      const useDecimal = query.format === 'decimal';

      return {
        employeeId: emp.id,
        displayName: emp.displayName,
        employeeCode: emp.employeeCode,
        departmentName: emp.department?.name || 'Unassigned',
        totalWorkedSeconds: totalWorkedSec,
        activeSeconds: activeSec,
        idleSeconds: idleSec,
        breakSeconds: breakSec,
        manualSeconds: manualSec,
        meetingSeconds: meetingSec,
        activePercentage: activePct,
        formattedWorked: useDecimal ? (totalWorkedSec / 3600).toFixed(2) : this.formatSeconds(totalWorkedSec),
        formattedActive: useDecimal ? (activeSec / 3600).toFixed(2) : this.formatSeconds(activeSec),
        formattedIdle: useDecimal ? (idleSec / 3600).toFixed(2) : this.formatSeconds(idleSec),
        formattedBreak: useDecimal ? (breakSec / 3600).toFixed(2) : this.formatSeconds(breakSec),
        formattedManual: useDecimal ? (manualSec / 3600).toFixed(2) : this.formatSeconds(manualSec),
        sessionsCount: empSessions.length,
        screenshotsCount: empScreenshots.length,
        status: currentStatus,
      };
    });

    const orgTotalSec = orgTotalActive + orgTotalIdle;
    const orgActivePct = orgTotalSec > 0 ? Math.round((orgTotalActive / orgTotalSec) * 100) : (orgTotalWorked > 0 ? 100 : 0);

    return {
      dateRange: { startDate: startStr, endDate: endStr },
      summary: {
        totalEmployees: employees.length,
        employeesWorked: orgEmployeesWorked,
        totalWorkedSeconds: orgTotalWorked,
        totalActiveSeconds: orgTotalActive,
        totalIdleSeconds: orgTotalIdle,
        formattedTotalWorked: query.format === 'decimal' ? (orgTotalWorked / 3600).toFixed(2) : this.formatSeconds(orgTotalWorked),
        formattedTotalActive: query.format === 'decimal' ? (orgTotalActive / 3600).toFixed(2) : this.formatSeconds(orgTotalActive),
        formattedTotalIdle: query.format === 'decimal' ? (orgTotalIdle / 3600).toFixed(2) : this.formatSeconds(orgTotalIdle),
        overallActivePercentage: orgActivePct,
      },
      items,
    };
  }

  async getTimeline(organizationId: string, query: TimelineQueryDto) {
    const targetDate = query.date ? new Date(query.date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const whereSession: any = {
      organizationId,
      startedAt: { gte: startOfDay, lte: endOfDay },
    };
    if (query.employeeId) whereSession.employeeId = query.employeeId;

    const [sessions, breaks, activity, employees] = await Promise.all([
      this.prisma.workSession.findMany({
        where: whereSession,
        include: {
          employee: { select: { id: true, displayName: true, employeeCode: true, email: true } },
          project: { select: { id: true, name: true, code: true } },
          task: { select: { id: true, title: true } },
          breaks: { orderBy: { startedAt: 'asc' } },
          screenshots: {
            where: { isDeleted: false },
            orderBy: { capturedAt: 'asc' },
          },
        },
        orderBy: { startedAt: 'desc' },
      }),
      this.prisma.workSessionBreak.findMany({
        where: {
          organizationId,
          startedAt: { gte: startOfDay, lte: endOfDay },
          ...(query.employeeId ? { employeeId: query.employeeId } : {}),
        },
        orderBy: { startedAt: 'asc' },
      }),
      this.prisma.activityRecord.findMany({
        where: {
          organizationId,
          capturedAt: { gte: startOfDay, lte: endOfDay },
          ...(query.employeeId ? { employeeId: query.employeeId } : {}),
        },
        orderBy: { capturedAt: 'asc' },
      }),
      this.prisma.employee.findMany({
        where: { organizationId, status: 'ACTIVE' },
        select: { id: true, displayName: true, employeeCode: true },
        orderBy: { displayName: 'asc' },
      }),
    ]);

    // Format sessions with file URLs for screenshots
    const enrichedSessions = await Promise.all(
      sessions.map(async (sess) => {
        const enrichedScreenshots = await Promise.all(
          sess.screenshots.map(async (sc) => {
            let fileUrl = '';
            try {
              fileUrl = await this.storageService.getFileUrl(sc.storageKey);
            } catch (err) {
              fileUrl = `/api/v1/storage/files?key=${encodeURIComponent(sc.storageKey)}`;
            }
            return {
              id: sc.id,
              capturedAt: sc.capturedAt,
              storageKey: sc.storageKey,
              mimeType: sc.mimeType,
              fileSize: sc.fileSize,
              width: sc.width,
              height: sc.height,
              activityPercentage: sc.activityPercentage,
              fileUrl,
            };
          }),
        );

        let dur = sess.durationSeconds;
        if (!sess.endedAt) {
          dur = Math.max(0, Math.floor((Date.now() - new Date(sess.startedAt).getTime()) / 1000));
        }

        let sessBreakSec = 0;
        for (const b of sess.breaks || []) {
          sessBreakSec += b.durationSeconds;
        }

        const netSessionSec = Math.max(0, dur - sessBreakSec);

        return {
          id: sess.id,
          employeeId: sess.employeeId,
          employee: sess.employee,
          project: sess.project,
          task: sess.task,
          startedAt: sess.startedAt,
          endedAt: sess.endedAt,
          durationSeconds: netSessionSec,
          formattedDuration: this.formatHoursMins(netSessionSec),
          grossDurationSeconds: dur,
          breakSeconds: sessBreakSec,
          status: sess.status,
          ipAddress: sess.ipAddress || '127.0.0.1',
          notes: sess.notes,
          startSource: sess.startSource,
          breaks: sess.breaks,
          screenshots: enrichedScreenshots,
        };
      }),
    );

    // Compute metrics
    let grossSessionSeconds = 0;
    let breakSeconds = 0;
    let manualSeconds = 0;
    let meetingSeconds = 0;
    const uniqueEmployeesWorked = new Set<string>();

    for (const s of enrichedSessions) {
      grossSessionSeconds += s.grossDurationSeconds || s.durationSeconds;
      if (s.employeeId) uniqueEmployeesWorked.add(s.employeeId);
      if (s.startSource === 'MANUAL') {
        manualSeconds += s.durationSeconds;
      }
      for (const b of s.breaks || []) {
        breakSeconds += b.durationSeconds;
      }
    }

    let idleSeconds = 0;
    let activeHeartbeatSeconds = 0;
    for (const a of activity) {
      idleSeconds += a.idleSeconds;
      activeHeartbeatSeconds += a.activeSeconds;
    }

    for (const b of breaks) {
      const alreadyCounted = enrichedSessions.some((s) => s.breaks?.some((sb: any) => sb.id === b.id));
      if (!alreadyCounted) {
        breakSeconds += b.durationSeconds || 0;
      }
    }

    // Net working time strictly excluding break time and idle time
    const totalWorkedSeconds = Math.max(0, grossSessionSeconds - breakSeconds - idleSeconds);
    const timerActiveSeconds = totalWorkedSeconds;
    const timerActiveTimeSeconds = grossSessionSeconds;

    // Build timeline blocks
    const segments: TimelineSegment[] = [];

    // Map activity heartbeats into active & idle chunks
    for (const act of activity) {
      const actStart = new Date(act.capturedAt);
      const actEnd = new Date(actStart.getTime() + (act.activeSeconds + act.idleSeconds) * 1000);

      if (act.activeSeconds > 0) {
        segments.push({
          type: 'active',
          startTime: actStart.toISOString(),
          endTime: new Date(actStart.getTime() + act.activeSeconds * 1000).toISOString(),
          durationSeconds: act.activeSeconds,
          metadata: {
            application: act.activeApplication || undefined,
            notes: act.windowTitle || undefined,
          },
        });
      }

      if (act.idleSeconds > 0) {
        segments.push({
          type: 'idle',
          startTime: new Date(actStart.getTime() + act.activeSeconds * 1000).toISOString(),
          endTime: actEnd.toISOString(),
          durationSeconds: act.idleSeconds,
          metadata: {
            notes: 'User idle / away from keyboard',
          },
        });
      }
    }

    // Add breaks
    for (const b of breaks) {
      const bEnd = b.endedAt || new Date();
      segments.push({
        type: 'break',
        startTime: b.startedAt.toISOString(),
        endTime: bEnd.toISOString(),
        durationSeconds: b.durationSeconds || Math.floor((bEnd.getTime() - b.startedAt.getTime()) / 1000),
        metadata: {
          breakReason: b.reason || 'Break',
        },
      });
    }

    // Sort all segments chronologically
    segments.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return {
      date: startOfDay.toISOString().split('T')[0],
      employeeId: query.employeeId || null,
      summary: {
        totalWorkedSeconds,
        timerActiveSeconds,
        breakSeconds,
        idleSeconds,
        timerActiveTimeSeconds,
        manualSeconds,
        meetingSeconds,
        employeesWorkedCount: uniqueEmployeesWorked.size || (totalWorkedSeconds > 0 ? 1 : 0),
        formattedWorked: this.formatHoursMins(totalWorkedSeconds),
        formattedTimerActive: this.formatHoursMins(timerActiveSeconds),
        formattedBreak: this.formatHoursMins(breakSeconds),
        formattedIdle: this.formatHoursMins(idleSeconds),
        formattedTimerActiveTime: this.formatHoursMins(timerActiveTimeSeconds),
        formattedManual: this.formatHoursMins(manualSeconds),
        formattedMeeting: this.formatHoursMins(meetingSeconds),
      },
      sessionsCount: enrichedSessions.length,
      breaksCount: breaks.length,
      segments,
      sessions: enrichedSessions,
      employees,
    };
  }

  async exportEmployeeSummaryCsv(organizationId: string, query: EmployeeSummaryQueryDto): Promise<string> {
    const summary = await this.getEmployeeSummary(organizationId, query);

    const rows = summary.items.map((item) => ({
      'Employee Code': item.employeeCode,
      'Name': item.displayName,
      'Department': item.departmentName,
      'Time Worked': item.formattedWorked,
      'Active Time': item.formattedActive,
      'Idle Time': item.formattedIdle,
      'Break Time': item.formattedBreak,
      'Manual Time': item.formattedManual,
      'Active %': `${item.activePercentage}%`,
      'Screenshots Count': item.screenshotsCount,
      'Status': item.status,
    }));

    return stringify(rows, { header: true });
  }

  private formatHoursMins(sec: number): string {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    if (hours === 0 && minutes === 0) return '0h';
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }

  private formatSeconds(sec: number): string {
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}
