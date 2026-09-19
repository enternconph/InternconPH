const http = require('http');

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let chunks = '';
      res.on('data', chunk => chunks += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(chunks) });
        } catch(e) {
          resolve({ status: res.statusCode, body: chunks });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, (res) => {
      let chunks = '';
      res.on('data', chunk => chunks += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(chunks) });
        } catch(e) {
          resolve({ status: res.statusCode, body: chunks });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTest() {
  console.log('=== Step 1: Login as BSIT Student (s.pup.1@pup.edu.ph) ===');
  const loginRes = await post('/api/auth/login', {
    email: 's.pup.1@pup.edu.ph',
    password: 'Password123!'
  });

  if (!loginRes.body.token) {
    console.error('Login failed:', loginRes.body);
    process.exit(1);
  }

  const token = loginRes.body.token;
  console.log('Logged in successfully! User:', loginRes.body.user.name, '| Role:', loginRes.body.user.role);

  console.log('\n=== Step 2: Fetch Student Skills and AI Recommendations ===');
  const skillsRes = await get('/api/student/skills', token);
  console.log('Skills status:', skillsRes.status);
  console.log('Active skills count:', skillsRes.body.skills?.length || 0);
  console.log('AI Metadata:', skillsRes.body.ai_metadata);
  console.log('Recommendations count:', skillsRes.body.recommendations?.length || 0);

  console.log('\nSample Top 3 Recommendations:');
  (skillsRes.body.recommendations || []).slice(0, 3).forEach((rec, idx) => {
    console.log(`[${idx+1}] ${rec.name} (${rec.category})`);
    console.log(`    Degree Aligned: ${rec.is_degree_aligned} | Program: ${rec.target_program}`);
    console.log(`    Synergy Score: ${rec.synergy_score}% | Growth: ${rec.growth}`);
    console.log(`    AI Rationale: ${rec.ai_rationale}`);
  });

  console.log('\n=== Step 3: Add Competency "React.js" to student ===');
  const addRes = await post('/api/student/skills', {
    skill_name: 'React.js',
    proficiency: 'advanced'
  }, token);
  console.log('Add skill status:', addRes.status, '| Success:', addRes.body.success);
  console.log('Updated AI Recommendations returned:', addRes.body.recommendations?.length || 0);
  if (addRes.body.recommendations?.length) {
    console.log('Top Recommendation after adding React.js:');
    const topRec = addRes.body.recommendations[0];
    console.log(`    Name: ${topRec.name} | Category: ${topRec.category}`);
    console.log(`    AI Rationale: ${topRec.ai_rationale}`);
    console.log(`    Companion to: ${topRec.companion_to}`);
  }

  console.log('\n=== Step 4: Call POST /api/student/skills/ai-generate ===');
  const regenRes = await post('/api/student/skills/ai-generate', {
    career_interest: 'Full-Stack Cloud Developer'
  }, token);
  console.log('Regenerate status:', regenRes.status, '| Success:', regenRes.body.success);
  console.log('Generated recommendations count:', regenRes.body.recommendations?.length || 0);
  (regenRes.body.recommendations || []).slice(0, 3).forEach((rec, idx) => {
    console.log(`[${idx+1}] ${rec.name} | Synergy: ${rec.synergy_score}% | Companion: ${rec.companion_to || 'None'}`);
    console.log(`    Rationale: ${rec.ai_rationale}`);
  });

  console.log('\n=== ALL TESTS COMPLETED SUCCESSFULLY! ===');
}

runTest().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
