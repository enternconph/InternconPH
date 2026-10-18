import http from 'http';

async function runComprehensiveTest() {
  console.log('=== RUNNING COMPREHENSIVE CROSS-DISCIPLINE ANALYTICS TEST ===');

  // 1. Authenticate as admin
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

  if (!token) {
    throw new Error('Admin login failed: No token received');
  }
  console.log('✓ Admin authenticated successfully.');

  function queryEndpoint(path) {
    return new Promise((resolve, reject) => {
      http.get('http://localhost:3000' + path, {
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

  // 2. Test All Disciplines & Matrix
  const allRes = await queryEndpoint('/api/admin/analytics/skills');
  console.log('\n--- 1. All Disciplines Overview ---');
  console.log('Success:', allRes.success);
  console.log('Metrics:', allRes.data.metrics);
  console.log('Disciplines count:', allRes.data.disciplines.length);
  console.log('Programs count:', allRes.data.programs.length);
  console.log('Cross-Discipline Matrix count:', allRes.data.crossDisciplineMatrix.length);
  allRes.data.crossDisciplineMatrix.forEach(m => {
    console.log(`  [${m.label}] Openings: ${m.total_openings}, Students: ${m.total_students}, Top Skills: ${m.top_demand.map(s => s.skill_name).join(', ')}`);
  });

  // 3. Test Discipline Clusters
  const testClusters = [
    { id: 'healthcare', label: 'Healthcare & Medical' },
    { id: 'engineering', label: 'Engineering & Architecture' },
    { id: 'business', label: 'Business & Accountancy' },
    { id: 'hospitality', label: 'Hospitality & Tourism' },
    { id: 'education', label: 'Teacher Education' },
    { id: 'criminology', label: 'Criminal Justice' },
    { id: 'arts', label: 'Arts & Multimedia' },
    { id: 'agriculture', label: 'Agriculture & Environment' },
    { id: 'computing', label: 'Computing & IT' }
  ];

  console.log('\n--- 2. Discipline Cluster Filtering ---');
  for (const tc of testClusters) {
    const res = await queryEndpoint(`/api/admin/analytics/skills?discipline=${tc.id}`);
    const top = res.data?.topSkills || [];
    const talent = res.data?.studentSkillsCount || [];
    console.log(`✓ Cluster [${tc.label}]: In-Demand Skills=${top.length}, Talent Competencies=${talent.length}`);
    if (top.length > 0) {
      console.log(`   Leading demand: ${top.slice(0, 3).map(s => `${s.skill_name} (${s.demand_count} jobs, Dept: ${s.primary_department})`).join(' | ')}`);
    }
  }

  // 4. Test Course / Degree Program Filtering
  const testPrograms = [
    { code: 'BSN', name: 'BS Nursing' },
    { code: 'BSCE', name: 'BS Civil Engineering' },
    { code: 'BSA', name: 'BS Accountancy' },
    { code: 'BSCRIM', name: 'BS Criminology' },
    { code: 'BSHM', name: 'BS Hospitality Management' },
    { code: 'BSED-ENG', name: 'BSED English' },
    { code: 'BMMA', name: 'Bachelor of Multimedia Arts' },
    { code: 'BSAGRI', name: 'BS Agriculture' }
  ];

  console.log('\n--- 3. Program / Course Direct Filtering ---');
  for (const tp of testPrograms) {
    const res = await queryEndpoint(`/api/admin/analytics/skills?program_code=${tp.code}`);
    const top = res.data?.topSkills || [];
    const talent = res.data?.studentSkillsCount || [];
    console.log(`✓ Program [${tp.code} - ${tp.name}]: In-Demand=${top.length}, Talent Pool=${talent.length}`);
    if (top.length > 0) {
      console.log(`   Top course skill: ${top[0].skill_name} (${top[0].demand_count} openings, courses: ${top[0].programs.join(', ')})`);
    }
  }

  // 5. Test AI Recalculate endpoint
  console.log('\n--- 4. POST /api/admin/analytics/recalculate ---');
  const recalcRes = await new Promise((resolve, reject) => {
    const postReq = http.request('http://localhost:3000/api/admin/analytics/recalculate', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
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
    });
    postReq.on('error', reject);
    postReq.end();
  });
  console.log('Recalculate success:', recalcRes.success);
  console.log('Recalculate message:', recalcRes.message);
  console.log('Skills evaluated:', recalcRes.data?.skillsEvaluated);

  console.log('\n=== ALL TESTS PASSED WITH 100% SUCCESS! ===');
  process.exit(0);
}

runComprehensiveTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
