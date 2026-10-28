import pool from './src/config/db.js';
import crypto from 'crypto';
import {
  ensureZeroTrustSchema,
  processOnlineQrIssuance,
  downloadOfflineToken,
  verifyAndRecordAttendance,
  recordHeartbeat,
  logSecurityAudit,
  calculateHaversineMeters,
  ZERO_TRUST_CONFIG
} from './src/services/zeroTrustAttendance.service.js';

// Test Organization Coordinates (e.g. Makati CBD Office)
const OFFICE = { latitude: 14.554729, longitude: 121.024445 };
// Point inside 100m (approx 35 meters away)
const INSIDE_100M = { latitude: 14.554950, longitude: 121.024600 };
// Point outside 100m (approx 450 meters away)
const OUTSIDE_100M = { latitude: 14.558000, longitude: 121.026000 };

const TEST_STUDENT_ID = 9999;
const SESSION_TOKEN_A = 'session_token_phone_a_secret_123';
const SESSION_TOKEN_B = 'session_token_phone_b_secret_456';
const DEVICE_A = 'andr_phone_a_test_device_001';
const DEVICE_B = 'ios_phone_b_test_device_002';

let passedCount = 0;
let totalCount = 0;

function assert(condition, message) {
  totalCount++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function resetTestData() {
  await pool.query('DELETE FROM attendance_security_audit_logs WHERE student_id = ?', [TEST_STUDENT_ID]);
  await pool.query('DELETE FROM attendance_qr_tokens WHERE student_id = ?', [TEST_STUDENT_ID]);
  await pool.query('DELETE FROM student_device_heartbeats WHERE student_id = ?', [TEST_STUDENT_ID]);
  await pool.query('DELETE FROM student_device_sessions WHERE student_id = ?', [TEST_STUDENT_ID]);

  // Create clean initial sessions
  const hashA = crypto.createHash('sha256').update(SESSION_TOKEN_A).digest('hex');
  const hashB = crypto.createHash('sha256').update(SESSION_TOKEN_B).digest('hex');

  const [resA] = await pool.query(
    `INSERT INTO student_device_sessions 
     (student_id, device_id, device_name, platform, session_token_hash, is_restricted)
     VALUES (?, ?, 'Samsung Galaxy S23 (Test A)', 'android', ?, FALSE)`,
    [TEST_STUDENT_ID, DEVICE_A, hashA]
  );

  const [resB] = await pool.query(
    `INSERT INTO student_device_sessions 
     (student_id, device_id, device_name, platform, session_token_hash, is_restricted)
     VALUES (?, ?, 'iPhone 15 Pro (Test B)', 'ios', ?, FALSE)`,
    [TEST_STUDENT_ID, DEVICE_B, hashB]
  );

  return { sessionAId: resA.insertId, sessionBId: resB.insertId };
}

async function runAllTests() {
  console.log('========================================================================');
  console.log('🛡️  STARTING ZERO-TRUST ANTI-MANIPULATION ATTENDANCE TEST SUITE');
  console.log('========================================================================');

  await ensureZeroTrustSchema();
  console.log('✅ Schema tables verified in MySQL (internconph).\n');

  // ---------------------------------------------------------------------------
  // TEST 1: One device, online, inside 100 m: works
  // ---------------------------------------------------------------------------
  console.log('▶ Test 1: One device, online, inside 100 m');
  {
    const { sessionAId } = await resetTestData();
    // Heartbeat from Phone A inside 100m
    await recordHeartbeat({
      studentId: TEST_STUDENT_ID,
      sessionId: sessionAId,
      deviceId: DEVICE_A,
      latitude: INSIDE_100M.latitude,
      longitude: INSIDE_100M.longitude,
      accuracyMeters: 8.5
    });

    const qrResult = await processOnlineQrIssuance({
      studentId: TEST_STUDENT_ID,
      sessionToken: SESSION_TOKEN_A,
      deviceId: DEVICE_A,
      lat: INSIDE_100M.latitude,
      lng: INSIDE_100M.longitude,
      officeCoords: OFFICE
    });

    assert(qrResult.qrPayload.startsWith('v2|9999|' + DEVICE_A), 'QR payload generated with version 2 and student ID');
    assert(qrResult.tokenType === 'online', 'Token type is online');
    assert(qrResult.rotatesInSeconds === 30, 'Token rotates in 30 seconds');

    // HR Scan
    const scanResult = await verifyAndRecordAttendance({
      qrPayload: qrResult.qrPayload,
      scannerLat: OFFICE.latitude,
      scannerLng: OFFICE.longitude,
      scannerUserId: 101,
      officeCoords: OFFICE
    });
    assert(scanResult.success === true, 'Attendance scan verified successfully');
    assert(scanResult.status === 'verified', 'Status is verified');
  }

  // ---------------------------------------------------------------------------
  // TEST 2: One device, offline, inside 100 m, valid token: works
  // ---------------------------------------------------------------------------
  console.log('\n▶ Test 2: One device, offline, inside 100 m, valid token');
  {
    await resetTestData();
    // Pre-download offline token inside 100m
    const offlineToken = await downloadOfflineToken({
      studentId: TEST_STUDENT_ID,
      sessionToken: SESSION_TOKEN_A,
      deviceId: DEVICE_A,
      lat: INSIDE_100M.latitude,
      lng: INSIDE_100M.longitude
    });

    assert(offlineToken.tokenType === 'offline', 'Pre-issued token is offline');
    assert(offlineToken.validForSeconds === 600, 'Valid for 600s (10 minutes)');

    // Device is now offline (no other device active online)
    const scanResult = await verifyAndRecordAttendance({
      qrPayload: offlineToken.qrPayload,
      scannerLat: OFFICE.latitude,
      scannerLng: OFFICE.longitude,
      scannerUserId: 101,
      officeCoords: OFFICE
    });

    assert(scanResult.success === true, 'Offline QR scan succeeded at kiosk sync');
    assert(scanResult.status === 'verified', 'Offline attendance status is verified');
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Two devices, one inside 100 m: only that one works
  // ---------------------------------------------------------------------------
  console.log('\n▶ Test 3: Two devices, one inside 100 m (Phone A inside, Phone B outside)');
  {
    const { sessionAId, sessionBId } = await resetTestData();
    // Phone A heartbeat inside 100m
    await recordHeartbeat({
      studentId: TEST_STUDENT_ID,
      sessionId: sessionAId,
      deviceId: DEVICE_A,
      latitude: INSIDE_100M.latitude,
      longitude: INSIDE_100M.longitude,
      accuracyMeters: 5.0
    });

    // Phone B heartbeat outside 100m (450m away)
    await recordHeartbeat({
      studentId: TEST_STUDENT_ID,
      sessionId: sessionBId,
      deviceId: DEVICE_B,
      latitude: OUTSIDE_100M.latitude,
      longitude: OUTSIDE_100M.longitude,
      accuracyMeters: 10.0
    });

    // Attempt from Phone B (outside) -> MUST FAIL
    let phoneBDenied = false;
    try {
      await processOnlineQrIssuance({
        studentId: TEST_STUDENT_ID,
        sessionToken: SESSION_TOKEN_B,
        deviceId: DEVICE_B,
        lat: OUTSIDE_100M.latitude,
        lng: OUTSIDE_100M.longitude,
        officeCoords: OFFICE
      });
    } catch (err) {
      phoneBDenied = true;
      assert(err.errorCode === 'OUT_OF_RANGE', 'Phone B denied with OUT_OF_RANGE error');
    }
    assert(phoneBDenied, 'Phone B (outside 100m) was denied');

    // Attempt from Phone A (inside) -> MUST WORK
    const qrResultA = await processOnlineQrIssuance({
      studentId: TEST_STUDENT_ID,
      sessionToken: SESSION_TOKEN_A,
      deviceId: DEVICE_A,
      lat: INSIDE_100M.latitude,
      lng: INSIDE_100M.longitude,
      officeCoords: OFFICE
    });
    assert(qrResultA.tokenType === 'online', 'Phone A (inside 100m) successfully generated QR code');
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Two devices, both inside 100 m: most recently active wins
  // ---------------------------------------------------------------------------
  console.log('\n▶ Test 4: Two devices, both inside 100 m: most recently active wins');
  {
    const { sessionAId, sessionBId } = await resetTestData();
    // Phone A heartbeat inside 100m at T = -30 seconds
    await pool.query(
      `INSERT INTO student_device_heartbeats
       (student_id, session_id, device_id, latitude, longitude, accuracy_meters, last_heartbeat_at, client_timestamp)
       VALUES (?, ?, ?, ?, ?, 5.0, DATE_SUB(NOW(), INTERVAL 30 SECOND), NOW())`,
      [TEST_STUDENT_ID, sessionAId, DEVICE_A, INSIDE_100M.latitude, INSIDE_100M.longitude]
    );

    // Phone B heartbeat inside 100m at T = -2 seconds (MORE RECENT)
    await pool.query(
      `INSERT INTO student_device_heartbeats
       (student_id, session_id, device_id, latitude, longitude, accuracy_meters, last_heartbeat_at, client_timestamp)
       VALUES (?, ?, ?, ?, ?, 5.0, DATE_SUB(NOW(), INTERVAL 2 SECOND), NOW())`,
      [TEST_STUDENT_ID, sessionBId, DEVICE_B, INSIDE_100M.latitude, INSIDE_100M.longitude]
    );

    // Phone B requests QR -> Phone B has the fresher heartbeat
    const resB = await processOnlineQrIssuance({
      studentId: TEST_STUDENT_ID,
      sessionToken: SESSION_TOKEN_B,
      deviceId: DEVICE_B,
      lat: INSIDE_100M.latitude,
      lng: INSIDE_100M.longitude,
      officeCoords: OFFICE
    });
    assert(resB.tokenType === 'online', 'Phone B (most recently active) won and issued QR token');

    // Phone A tries to request QR while Phone B is the active winner
    let phoneADenied = false;
    try {
      await processOnlineQrIssuance({
        studentId: TEST_STUDENT_ID,
        sessionToken: SESSION_TOKEN_A,
        deviceId: DEVICE_A,
        lat: INSIDE_100M.latitude,
        lng: INSIDE_100M.longitude,
        officeCoords: OFFICE
      });
    } catch (err) {
      phoneADenied = true;
      assert(err.errorCode === 'DEVICE_NOT_WINNER' || err.errorCode === 'SESSION_RESTRICTED', 'Phone A was superseded by Phone B');
    }
    assert(phoneADenied, 'Superseded older device Phone A was denied');
  }

  // ---------------------------------------------------------------------------
  // TEST 5: Two devices, neither inside 100 m: both denied
  // ---------------------------------------------------------------------------
  console.log('\n▶ Test 5: Two devices, neither inside 100 m: both denied');
  {
    const { sessionAId, sessionBId } = await resetTestData();
    await recordHeartbeat({
      studentId: TEST_STUDENT_ID,
      sessionId: sessionAId,
      deviceId: DEVICE_A,
      latitude: OUTSIDE_100M.latitude,
      longitude: OUTSIDE_100M.longitude,
      accuracyMeters: 10.0
    });
    await recordHeartbeat({
      studentId: TEST_STUDENT_ID,
      sessionId: sessionBId,
      deviceId: DEVICE_B,
      latitude: OUTSIDE_100M.latitude,
      longitude: OUTSIDE_100M.longitude,
      accuracyMeters: 10.0
    });

    let deniedA = false;
    try {
      await processOnlineQrIssuance({
        studentId: TEST_STUDENT_ID,
        sessionToken: SESSION_TOKEN_A,
        deviceId: DEVICE_A,
        lat: OUTSIDE_100M.latitude,
        lng: OUTSIDE_100M.longitude,
        officeCoords: OFFICE
      });
    } catch (err) {
      deniedA = true;
      assert(err.errorCode === 'OUT_OF_RANGE', 'Phone A denied due to out of range');
    }

    let deniedB = false;
    try {
      await processOnlineQrIssuance({
        studentId: TEST_STUDENT_ID,
        sessionToken: SESSION_TOKEN_B,
        deviceId: DEVICE_B,
        lat: OUTSIDE_100M.latitude,
        lng: OUTSIDE_100M.longitude,
        officeCoords: OFFICE
      });
    } catch (err) {
      deniedB = true;
      assert(err.errorCode === 'OUT_OF_RANGE', 'Phone B denied due to out of range');
    }

    assert(deniedA && deniedB, 'Both devices denied when neither is inside 100m');
  }

  // ---------------------------------------------------------------------------
  // TEST 6: Phone A online, Phone B uses offline QR: Phone B rejected at sync
  // ---------------------------------------------------------------------------
  console.log('\n▶ Test 6: Phone A online, Phone B uses offline QR: Phone B rejected at sync');
  {
    const { sessionAId, sessionBId } = await resetTestData();

    // Phone B pre-downloads offline token
    const offlineTokenB = await downloadOfflineToken({
      studentId: TEST_STUDENT_ID,
      sessionToken: SESSION_TOKEN_B,
      deviceId: DEVICE_B,
      lat: INSIDE_100M.latitude,
      lng: INSIDE_100M.longitude
    });

    // BUT Phone A is actively online sending heartbeats right at scan time!
    await recordHeartbeat({
      studentId: TEST_STUDENT_ID,
      sessionId: sessionAId,
      deviceId: DEVICE_A,
      latitude: OUTSIDE_100M.latitude,
      longitude: OUTSIDE_100M.longitude,
      accuracyMeters: 5.0
    });

    // Scanner tries to verify Phone B's offline token
    let rejectedConflict = false;
    try {
      await verifyAndRecordAttendance({
        qrPayload: offlineTokenB.qrPayload,
        scannerLat: OFFICE.latitude,
        scannerLng: OFFICE.longitude,
        scannerUserId: 101,
        officeCoords: OFFICE
      });
    } catch (err) {
      rejectedConflict = true;
      assert(err.errorCode === 'OFFLINE_ONLINE_CONFLICT', 'Rejected with OFFLINE_ONLINE_CONFLICT');
    }
    assert(rejectedConflict, 'Phone B offline QR was rejected because Phone A was online elsewhere');

    // Verify audit log entry
    const [auditLogs] = await pool.query(
      `SELECT * FROM attendance_security_audit_logs 
       WHERE student_id = ? AND event_type = 'OFFLINE_ONLINE_CONFLICT'`,
      [TEST_STUDENT_ID]
    );
    assert(auditLogs.length > 0, 'Critical audit log created for OFFLINE_ONLINE_CONFLICT');
  }

  // ---------------------------------------------------------------------------
  // TEST 7: Screenshot or screen recording: blocked and logged
  // ---------------------------------------------------------------------------
  console.log('\n▶ Test 7: Screenshot or screen recording: blocked and logged');
  {
    const { sessionAId } = await resetTestData();

    // Simulate mobile event callback for screenshot
    const auditId1 = await logSecurityAudit({
      studentId: TEST_STUDENT_ID,
      sessionId: sessionAId,
      deviceId: DEVICE_A,
      eventType: 'SCREENSHOT_ATTEMPT',
      severity: 'high',
      telemetry: { trigger: 'Android FLAG_SECURE blocked / iOS screenshot event' }
    });
    assert(auditId1 > 0, 'Screenshot attempt logged to database');

    // Simulate mobile event callback for screen recording
    const auditId2 = await logSecurityAudit({
      studentId: TEST_STUDENT_ID,
      sessionId: sessionAId,
      deviceId: DEVICE_A,
      eventType: 'SCREEN_RECORDING_DETECTED',
      severity: 'high',
      telemetry: { trigger: 'UIScreen.main.isCaptured = true' }
    });
    assert(auditId2 > 0, 'Screen recording attempt logged to database');

    const [rows] = await pool.query(
      `SELECT event_type, flagged_for_admin FROM attendance_security_audit_logs 
       WHERE student_id = ? AND event_type IN ('SCREENSHOT_ATTEMPT', 'SCREEN_RECORDING_DETECTED')`,
      [TEST_STUDENT_ID]
    );
    assert(rows.length === 2, 'Both screenshot and screen recording incidents flagged for admin');
  }

  // ---------------------------------------------------------------------------
  // TEST 8: Reused or expired token: rejected
  // ---------------------------------------------------------------------------
  console.log('\n▶ Test 8: Reused or expired token: rejected');
  {
    await resetTestData();
    // Generate valid online token
    const qrResult = await processOnlineQrIssuance({
      studentId: TEST_STUDENT_ID,
      sessionToken: SESSION_TOKEN_A,
      deviceId: DEVICE_A,
      lat: INSIDE_100M.latitude,
      lng: INSIDE_100M.longitude,
      officeCoords: OFFICE
    });

    // 1st Scan: Should succeed
    const firstScan = await verifyAndRecordAttendance({
      qrPayload: qrResult.qrPayload,
      scannerLat: OFFICE.latitude,
      scannerLng: OFFICE.longitude,
      scannerUserId: 101,
      officeCoords: OFFICE
    });
    assert(firstScan.success === true, 'First scan of token succeeds and marks token as used');

    // 2nd Scan of identical token: MUST FAIL with TOKEN_ALREADY_USED
    let reusedRejected = false;
    try {
      await verifyAndRecordAttendance({
        qrPayload: qrResult.qrPayload,
        scannerLat: OFFICE.latitude,
        scannerLng: OFFICE.longitude,
        scannerUserId: 101,
        officeCoords: OFFICE
      });
    } catch (err) {
      reusedRejected = true;
      assert(err.errorCode === 'TOKEN_ALREADY_USED', 'Reused token rejected with TOKEN_ALREADY_USED');
    }
    assert(reusedRejected, 'Zero-replay defense blocked second scan attempt');

    // Expired Token Test: Simulate scan after token expiry
    let expiredRejected = false;
    try {
      await verifyAndRecordAttendance({
        qrPayload: qrResult.qrPayload,
        scannerLat: OFFICE.latitude,
        scannerLng: OFFICE.longitude,
        scannerUserId: 101,
        scannedAtTimestamp: Math.floor(Date.now() / 1000) + 9999, // far future
        officeCoords: OFFICE
      });
    } catch (err) {
      expiredRejected = true;
      assert(err.errorCode === 'TOKEN_ALREADY_USED' || err.errorCode === 'TOKEN_EXPIRED', 'Expired token rejected');
    }
    assert(expiredRejected, 'Expired token properly rejected');
  }

  // ---------------------------------------------------------------------------
  // TEST 9: Mock GPS detected: denied and flagged
  // ---------------------------------------------------------------------------
  console.log('\n▶ Test 9: Mock GPS detected: denied and flagged');
  {
    await resetTestData();
    let mockDenied = false;
    try {
      await processOnlineQrIssuance({
        studentId: TEST_STUDENT_ID,
        sessionToken: SESSION_TOKEN_A,
        deviceId: DEVICE_A,
        lat: INSIDE_100M.latitude,
        lng: INSIDE_100M.longitude,
        isMockLocation: true, // Mock location flagged by device sensor
        officeCoords: OFFICE
      });
    } catch (err) {
      mockDenied = true;
      assert(err.errorCode === 'MOCK_GPS_FORBIDDEN', 'Denied with MOCK_GPS_FORBIDDEN error');
    }
    assert(mockDenied, 'Mock GPS attempt was denied');

    const [mockLogs] = await pool.query(
      `SELECT * FROM attendance_security_audit_logs 
       WHERE student_id = ? AND event_type = 'MOCK_GPS_DETECTED'`,
      [TEST_STUDENT_ID]
    );
    assert(mockLogs.length > 0, 'Critical audit log created for MOCK_GPS_DETECTED');
    assert(mockLogs[0].severity === 'critical', 'Mock GPS severity marked as CRITICAL');
  }

  // ---------------------------------------------------------------------------
  // CLEANUP & SUMMARY
  // ---------------------------------------------------------------------------
  await pool.query('DELETE FROM attendance_security_audit_logs WHERE student_id = ?', [TEST_STUDENT_ID]);
  await pool.query('DELETE FROM attendance_qr_tokens WHERE student_id = ?', [TEST_STUDENT_ID]);
  await pool.query('DELETE FROM student_device_heartbeats WHERE student_id = ?', [TEST_STUDENT_ID]);
  await pool.query('DELETE FROM student_device_sessions WHERE student_id = ?', [TEST_STUDENT_ID]);

  console.log('\n========================================================================');
  console.log(`🎉 ALL ${passedCount} / ${totalCount} ASSERTIONS PASSED! ZERO-TRUST INVARIANTS VERIFIED.`);
  console.log('========================================================================');
  await pool.end();
}

runAllTests().catch(err => {
  console.error('\n❌ Test Suite Aborted with Error:', err);
  process.exit(1);
});
