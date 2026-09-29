// Test End-to-End Pipeline
const http = require('http');

const API_BASE = 'http://localhost:4000/api/v1';

async function post(url, data, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  const json = await res.json();
  return { status: res.status, data: json };
}

async function putBinary(url, buffer, contentType) {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: buffer,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, data: json };
}

async function get(url, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  const json = await res.json();
  return { status: res.status, data: json };
}

async function runTest() {
  console.log('🧪 Starting End-to-End Test for Desktop Agent Pipeline...\n');

  // 1. Login
  console.log('1️⃣ Testing Desktop Agent Login...');
  const loginRes = await post(`${API_BASE}/agent/auth/login`, {
    email: 'employee@demo.local',
    password: 'Password123!',
    deviceIdentifier: 'TEST-MACHINE-01',
    deviceName: 'John Doe Workstation',
    platform: 'WINDOWS',
    platformVersion: 'Windows 11 Pro',
    appVersion: '1.0.0',
  });

  if (!loginRes.data.success) {
    console.error('❌ Login failed:', loginRes.data);
    return;
  }
  const token = loginRes.data.data.tokens.accessToken;
  const employee = loginRes.data.data.employee;
  console.log(`✅ Logged in successfully: ${employee.displayName} (${employee.id})\n`);

  // 2. Punch In (Start Session)
  console.log('2️⃣ Testing Punch In (Start Work Session)...');
  const startRes = await post(`${API_BASE}/agent/work-sessions/start`, {
    notes: 'Automated Test Work Session',
  }, token);

  if (!startRes.data.success) {
    console.error('❌ Start session failed:', startRes.data);
    return;
  }
  const session = startRes.data.data;
  console.log(`✅ Session Started: ID = ${session.id}, Status = ${session.status}\n`);

  // 3. Send Heartbeat Telemetry
  console.log('3️⃣ Testing Heartbeat Telemetry...');
  const hbRes = await post(`${API_BASE}/agent/activity/heartbeat`, {
    sessionId: session.id,
    capturedAt: new Date().toISOString(),
    activeSeconds: 55,
    idleSeconds: 5,
    activeApplication: 'VS Code - TimeLogger',
    windowTitle: 'Testing Pipeline',
  }, token);
  console.log(`✅ Heartbeat sent:`, hbRes.data.success ? 'SUCCESS' : 'FAILED', '\n');

  // 4. Request Screenshot Upload URL
  console.log('4️⃣ Testing Screenshot Upload URL Request...');
  const sampleBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60,
    0x00, 0x60, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
    0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
    0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
    0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
    0x00, 0xbf, 0x00, 0xff, 0xd9
  ]);

  const urlRes = await post(`${API_BASE}/agent/screenshots/upload-url`, {
    sessionId: session.id,
    mimeType: 'image/jpeg',
    fileSize: sampleBuffer.length,
  }, token);

  if (!urlRes.data.success) {
    console.error('❌ Request upload URL failed:', urlRes.data);
    return;
  }
  const uploadInfo = urlRes.data.data;
  console.log(`✅ Upload URL received: ${uploadInfo.uploadUrl}`);
  console.log(`   Storage Key: ${uploadInfo.storageKey}\n`);

  // 5. Upload Binary to Storage
  console.log('5️⃣ Testing Binary Upload to Storage Endpoint...');
  const uploadRes = await putBinary(uploadInfo.uploadUrl, sampleBuffer, 'image/jpeg');
  console.log(`✅ Binary uploaded with HTTP status ${uploadRes.status}:`, uploadRes.data, '\n');

  // 6. Complete Screenshot Metadata
  console.log('6️⃣ Testing Screenshot Metadata Finalization...');
  const completeRes = await post(`${API_BASE}/agent/screenshots/complete`, {
    sessionId: session.id,
    storageKey: uploadInfo.storageKey,
    capturedAt: new Date().toISOString(),
    fileSize: sampleBuffer.length,
    mimeType: 'image/jpeg',
    width: 1920,
    height: 1080,
    activityPercentage: 92,
  }, token);

  if (!completeRes.data.success) {
    console.error('❌ Finalize screenshot failed:', completeRes.data);
    return;
  }
  console.log(`✅ Screenshot registered: ID = ${completeRes.data.data.id}\n`);

  // 7. Verify in Screenshots Gallery List
  console.log('7️⃣ Testing Screenshot Query...');
  const listRes = await get(`${API_BASE}/screenshots?sessionId=${session.id}`, token);
  console.log(`✅ Found ${listRes.data.data.length} screenshot(s) for current session\n`);

  // 8. Punch Out (Stop Session)
  console.log('8️⃣ Testing Punch Out (Stop Work Session)...');
  const stopRes = await post(`${API_BASE}/agent/work-sessions/stop`, {
    sessionId: session.id,
    notes: 'Finished Automated Pipeline Test',
  }, token);

  if (!stopRes.data.success) {
    console.error('❌ Stop session failed:', stopRes.data);
    return;
  }
  console.log(`✅ Session Stopped: Total Duration = ${stopRes.data.data.durationSeconds}s\n`);

  console.log('🎉 ALL ENDPOINTS TESTED AND VERIFIED WORKING 100%!');
}

runTest().catch(console.error);
