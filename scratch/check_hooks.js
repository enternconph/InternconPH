import fs from 'fs';
import path from 'path';

const SRC = 'c:/laragon/www/internconph/src';

function getFiles(dir) {
  let res = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) res = res.concat(getFiles(p));
    else if (f.endsWith('.jsx') || f.endsWith('.js')) res.push(p);
  }
  return res;
}

const files = getFiles(SRC);
let issues = 0;

for (const f of files) {
  const code = fs.readFileSync(f, 'utf-8');

  // Check React hooks usage vs import
  const hooks = ['useState', 'useEffect', 'useContext', 'useMemo', 'useCallback', 'useRef'];
  for (const hook of hooks) {
    // If hook is used as a function call
    const hookCall = new RegExp(`\\b${hook}\\s*\\(`, 'g');
    if (hookCall.test(code)) {
      // Check if it's imported or accessed via React.useState
      const imported = new RegExp(`\\b${hook}\\b`, 'g');
      const importLine = code.split('\n').filter(l => l.includes('import') && imported.test(l));
      const reactDot = new RegExp(`React\\.${hook}\\s*\\(`, 'g');
      if (importLine.length === 0 && !reactDot.test(code)) {
        console.error(`[MISSING HOOK IMPORT] in ${path.relative(SRC, f)}: ${hook} is called but not imported!`);
        issues++;
      }
    }
  }

  // Check useNavigate usage vs import
  if (/\buseNavigate\s*\(/.test(code) && !/useNavigate/.test(code.split('\n').filter(l => l.includes('import')).join(' '))) {
    console.error(`[MISSING useNavigate] in ${path.relative(SRC, f)}`);
    issues++;
  }
}

if (issues === 0) {
  console.log('✓ All React hooks and navigation hooks are properly imported in all frontend components.');
}
process.exit(0);
