async function testAll() {
  const base = 'http://localhost:3000/api';

  console.log('--- Testing Public Endpoints ---');
  const statsRes = await fetch(`${base}/public/stats`).then(r => r.json());
  console.log('Public stats:', statsRes.success ? 'OK' : statsRes);

  const instsRes = await fetch(`${base}/public/institutions`).then(r => r.json());
  console.log('Public institutions count:', instsRes.data?.length);

  async function testLogin(email, password, roleName, endpoints) {
    console.log(`\n--- Testing ${roleName} (${email}) ---`);
    const loginRes = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }).then(r => r.json());

    if (!loginRes.success) {
      console.error(`Login failed for ${email}:`, loginRes);
      return;
    }
    console.log(`Login SUCCESS: user_id=${loginRes.user.user_id}, role=${loginRes.user.role}`);

    const token = loginRes.token;
    for (const ep of endpoints) {
      try {
        const res = await fetch(`${base}${ep}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const text = await res.text();
          console.error(`  GET ${ep} -> [FAILED Non-JSON] status=${res.status}: ${text.substring(0, 150)}`);
          continue;
        }
        const data = await res.json();
        console.log(`  GET ${ep} -> ${data.success !== false ? 'OK' : 'FAILED: ' + JSON.stringify(data)}`);
      } catch (err) {
        console.error(`  GET ${ep} -> [ERROR]: ${err.message}`);
      }
    }
  }

  // 1. Admin
  await testLogin('admin@gmail.com', 'Password123!', 'System Admin', [
    '/admin/dashboard',
    '/admin/institutions',
    '/admin/organizations',
    '/admin/jobs',
    '/admin/complaints',
    '/admin/analytics/skills',
    '/admin/audit-logs',
    '/admin/settings',
    '/admin/users'
  ]);

  // 2. Student
  await testLogin('student@gmail.com', 'Password123!', 'Student', [
    '/student/dashboard',
    '/student/jobs',
    '/student/applications',
    '/student/ojt',
    '/student/skills',
    '/student/portfolio',
    '/student/requirements',
    '/student/complaints',
    '/student/notifications',
    '/student/profile'
  ]);

  // 3. Organization
  await testLogin('organization@gmail.com', 'Password123!', 'Hiring Org', [
    '/org/dashboard',
    '/org/jobs',
    '/org/applicants',
    '/org/interviews',
    '/org/offers',
    '/org/grievances',
    '/org/interns',
    '/org/evaluations',
    '/org/attendance',
    '/org/mentors'
  ]);

  // 4. Institution
  await testLogin('institution@gmail.com', 'Password123!', 'Institution', [
    '/inst/dashboard',
    '/inst/students',
    '/inst/staff',
    '/inst/programs',
    '/inst/requirements',
    '/inst/monitoring',
    '/inst/ojt-offers'
  ]);

  console.log('\n✅ COMPLETED ENDPOINT SCAN!');
  process.exit(0);
}

testAll().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

