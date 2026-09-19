import fs from 'fs';
import path from 'path';

function checkImports(baseDir) {
  const issues = [];
  function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
      if (['node_modules', 'dist', '.git', '.venv'].includes(f)) continue;
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) {
        walk(full);
      } else if (f.endsWith('.js') || f.endsWith('.jsx')) {
        const content = fs.readFileSync(full, 'utf8');
        const lines = content.split('\n');
        lines.forEach((l, idx) => {
          const m = l.match(/(?:from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\))/);
          if (m) {
            const importPath = m[1] || m[2];
            if (importPath.startsWith('.')) {
              // Local import
              const resolvedDir = path.dirname(full);
              const targetBase = path.resolve(resolvedDir, importPath);
              const candidates = [
                targetBase,
                targetBase + '.js',
                targetBase + '.jsx',
                targetBase + '.json',
                path.join(targetBase, 'index.js'),
                path.join(targetBase, 'index.jsx')
              ];
              const exists = candidates.some(c => fs.existsSync(c));
              if (!exists) {
                issues.push({ file: full, line: idx + 1, importPath });
              }
            }
          }
        });
      }
    }
  }
  walk(baseDir);
  return issues;
}

console.log('Checking frontend imports in src:');
const srcIssues = checkImports('src');
console.log('Src import issues:', srcIssues);

console.log('Checking backend imports in server/src:');
const serverIssues = checkImports('server/src');
console.log('Server import issues:', serverIssues);
