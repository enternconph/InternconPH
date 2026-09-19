const fs = require('fs');
const path = require('path');

function createPdf(title) {
  const content = `BT /F1 18 Tf 72 720 Td (${title}) Tj /F1 12 Tf 72 690 Td (InternCon.ph - Verified Student Career Portfolio Document) Tj ET`;
  const streamLen = Buffer.byteLength(content);
  return `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLen} >>
stream
${content}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000234 00000 n 
0000000320 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
410
%%EOF`;
}

// 1x1 transparent PNG buffer
const dummyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

const dir = 'c:/internconph/server/uploads/portfolio';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const files = [
  { name: 'capstone_smart_ojt_tracking.pdf', title: 'Capstone Design - Smart Attendance and OJT Tracking System' },
  { name: 'fullstack_webdev_cert.pdf', title: 'Certificate of Competency - Full-Stack Web Development' },
  { name: 'aws_cloud_practitioner_cert.pdf', title: 'AWS Certified Cloud Practitioner - Certificate of Completion' },
  { name: 'official_transcript_of_records.pdf', title: 'Official Transcript of Records TOR - Certified True Copy' },
  { name: 'certificate_of_registration_cor.pdf', title: 'Certificate of Registration COR - Academic Term 2026' },
  { name: 'denmark_catolico_resume_2026.pdf', title: 'Curriculum Vitae and Professional Career Resume' },
  { name: 'juan_dela_cruz_resume_2026.pdf', title: 'Student Professional Resume - Juan Dela Cruz' }
];

files.forEach(f => {
  const p = path.join(dir, f.name);
  fs.writeFileSync(p, createPdf(f.title));
  console.log('Created PDF:', f.name, fs.statSync(p).size, 'bytes');
});

fs.writeFileSync(path.join(dir, 'project_ui_preview.png'), dummyPng);
console.log('Created PNG: project_ui_preview.png');
