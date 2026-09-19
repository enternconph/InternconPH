import fs from 'fs';
import path from 'path';

const ROOT = 'c:/laragon/www/internconph';
const SRC_DIR = path.join(ROOT, 'src');
const SERVER_DIR = path.join(ROOT, 'server/src');

console.log('=== 1. CHECKING FRONTEND IMPORTS ===');
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

const frontendFiles = getFiles(SRC_DIR);
let missingImports = 0;

for (const file of frontendFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  // Match import ... from '...' or import '...'
  const importRegex = /(?:import|from)\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith('.')) {
      // Relative import
      const dir = path.dirname(file);
      const targetBase = path.resolve(dir, importPath);
      const possibleExtensions = ['', '.js', '.jsx', '.json', '.css', '/index.js', '/index.jsx'];
      const exists = possibleExtensions.some(ext => fs.existsSync(targetBase + ext));
      if (!exists) {
        console.error(`[BROKEN IMPORT] in ${path.relative(ROOT, file)}: Cannot resolve "${importPath}"`);
        missingImports++;
      }
    }
  }
}
if (missingImports === 0) {
  console.log('✓ All frontend relative imports resolved successfully.');
}

console.log('\n=== 2. EXTRACTING FRONTEND API CALLS ===');
const apiCalls = new Set();
for (const file of frontendFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  // Match api.get('/...', api.post('/...', api.put('/...', api.delete('/...'
  const apiRegex = /api\.(get|post|put|delete|patch)\(\s*[`'"](\/[^`'"?]+)/g;
  let match;
  while ((match = apiRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const ep = match[2];
    apiCalls.add(`${method} ${ep}`);
  }
}
console.log(`Found ${apiCalls.size} unique API endpoints called by frontend.`);

console.log('\n=== 3. CHECKING SERVER ROUTES ===');
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

  // Match router.get('...', router.post('...'
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
console.log(`Found ${serverEndpoints.length} registered server routes.`);

console.log('\n=== 4. MATCHING FRONTEND API CALLS TO SERVER ROUTES ===');
function matchRoute(feRoute, serverRoutes) {
  const [feMethod, fePath] = feRoute.split(' ');
  const fullFePath = '/api' + fePath;

  for (const s of serverRoutes) {
    if (s.method !== feMethod) continue;
    // convert server route param like :id to regex
    const pattern = '^' + s.fullRoute.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';
    const regex = new RegExp(pattern);
    if (regex.test(fullFePath)) {
      return true;
    }
  }
  return false;
}

let unmatchedCount = 0;
for (const feCall of Array.from(apiCalls).sort()) {
  const matched = matchRoute(feCall, serverEndpoints);
  if (!matched) {
    console.warn(`[UNMATCHED API CALL] Frontend calls "${feCall}" but no matching backend route found!`);
    unmatchedCount++;
  }
}
if (unmatchedCount === 0) {
  console.log('✓ All frontend API calls have corresponding backend routes.');
}

console.log('\n=== SCAN COMPLETE ===');
process.exit(0);
