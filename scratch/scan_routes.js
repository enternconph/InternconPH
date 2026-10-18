import fs from 'fs';
import path from 'path';

const routesDir = 'server/src/routes';
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));
const allRoutes = {};

files.forEach(f => {
  console.log(`\n=== ${f} ===`);
  const lines = fs.readFileSync(path.join(routesDir, f), 'utf8').split('\n');
  lines.forEach((l, idx) => {
    const m = l.match(/router\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/i);
    if (m) {
      console.log(`  ${m[1].toUpperCase()} ${m[2]} (line ${idx + 1})`);
    }
  });
});

