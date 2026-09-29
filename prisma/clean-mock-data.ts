import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning pre-seeded mock activity, session, screenshot, and attendance data...');

  const deletedHeartbeats = await prisma.activityHeartbeat.deleteMany({});
  console.log(`Deleted ${deletedHeartbeats.count} activity heartbeats.`);

  const deletedScreenshots = await prisma.screenshot.deleteMany({});
  console.log(`Deleted ${deletedScreenshots.count} screenshots.`);

  const deletedBreaks = await prisma.workSessionBreak.deleteMany({});
  console.log(`Deleted ${deletedBreaks.count} work session breaks.`);

  const deletedSessions = await prisma.workSession.deleteMany({});
  console.log(`Deleted ${deletedSessions.count} work sessions.`);

  const deletedAttendance = await prisma.attendanceRecord.deleteMany({});
  console.log(`Deleted ${deletedAttendance.count} attendance records.`);

  const deletedTimeEntries = await prisma.timeEntry.deleteMany({});
  console.log(`Deleted ${deletedTimeEntries.count} manual time entries.`);

  const deletedLeaveRequests = await prisma.leaveRequest.deleteMany({});
  console.log(`Deleted ${deletedLeaveRequests.count} leave requests.`);

  console.log('✨ All mock telemetry, sessions, and attendance data purged successfully!');
  console.log('✅ Real data from desktop app will now populate cleanly from scratch.');
}

main()
  .catch((e) => {
    console.error('Error cleaning mock data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
