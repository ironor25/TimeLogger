const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Purging pre-seeded mock sessions, screenshots, activity records, and attendance...');

  const ar = await prisma.activityRecord.deleteMany({});
  console.log(`Deleted ${ar.count} activity records.`);

  const sc = await prisma.screenshot.deleteMany({});
  console.log(`Deleted ${sc.count} screenshots.`);

  const br = await prisma.workSessionBreak.deleteMany({});
  console.log(`Deleted ${br.count} work session breaks.`);

  const ws = await prisma.workSession.deleteMany({});
  console.log(`Deleted ${ws.count} work sessions.`);

  const att = await prisma.attendanceRecord.deleteMany({});
  console.log(`Deleted ${att.count} attendance records.`);

  const te = await prisma.manualTimeEntry.deleteMany({});
  console.log(`Deleted ${te.count} manual time entries.`);

  const lr = await prisma.leaveRequest.deleteMany({});
  console.log(`Deleted ${lr.count} leave requests.`);

  console.log('✨ All mock telemetry, sessions, and attendance data purged successfully!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
