import fs from 'fs';
import path from 'path';

const ROOT = 'c:/laragon/www/internconph';
const SRC_DIR = path.join(ROOT, 'src');
const SERVER_DIR = path.join(ROOT, 'server/src');

function getFiles(dir, exts = ['.js', '.jsx']) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(full, exts));
    } else {
      if (exts.some(ext => file.endsWith(ext))) {
        results.push(full);
      }
    }
  }
  return results;
}

// 1. Gather all server routes
const serverFiles = getFiles(path.join(SERVER_DIR, 'routes'), ['.routes.js']);
const serverEndpoints = [];

for (const file of serverFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const basePrefix = file.includes('admin') ? '/api/admin' :
                     file.includes('student') ? '/api/student' :
                     file.includes('organization') ? '/api/org' :
                     file.includes('institution') ? '/api/inst' :
                     file.includes('auth') ? '/api/auth' :
                     file.includes('public') ? '/api/public' :
                     file.includes('notification') ? '/api/notifications' :
                     file.includes('user') ? '/api/user' : '';

  const routeRegex = /router\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const ep = match[2];
    serverEndpoints.push({
      file: path.relative(ROOT, file),
      method,
      fullRoute: basePrefix + (ep === '/' ? '' : ep)
    });
  }
}

// 2. Gather all frontend calls (all methods)
const frontendFiles = getFiles(SRC_DIR);
const feCalls = [];

for (const file of frontendFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  // Match api.get/post/put/delete(`...` or '...')
  const apiRegex = /api\.(get|post|put|delete|patch)\(\s*([`'"][^,)]+[`'"])/g;
  let match;
  while ((match = apiRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    let rawUrl = match[2].trim();
    // remove enclosing quotes or backticks
    rawUrl = rawUrl.substring(1, rawUrl.length - 1);
    // remove query strings
    const urlWithoutQuery = rawUrl.split('?')[0].split('${')[0].replace(/\${.*}/g, 'PARAM');
    feCalls.push({
      file: path.relative(ROOT, file),
      method,
      rawUrl,
      cleanUrl: rawUrl.replace(/\$\{[^}]+\}/g, '123') // replace interpolation with dummy id
    });
  }
}

console.log(`Checking ${feCalls.length} frontend API calls against ${serverEndpoints.length} backend routes...`);

let missingCount = 0;
for (const call of feCalls) {
  const fullPath = '/api' + call.cleanUrl.split('?')[0];
  let matched = false;
  for (const s of serverEndpoints) {
    if (s.method !== call.method) continue;
    const pattern = '^' + s.fullRoute.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';
    if (new RegExp(pattern).test(fullPath)) {
      matched = true;
      break;
    }
  }
  if (!matched) {
    console.error(`[UNMATCHED] in ${call.file}: ${call.method} ${call.rawUrl}`);
    missingCount++;
  }
}

if (missingCount === 0) {
  console.log('✓ All frontend API calls matched server endpoints!');
} else {
  console.log(`Total unmatched frontend calls: ${missingCount}`);
}

process.exit(0);
