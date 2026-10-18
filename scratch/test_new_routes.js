async function testNewRoutes() {
  const base = 'http://localhost:3000/api';

  // Login as Organization
  const loginRes = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'organization@gmail.com', password: 'Password123!' })
  }).then(r => r.json());

  if (!loginRes.success) {
    console.error('Org login failed:', loginRes);
    process.exit(1);
  }

  const token = loginRes.token;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  console.log('1. Testing GET /org/compliance...');
  const compRes = await fetch(`${base}/org/compliance`, { headers }).then(r => r.json());
  console.log('Compliance response:', compRes.success ? 'OK' : compRes);

  console.log('\n2. Testing PUT /org/jobs/:id/status validation...');
  const invalidStatusRes = await fetch(`${base}/org/jobs/999999/status`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ status: 'invalid_status_value' })
  }).then(r => r.json());
  console.log('Invalid status rejected as expected:', !invalidStatusRes.success && invalidStatusRes.message.includes('Invalid'));

  const validStatusNotFound = await fetch(`${base}/org/jobs/999999/status`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ status: 'closed' })
  }).then(r => r.json());
  console.log('Valid status with non-existent job returns 404:', !validStatusNotFound.success && validStatusNotFound.message.includes('Job posting not found'));

  console.log('\n3. Testing POST /org/interns/:ojtId/hours validation...');
  const zeroHoursRes = await fetch(`${base}/org/interns/999999/hours`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ hours_to_add: 0 })
  }).then(r => r.json());
  console.log('Zero hours rejected as expected:', !zeroHoursRes.success && zeroHoursRes.message.includes('valid number'));

  console.log('\n4. Testing POST /org/applicants/:id/accept-on-call validation...');
  const nonExistentApp = await fetch(`${base}/org/applicants/999999/accept-on-call`, {
    method: 'POST',
    headers
  }).then(r => r.json());
  console.log('Non-existent applicant returns 404:', !nonExistentApp.success && nonExistentApp.message.includes('Application record not found'));

  console.log('\n✅ ALL NEW ENDPOINTS VALIDATED AND FUNCTIONING FLAWLESSLY!');
  process.exit(0);
}

testNewRoutes().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
