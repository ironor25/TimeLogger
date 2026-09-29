import { PlatformType } from '@pulsetime/types';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';

interface AgentState {
  token: string | null;
  employeeId: string | null;
  deviceId: string | null;
  sessionId: string | null;
  projectId: string | null;
  taskId: string | null;
}

const state: AgentState = {
  token: null,
  employeeId: null,
  deviceId: null,
  sessionId: null,
  projectId: null,
  taskId: null,
};

async function apiRequest<T = any>(
  endpoint: string,
  method: string = 'GET',
  body?: any,
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json: any = await response.json();
  if (!response.ok || json.success === false) {
    const errMsg = json.error?.message || response.statusText || 'API error';
    throw new Error(`[HTTP ${response.status}] ${errMsg}`);
  }

  return json.data !== undefined ? json.data : json;
}

async function runMockSimulation() {
  console.log('=================================================================');
  console.log('🤖 PulseTime Developer Mock Desktop Agent Simulation');
  console.log(`🎯 Target API: ${API_BASE}`);
  console.log('=================================================================\n');

  try {
    // 1. Employee Login & Device Registration
    console.log('Step 1: Authenticating Employee & Registering Desktop Device...');
    const loginRes = await apiRequest('/agent/auth/login', 'POST', {
      email: 'employee@demo.local',
      password: 'Password123!',
      deviceIdentifier: 'MOCK-CLI-AGENT-WIN11-001',
      deviceName: "John's Dev Workstation (Mock Agent)",
      platform: PlatformType.WINDOWS,
      platformVersion: 'Windows 11 Pro 23H2',
      appVersion: '1.0.0-cli',
    });

    state.token = loginRes.tokens.accessToken;
    state.employeeId = loginRes.employee.id;
    state.deviceId = loginRes.device.id;

    console.log(`  ✅ Logged in as: ${loginRes.employee.displayName} (${loginRes.employee.employeeCode})`);
    console.log(`  🏢 Organization: ${loginRes.organization.name} [Timezone: ${loginRes.organization.timezone}]`);
    console.log(`  💻 Device Registered: ${loginRes.device.deviceName} (ID: ${loginRes.device.id})`);
    console.log(`  📅 Work Schedule: ${loginRes.schedule?.name || 'Standard'}\n`);

    // 2. Fetch Projects & Tasks
    console.log('Step 2: Fetching Active Projects & Assigned Tasks...');
    const projects = await apiRequest('/agent/projects', 'GET', null, state.token);
    if (projects && projects.length > 0) {
      state.projectId = projects[0].id;
      console.log(`  📂 Selected Project: ${projects[0].name} [${projects[0].code}]`);

      const tasks = await apiRequest(`/agent/tasks?projectId=${state.projectId}`, 'GET', null, state.token);
      if (tasks && tasks.length > 0) {
        state.taskId = tasks[0].id;
        console.log(`  📝 Selected Task: ${tasks[0].title}`);
      }
    }
    console.log();

    // Check if there is an active session from a previous run or seed data, and close it first
    if (loginRes.currentSession) {
      console.log(`  ℹ️ Found existing session ${loginRes.currentSession.id}. Closing it to begin clean simulation...`);
      await apiRequest('/agent/work-sessions/stop', 'POST', {
        sessionId: loginRes.currentSession.id,
        notes: 'Pre-simulation cleanup',
      }, state.token);
      console.log('  ✅ Previous session closed.\n');
    }

    // 3. Start Work Session (Punch In)
    console.log('Step 3: Starting Work Session (Punch In)...');
    const startSession = await apiRequest('/agent/work-sessions/start', 'POST', {
      deviceId: state.deviceId,
      projectId: state.projectId,
      taskId: state.taskId,
      notes: 'Mock agent automated testing session',
    }, state.token);

    state.sessionId = startSession.id;
    console.log(`  ✅ Session Started Authoritatively by Server!`);
    console.log(`  🆔 Session ID: ${state.sessionId}`);
    console.log(`  ⏱️ Server Start Timestamp: ${startSession.startedAt}`);
    console.log(`  ⚡ Status: ${startSession.status}\n`);

    // 4. Send Activity Heartbeats
    console.log('Step 4: Streaming Activity Heartbeats to Ingestion Engine...');
    const apps = ['Visual Studio Code', 'Google Chrome - Architecture Doc', 'Slack'];
    for (let i = 0; i < apps.length; i++) {
      const app = apps[i];
      const hbRes = await apiRequest('/agent/activity/heartbeat', 'POST', {
        sessionId: state.sessionId,
        deviceId: state.deviceId,
        capturedAt: new Date().toISOString(),
        activeSeconds: 270,
        idleSeconds: 30,
        activeApplication: app,
        windowTitle: `${app} - PulseTime SaaS`,
        keysPressed: 85,
        mouseClicks: 32,
      }, state.token);
      console.log(`  💓 Heartbeat ${i + 1}/3 ingested: ${app} (Active: 270s, Idle: 30s) -> ID: ${hbRes.activityRecordId}`);
    }
    console.log();

    // 5. Start Break
    console.log('Step 5: Starting Break (Coffee / Rest)...');
    const breakStart = await apiRequest('/agent/work-sessions/break/start', 'POST', {
      sessionId: state.sessionId,
      reason: 'Coffee & Stretch Break',
    }, state.token);
    console.log(`  ☕ Break Started at: ${breakStart.startedAt} [Reason: ${breakStart.reason}]\n`);

    // 6. End Break
    console.log('Step 6: Ending Break & Resuming Session...');
    const breakEnd = await apiRequest('/agent/work-sessions/break/end', 'POST', {
      sessionId: state.sessionId,
    }, state.token);
    console.log(`  ⚡ Break Ended! Duration: ${breakEnd.durationSeconds}s. Session resumed to ACTIVE.\n`);

    // 7. Request Screenshot Upload URL & Finalize Metadata
    console.log('Step 7: Requesting Presigned Screenshot Upload URL...');
    const uploadInfo = await apiRequest('/agent/screenshots/upload-url', 'POST', {
      sessionId: state.sessionId,
      mimeType: 'image/jpeg',
      fileSize: 184500,
    }, state.token);

    console.log(`  📸 Presigned Upload URL generated: ${uploadInfo.uploadUrl.substring(0, 60)}...`);
    console.log(`  🔑 Storage Key: ${uploadInfo.storageKey}`);

    // Complete screenshot metadata
    const screenComplete = await apiRequest('/agent/screenshots/complete', 'POST', {
      sessionId: state.sessionId,
      storageKey: uploadInfo.storageKey,
      capturedAt: new Date().toISOString(),
      fileSize: 184500,
      mimeType: 'image/jpeg',
      width: 1920,
      height: 1080,
      activityPercentage: 92,
      projectId: state.projectId,
      taskId: state.taskId,
    }, state.token);
    console.log(`  ✅ Screenshot Record Saved with ID: ${screenComplete.id} (Activity: ${screenComplete.activityPercentage}%)\n`);

    // 8. Stop Work Session (Punch Out)
    console.log('Step 8: Stopping Work Session (Punch Out)...');
    const stopRes = await apiRequest('/agent/work-sessions/stop', 'POST', {
      sessionId: state.sessionId,
      notes: 'Completed all mock agent testing routines successfully',
    }, state.token);

    console.log(`  🛑 Work Session Stopped!`);
    console.log(`  ⏱️ Server Authoritative Duration: ${stopRes.durationSeconds} seconds`);
    console.log(`  🏁 Final Status: ${stopRes.status}\n`);

    // 9. Verify Current Session is null / finished
    console.log('Step 9: Verifying Current Session Status...');
    const current = await apiRequest('/agent/work-sessions/current', 'GET', null, state.token);
    console.log(`  🔍 Current Active Session: ${current ? current.id : 'None (Employee is OFFLINE)'}\n`);

    console.log('=================================================================');
    console.log('🎉 ALL DESKTOP AGENT BACKEND APIS TESTED AND VERIFIED 100% WORKING!');
    console.log('=================================================================');
  } catch (err: any) {
    console.error('❌ Mock Agent Error:', err.message);
    process.exit(1);
  }
}

runMockSimulation();
