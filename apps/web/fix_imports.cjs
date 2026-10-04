const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src/pages');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(filePath));
    } else if (file.endsWith('.jsx')) {
      results.push(filePath);
    }
  }
  return results;
}

const files = getFiles(pagesDir);
let changedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  if (content.includes('<TruncatedText') && !content.includes('import TruncatedText')) {
    const rel = path.relative(path.dirname(file), path.join(__dirname, 'src/components/ui/TruncatedText'));
    let importPath = rel.replace(/\\/g, '/');
    if (!importPath.startsWith('.')) importPath = './' + importPath;
    
    const importStmt = `import TruncatedText from '${importPath}';\n`;
    
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfLine = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, endOfLine + 1) + importStmt + content.slice(endOfLine + 1);
    } else {
      content = importStmt + content;
    }
    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
    console.log(`Added import to ${path.basename(file)}`);
  }
}
console.log(`Finished fixing imports. Changed ${changedCount} files.`);
