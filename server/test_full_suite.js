const BASE_URL = 'http://localhost:3000';

async function runSuite() {
  console.log('========================================================');
  console.log('🧪 RUNNING INTERNCONPH AUTOMATED INTEGRATION TEST SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, extra = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${extra}`);
      failed++;
    }
  }

  // 1. Health check & DB
  console.log('1. HEALTH CHECK & DATABASE CONNECTIVITY:');
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    assert(res.status === 200 && data.status === 'ok' && data.database === 'connected', 'GET /api/health returns 200 and database connected');
  } catch (err) {
    assert(false, 'GET /api/health responded', err.message);
  }

  // 2. Authentication: Test all 6 roles
  console.log('\n2. AUTHENTICATION & LOGIN LIFECYCLE (ALL 6 ROLES):');
  const roles = [
    { name: 'System Admin', email: 'admin@gmail.com', role: 'system_admin' },
    { name: 'Institution Director', email: 'institution@gmail.com', role: 'institution' },
    { name: 'Institution Staff', email: 'staff@gmail.com', role: 'institution_staff' },
    { name: 'Hiring Organization HR', email: 'organization@gmail.com', role: 'hiring_organization' },
    { name: 'Workplace Mentor', email: 'mentor@gmail.com', role: 'hiring_organization' },
    { name: 'Student Candidate', email: 'student@gmail.com', role: 'student' },
  ];

  const tokens = {};

  for (const r of roles) {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: r.email, password: 'Password123!' })
      });
      const data = await res.json();
      const ok = res.status === 200 && data.success && data.token && data.user;
      assert(ok, `Login for ${r.name} (${r.email})`, ok ? `-> Role: ${data.user.role}` : data.message);
      if (ok) {
        tokens[r.email] = data.token;
      }
    } catch (err) {
      assert(false, `Login for ${r.name}`, err.message);
    }
  }

  // 3. Logout Endpoint
  console.log('\n3. LOGOUT ENDPOINT & AUDIT LOGGING:');
  try {
    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens['student@gmail.com']}`
      }
    });
    const data = await res.json();
    assert(res.status === 200 && data.success, 'POST /api/auth/logout succeeds with audit trail');
  } catch (err) {
    assert(false, 'POST /api/auth/logout', err.message);
  }

  // 4. Role-Based Access Control (RBAC)
  console.log('\n4. ROLE-BASED ACCESS CONTROL (RBAC) & PERMISSION GUARDS:');
  try {
    // Student attempting to access Admin endpoint
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
      headers: { 'Authorization': `Bearer ${tokens['student@gmail.com']}` }
    });
    assert(res.status === 403, 'Student blocked from GET /api/admin/users (HTTP 403)');
  } catch (err) {
    assert(false, 'Student blocked from Admin', err.message);
  }

  try {
    // Workplace mentor attempting to create a job (HR only)
    const res = await fetch(`${BASE_URL}/api/org/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens['mentor@gmail.com']}`
      },
      body: JSON.stringify({ title: 'Unauthorized Mentor Job' })
    });
    assert(res.status === 403, 'Workplace Mentor blocked from POST /api/org/jobs (HR exclusive HTTP 403)');
  } catch (err) {
    assert(false, 'Mentor blocked from HR job creation', err.message);
  }

  // 5. Protected Mentor Registration Validation
  console.log('\n5. MENTOR REGISTRATION CODE TAMPER RESISTANCE:');
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register/mentor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'attacker@evil.com',
        password: 'Password123!',
        first_name: 'Evil',
        last_name: 'Attacker',
        access_code: 'FAKE-INVALID-CODE-999',
        employee_id: 'HACK-001'
      })
    });
    assert(res.status === 400, 'Invalid/forged access code safely rejected with HTTP 400 (no company fallback exploit)');
  } catch (err) {
    assert(false, 'Mentor invalid access code rejection', err.message);
  }

  // 6. SPA Static Assets and Fallback Routing
  console.log('\n6. SPA DEPLOYMENT ROUTING & NESTED ROUTE REFRESH:');
  try {
    const res = await fetch(`${BASE_URL}/dashboard/admin/institutions`);
    const text = await res.text();
    assert(res.status === 200 && text.includes('<div id="root">'), 'Direct GET /dashboard/admin/institutions serves index.html (SPA Fallback 200 OK)');
  } catch (err) {
    assert(false, 'SPA nested route refresh test', err.message);
  }

  // 7. OJT Hours Bounds Checking
  console.log('\n7. OJT HOURS VALIDATION & BUSINESS LOGIC:');
  try {
    const res = await fetch(`${BASE_URL}/api/org/interns/1/hours`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens['mentor@gmail.com']}`
      },
      body: JSON.stringify({ hours: -10, notes: 'Exploit test' })
    });
    assert(res.status === 400, 'Negative OJT training hours rejected with HTTP 400');
  } catch (err) {
    assert(false, 'OJT negative hours test', err.message);
  }

  // 8. Admin Module Endpoints for Search
  console.log('\n8. ADMIN MODULE SEARCH & DATA ENDPOINTS:');
  try {
    const instRes = await fetch(`${BASE_URL}/api/admin/institutions`, {
      headers: { 'Authorization': `Bearer ${tokens['admin@gmail.com']}` }
    });
    const instData = await instRes.json();
    assert(instRes.status === 200 && instData.success && Array.isArray(instData.data), `GET /api/admin/institutions returns ${instData.data?.length} records`);

    const orgRes = await fetch(`${BASE_URL}/api/admin/organizations`, {
      headers: { 'Authorization': `Bearer ${tokens['admin@gmail.com']}` }
    });
    const orgData = await orgRes.json();
    assert(orgRes.status === 200 && orgData.success && Array.isArray(orgData.data), `GET /api/admin/organizations returns ${orgData.data?.length} records`);

    const jobRes = await fetch(`${BASE_URL}/api/admin/jobs`, {
      headers: { 'Authorization': `Bearer ${tokens['admin@gmail.com']}` }
    });
    const jobData = await jobRes.json();
    assert(jobRes.status === 200 && jobData.success && Array.isArray(jobData.data), `GET /api/admin/jobs returns ${jobData.data?.length} records`);
  } catch (err) {
    assert(false, 'Admin data endpoints test', err.message);
  }

  // Summary
  console.log('\n========================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runSuite().catch(err => {
  console.error('Fatal suite error:', err);
  process.exit(1);
});
