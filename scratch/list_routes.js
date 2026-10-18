import fs from 'fs';

const content = fs.readFileSync('server/src/routes/institution.routes.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.match(/^router\.(get|post|put|delete|patch)\(/)) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
