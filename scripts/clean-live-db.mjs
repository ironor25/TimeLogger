#!/usr/bin/env node

/**
 * PulseTime Live Database Reset Tool
 *
 * Authenticates as owner@demo.local and resets all runtime activity data
 * (work sessions, breaks, heartbeats, screenshots, and attendance records)
 * while preserving all master employee accounts, logins, passwords, projects, and tasks.
 */

const SERVER_URL = process.env.API_URL || 'https://timelogger-dy6t.onrender.com/api/v1';
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'owner@demo.local';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'Password123!';

async function run() {
  console.log('====================================================');
  console.log('⚡ PulseTime: Live Database Clean-Slate Reset');
  console.log(`🌐 Server URL: ${SERVER_URL}`);
  console.log(`🔑 Owner:     ${OWNER_EMAIL}`);
  console.log('====================================================\n');

  try {
    // 1. Authenticate as Owner
    console.log('1. Authenticating as Owner...');
    const loginRes = await fetch(`${SERVER_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: OWNER_EMAIL,
        password: OWNER_PASSWORD,
      }),
    });

    const loginData = await loginRes.json();
    if (!loginRes.ok || !loginData.success) {
      throw new Error(`Login failed: ${loginData.error?.message || loginRes.statusText}`);
    }

    const token = loginData.data?.tokens?.accessToken;
    const orgName = loginData.data?.organization?.name || 'Organization';
    console.log(`✅ Logged in successfully! (Organization: ${orgName})\n`);

    // 2. Request Clean-Slate Reset
    console.log('2. Resetting runtime data on live database...');
    const resetRes = await fetch(`${SERVER_URL}/organizations/reset-activity-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const resetData = await resetRes.json();
    if (!resetRes.ok || !resetData.success) {
      throw new Error(`Reset failed: ${resetData.error?.message || resetRes.statusText}`);
    }

    console.log('✅ DATABASE RESET COMPLETED SUCCESSFULLY!');
    console.log('📊 Cleanup Summary:');
    console.log(`   - Deleted Work Sessions:       ${resetData.data?.details?.deletedSessions ?? 0}`);
    console.log(`   - Deleted Screenshots:         ${resetData.data?.details?.deletedScreenshots ?? 0}`);
    console.log(`   - Deleted Breaks:              ${resetData.data?.details?.deletedBreaks ?? 0}`);
    console.log(`   - Deleted Activity Records:    ${resetData.data?.details?.deletedActivityRecords ?? 0}`);
    console.log(`   - Deleted Attendance Records:  ${resetData.data?.details?.deletedAttendanceRecords ?? 0}`);
    console.log('\n🔒 Preserved:');
    console.log('   - All Employee accounts & passwords (owner@demo.local, employee@demo.local, robert.chen@acme.local, etc.)');
    console.log('   - Organization structure, departments, roles, projects & tasks');
    console.log('\n✨ The live database is now in a 100% clean testing state!\n');
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
  }
}

run();
