import http from 'http';

async function testEndpoint() {
  const loginData = JSON.stringify({ email: 'admin1@g.com', password: 'admin1' });
  
  const token = await new Promise((resolve, reject) => {
    const req = http.request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try {
          const resp = JSON.parse(raw);
          resolve(resp.token);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });

  console.log('Got admin token:', !!token);

  // 1. Test All Disciplines
  const allRes = await makeGet('http://localhost:3000/api/admin/analytics/skills', token);
  console.log('=== ALL DISCIPLINES TEST ===');
  console.log('Success:', allRes.success);
  console.log('Metrics:', allRes.data?.metrics);
  console.log('Disciplines clusters:', allRes.data?.disciplines?.map(d => d.label));
  console.log('Cross Discipline Matrix Cards:', allRes.data?.crossDisciplineMatrix?.map(m => ({ label: m.label, openings: m.total_openings, students: m.total_students })));
  console.log('Top skills sample:', allRes.data?.topSkills?.slice(0, 8).map(s => ({ name: s.skill_name, dept: s.primary_department, openings: s.demand_count, students: s.student_count })));

  // 2. Test Healthcare filter
  const healthRes = await makeGet('http://localhost:3000/api/admin/analytics/skills?discipline=healthcare', token);
  console.log('=== HEALTHCARE FILTER TEST ===');
  console.log('Healthcare top skills count:', healthRes.data?.topSkills?.length);
  console.log('Healthcare top skills:', healthRes.data?.topSkills?.slice(0, 5).map(s => ({ name: s.skill_name, openings: s.demand_count, students: s.student_count })));

  // 3. Test Engineering / BSCE filter
  const ceRes = await makeGet('http://localhost:3000/api/admin/analytics/skills?program_code=BSCE', token);
  console.log('=== BSCE FILTER TEST ===');
  console.log('BSCE top skills count:', ceRes.data?.topSkills?.length);
  console.log('BSCE top skills:', ceRes.data?.topSkills?.slice(0, 5).map(s => ({ name: s.skill_name, openings: s.demand_count, students: s.student_count })));

  process.exit(0);
}

function makeGet(urlStr, token) {
  return new Promise((resolve, reject) => {
    http.get(urlStr, {
      headers: { 'Authorization': 'Bearer ' + token }
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

testEndpoint().catch(err => {
  console.error(err);
  process.exit(1);
});
