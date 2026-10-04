import http from 'http';

function request(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/api' + path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch(e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('--- TESTING INTERNCONPH BACKEND ---');
  
  // Test Health
  const health = await request('GET', '/health');
  console.log('1. Health Check:', health.data.ok ? 'PASS' : 'FAIL', health.data);
  
  console.log('\n--- TESTS COMPLETED ---');
}

runTests().catch(console.error);
