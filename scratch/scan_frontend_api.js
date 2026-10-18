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

const files = walk('src');
const frontendCalls = [];

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    const matches = l.matchAll(/api\.(get|post|put|delete)\s*\(\s*[`'"]([^`'"]+)[`'"]/g);
    for (const m of matches) {
      frontendCalls.push({
        file: path.relative('src', f),
        line: idx + 1,
        method: m[1].toUpperCase(),
        endpoint: m[2]
      });
    }
  });
});

console.log(JSON.stringify(frontendCalls, null, 2));
