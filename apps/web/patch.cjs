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
  let original = content;

  // Replace exact tags: >{item.description}<
  // Also supports fallback: >{item.description || 'fallback'}<
  const regex = />\{([a-zA-Z0-9_]+\.(?:description|reason|findings|details|resolution))(?: \|\| (['"][^'"]*['"]))?\}</g;
  
  content = content.replace(regex, (match, p1, p2) => {
    let textProp = p1;
    if (p2) {
      textProp = `${p1} || ${p2}`;
    }
    return `><TruncatedText text={${textProp}} /><`;
  });

  // Also replace some specific known patterns from grep that don't match the simple regex
  // E.g. {item.description && <p className="..."> {item.description} </p>}
  // In JSX, they often look like: >{item.description}</p>
  // Handled by the above regex!

  if (content !== original) {
    // Inject import if not exists
    if (!content.includes('TruncatedText')) {
      // Determine relative path depth
      // src/pages/admin/File.jsx is depth 2, src/pages/File.jsx is depth 1
      const rel = path.relative(path.dirname(file), path.join(__dirname, 'src/components/ui/TruncatedText'));
      const importPath = rel.replace(/\\/g, '/');
      
      const importStmt = `import TruncatedText from '${importPath}';\n`;
      // Insert after last import
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const endOfLine = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, endOfLine + 1) + importStmt + content.slice(endOfLine + 1);
      } else {
        content = importStmt + content;
      }
    }
    
    // Also remove truncate and line-clamp classes since TruncatedText handles it safely
    content = content.replace(/className="([^"]*)(line-clamp-[0-9]+|truncate)([^"]*)"/g, (match, p1, p2, p3) => {
        const newClass = (p1 + p3).replace(/\s+/g, ' ').trim();
        return newClass ? `className="${newClass}"` : '';
    });

    fs.writeFileSync(file, content, 'utf8');
    changedCount++;
    console.log(`Updated ${path.basename(file)}`);
  }
}

console.log(`\nFinished patching. Changed ${changedCount} files.`);
