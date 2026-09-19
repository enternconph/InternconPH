import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

// 1. Gather all backend routes
const backendRoutes = [];
const routesDir = 'server/src/routes';
const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

const prefixMap = {
  'admin.routes.js': '/admin',
  'auth.routes.js': '/auth',
  'institution.routes.js': '/inst',
  'notification.routes.js': '/notifications',
  'organization.routes.js': '/org',
  'public.routes.js': '/public',
  'student.routes.js': '/student',
  'user.routes.js': '/user'
};

routeFiles.forEach(rf => {
  const prefix = prefixMap[rf] || '';
  const lines = fs.readFileSync(path.join(routesDir, rf), 'utf8').split('\n');
  lines.forEach((l, idx) => {
    const m = l.match(/router\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/i);
    if (m) {
      let routePath = prefix + (m[2] === '/' ? '' : m[2]);
      backendRoutes.push({
        file: rf,
        method: m[1].toUpperCase(),
        path: routePath,
        rawPath: m[2],
        regex: new RegExp('^' + routePath.replace(/:[a-zA-Z0-9_]+/g, '[^/?#]+') + '(\\?.*)?$')
      });
    }
  });
});

// Also in server.js: /api/health
backendRoutes.push({
  file: 'server.js',
  method: 'GET',
  path: '/health',
  rawPath: '/health',
  regex: /^\/health(\?.*)?$/
});

// 2. Gather all frontend calls
const frontendFiles = walk('src');
const unmatched = [];
const matched = [];

frontendFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    const matches = l.matchAll(/api\.(get|post|put|delete)\s*\(\s*([`'"])(.*?)\2/g);
    for (const m of matches) {
      const method = m[1].toUpperCase();
      let endpoint = m[3];
      // Normalize template literals e.g. ${foo} -> 123
      let normalized = endpoint.replace(/\$\{[^}]+\}/g, '123');
      
      const found = backendRoutes.find(br => br.method === method && br.regex.test(normalized));
      if (found) {
        matched.push({ file: f, line: idx + 1, method, endpoint, matchedWith: found.path });
      } else {
        unmatched.push({ file: f, line: idx + 1, method, endpoint, normalized });
      }
    }
  });
});

console.log('=== MATCHED CALLS COUNT ===', matched.length);
console.log('=== UNMATCHED CALLS COUNT ===', unmatched.length);
if (unmatched.length > 0) {
  console.log('UNMATCHED CALLS:', JSON.stringify(unmatched, null, 2));
}
