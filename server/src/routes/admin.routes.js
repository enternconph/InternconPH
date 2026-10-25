import express from 'express';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { verifyToken, requireRole } from '../middleware/auth.js';
import { emitUpdate } from '../config/socket.js';
import { sendNotification } from '../utils/notification.helper.js';
import { PROGRAM_SKILLS_CATALOG } from '../data/programSkillsData.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

// Helper to extract text from Microsoft Word (.docx) XML without external dependencies
export function extractDocxText(buf) {
  if (!buf || buf.length < 30) return null;
  const targetFile = 'word/document.xml';
  let pos = 0;
  while (pos < buf.length - 30) {
    if (buf.readUInt32LE(pos) === 0x04034b50) {
      const compression = buf.readUInt16LE(pos + 8);
      const compressedSize = buf.readUInt32LE(pos + 18);
      const nameLen = buf.readUInt16LE(pos + 26);
      const extraLen = buf.readUInt16LE(pos + 28);
      const currentName = buf.toString('utf8', pos + 30, pos + 30 + nameLen);
      const dataStart = pos + 30 + nameLen + extraLen;
      if (currentName === targetFile) {
        try {
          const compressedData = buf.subarray(dataStart, dataStart + compressedSize);
          let xmlStr = '';
          if (compression === 8) {
            xmlStr = zlib.inflateRawSync(compressedData).toString('utf8');
          } else if (compression === 0) {
            xmlStr = compressedData.toString('utf8');
          }
          const text = xmlStr
            .replace(/<w:p[^>]*>/g, '\n\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'");
          return text.trim();
        } catch (_) {
          return null;
        }
      }
      pos = dataStart + compressedSize;
    } else {
      pos++;
    }
  }
  return null;
}

// HTML escape helper
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Render modern document viewer for Word (.docx) files inside iframes/tabs
function renderDocxPreviewHtml({ title, docName, fileName, fileSize, uploadedAt, textContent, downloadUrl }) {
  const formattedSize = fileSize ? (fileSize > 1048576 ? (fileSize / 1048576).toFixed(2) + ' MB' : (fileSize / 1024).toFixed(1) + ' KB') : 'Document';
  const uploadDateStr = uploadedAt ? new Date(uploadedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : 'Verified Archive';
  
  const paragraphs = (textContent || '')
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);

  const bodyHtml = paragraphs.length > 0 
    ? paragraphs.map(p => `<p class="doc-p">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`).join('')
    : `<div class="empty-text">
        <p><strong>Microsoft Word Document (.docx)</strong></p>
        <p>This document contains formatted tables, charts, or images. Click "Download Original .docx" to inspect with full Microsoft Office formatting.</p>
      </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title || 'Document Verification')}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      padding: 1rem;
      line-height: 1.6;
    }
    .header-bar {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
      background: #ffffff;
      padding: 0.85rem 1.25rem;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      margin-bottom: 1.25rem;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .doc-meta { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
    .doc-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      word-break: break-word;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.15rem 0.5rem;
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      border-radius: 9999px;
      background: #fff7ed;
      color: #ea580c;
      border: 1px solid #fed7aa;
      white-space: nowrap;
    }
    .badge-blue {
      background: #eff6ff;
      color: #2563eb;
      border: 1px solid #bfdbfe;
    }
    .doc-subtitle {
      font-size: 0.75rem;
      color: #64748b;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .actions { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.45rem 0.85rem;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 8px;
      text-decoration: none;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }
    .btn-primary { background: #ea580c; color: #ffffff; }
    .btn-primary:hover { background: #c2410c; }
    .btn-secondary { background: #ffffff; color: #334155; border-color: #cbd5e1; }
    .btn-secondary:hover { background: #f1f5f9; }
    .doc-paper {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      padding: 2.5rem 3rem;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 16px rgba(0,0,0,0.04);
      min-height: 450px;
    }
    .doc-paper-header {
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 1.25rem;
      margin-bottom: 2rem;
      text-align: center;
    }
    .doc-paper-header h1 {
      font-size: 1.15rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.01em;
      margin-bottom: 0.25rem;
    }
    .doc-paper-header p {
      font-size: 0.8rem;
      color: #64748b;
    }
    .doc-p {
      margin-bottom: 1.25rem;
      font-size: 0.95rem;
      color: #1e293b;
      line-height: 1.75;
      font-family: "Charter", "Bitstream Charter", "Sitka Text", Cambria, Georgia, serif;
    }
    .empty-text {
      text-align: center;
      padding: 3rem 1rem;
      color: #64748b;
      font-size: 0.9rem;
    }
    .print-footer {
      text-align: center;
      margin-top: 2rem;
      font-size: 0.725rem;
      color: #94a3b8;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .header-bar, .actions { display: none !important; }
      .doc-paper { box-shadow: none; border: none; padding: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="header-bar">
    <div class="doc-meta">
      <div class="doc-title">
        <span>${escapeHtml(docName || 'Legal Accreditation Softcopy')}</span>
        <span class="badge">Word DOCX</span>
        <span class="badge badge-blue">Official Verification</span>
      </div>
      <div class="doc-subtitle">
        File: <strong>${escapeHtml(fileName || 'document.docx')}</strong> &bull; Size: ${formattedSize} &bull; Uploaded: ${escapeHtml(uploadDateStr)}
      </div>
    </div>
    <div class="actions">
      <a href="${downloadUrl}" class="btn btn-primary" download>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download Original .docx
      </a>
      <button onclick="window.print()" class="btn btn-secondary">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print / PDF
      </button>
    </div>
  </div>

  <div class="doc-paper">
    <div class="doc-paper-header">
      <h1>${escapeHtml(docName || 'OFFICIAL SOFTCOPY RECORD')}</h1>
      <p>Submitted Document Transcript &bull; Republic of the Philippines &bull; InternConPH Legitimacy Verification</p>
    </div>
    <div class="doc-content">
      ${bodyHtml}
    </div>
  </div>
  <div class="print-footer">
    InternConPH Philippine OJT Coordination Platform &bull; System Administrator Legal Verification Engine
  </div>
</body>
</html>`;
}

// Render self-declared government permit certificate proof
function renderSelfDeclaredProofHtml({ docName, refNumber, doc }) {
  const uploadDateStr = doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : 'Verified Archive';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accreditation Reference - ${escapeHtml(refNumber)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      padding: 2rem 1rem;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 90vh;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 2.5rem;
      max-width: 600px;
      width: 100%;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      text-align: center;
    }
    .icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 1.25rem;
      border-radius: 50%;
      background: #ecfdf5;
      color: #059669;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: bold;
    }
    h2 { font-size: 1.25rem; font-weight: 800; margin-bottom: 0.5rem; color: #0f172a; }
    p { font-size: 0.875rem; color: #475569; margin-bottom: 1.5rem; line-height: 1.5; }
    .ref-box {
      background: #f1f5f9;
      border: 1px dashed #cbd5e1;
      padding: 1.25rem;
      border-radius: 12px;
      margin-bottom: 1.5rem;
    }
    .ref-label { font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
    .ref-code { font-family: monospace; font-size: 1.2rem; font-weight: 700; color: #ea580c; }
    .meta { font-size: 0.75rem; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#10003;</div>
    <h2>Government Accreditation / Permit Reference</h2>
    <p>This institution declared their official government accreditation permit registration number during formal platform onboarding.</p>
    <div class="ref-box">
      <div class="ref-label">Accreditation Reference Number</div>
      <div class="ref-code">${escapeHtml(refNumber)}</div>
    </div>
    <div class="meta">
      Record ID: #${doc.document_id} &bull; Document: ${escapeHtml(docName || 'Government Accreditation Record')} &bull; Submitted: ${escapeHtml(uploadDateStr)}
    </div>
  </div>
</body>
</html>`;
}

// Render graceful fallback when a file is unavailable on both disk and database
function renderMissingDocHtml({ docName, fileName, filePath, doc }) {
  const uploadDateStr = doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }) : 'N/A';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document File Not Found - InternConPH</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      padding: 2rem 1rem;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 85vh;
    }
    .card {
      background: #ffffff;
      border: 1px solid #fee2e2;
      border-radius: 16px;
      padding: 2.25rem;
      max-width: 600px;
      width: 100%;
      box-shadow: 0 4px 16px rgba(239, 68, 68, 0.08);
      text-align: center;
    }
    .icon {
      width: 56px;
      height: 56px;
      margin: 0 auto 1.25rem;
      border-radius: 50%;
      background: #fef2f2;
      color: #dc2626;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
    }
    h2 { font-size: 1.15rem; font-weight: 800; margin-bottom: 0.5rem; color: #991b1b; }
    p { font-size: 0.85rem; color: #475569; margin-bottom: 1.25rem; line-height: 1.5; }
    .info-table {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 1rem;
      text-align: left;
      font-size: 0.8rem;
      margin-bottom: 1.25rem;
    }
    .info-row { display: flex; justify-content: space-between; padding: 0.25rem 0; border-bottom: 1px solid #f1f5f9; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #64748b; font-weight: 600; }
    .info-val { color: #0f172a; font-family: monospace; word-break: break-all; }
    .advice {
      font-size: 0.775rem;
      color: #b45309;
      background: #fffbeb;
      border: 1px solid #fef3c7;
      padding: 0.75rem;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#9888;</div>
    <h2>Softcopy Document File Unavailable</h2>
    <p>The document metadata exists in the database, but the physical file is not found on local disk or database cache.</p>
    <div class="info-table">
      <div class="info-row"><span class="info-label">Document:</span><span class="info-val">${escapeHtml(docName || 'Accreditation Softcopy')}</span></div>
      <div class="info-row"><span class="info-label">File Name:</span><span class="info-val">${escapeHtml(fileName || 'document')}</span></div>
      <div class="info-row"><span class="info-label">Uploaded:</span><span class="info-val">${escapeHtml(uploadDateStr)}</span></div>
      <div class="info-row"><span class="info-label">Storage Path:</span><span class="info-val">${escapeHtml(filePath || 'N/A')}</span></div>
    </div>
    <div class="advice">
      <strong>Administrator Action:</strong> If this file was uploaded before server storage migration, please request the organization or school to re-upload their legal softcopy via their dashboard.
    </div>
  </div>
</body>
</html>`;
}

// Safe file resolver across canonical and fallback directories
const resolveUploadedFilePath = (webOrRelativePath) => {
  if (!webOrRelativePath) return null;
  if (webOrRelativePath.startsWith('http://') || webOrRelativePath.startsWith('https://')) return null;

  const cleanRel = webOrRelativePath.replace(/^\/?uploads\/?/, '');
  const candidates = [
    path.join(UPLOADS_DIR, cleanRel),
    path.join(UPLOADS_DIR, webOrRelativePath),
    path.join(process.cwd(), 'server', 'uploads', cleanRel),
    path.join(process.cwd(), 'server', webOrRelativePath),
    path.join(process.cwd(), 'uploads', cleanRel),
    path.join(process.cwd(), webOrRelativePath)
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
    } catch (_) {}
  }
  return null;
};

// Resilient document fetcher supporting local disk, database stored_uploads, and Cloudinary URLs
const fetchDocumentResource = async (doc) => {
  if (!doc || !doc.file_path) {
    return { type: 'not_found', doc };
  }

  // 1. External Web URLs (Cloudinary, S3, etc.)
  if (doc.file_path.startsWith('http://') || doc.file_path.startsWith('https://')) {
    return { type: 'url', url: doc.file_path, doc };
  }

  // 2. Self-Declared Government Registrations / Accreditation References
  if (doc.file_path.startsWith('Ref:') || doc.file_path.includes('(Self-Declared)')) {
    return { type: 'self_declared', ref: doc.file_path, doc };
  }

  // 3. Check local disk canonical and fallback locations
  const filePath = resolveUploadedFilePath(doc.file_path);
  if (filePath && fs.existsSync(filePath)) {
    try {
      const stat = fs.statSync(filePath);
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      return {
        type: 'file',
        buffer,
        filePath,
        fileName: doc.file_name || path.basename(filePath),
        fileSize: stat.size,
        ext,
        doc
      };
    } catch (readErr) {
      console.warn('[Doc Resolver] Could not read disk file:', readErr.message);
    }
  }

  // 4. Check MySQL persistent stored_uploads (Render/Ephemeral cloud storage resilience)
  try {
    const basename = path.basename(doc.file_path);
    const [rows] = await pool.query(
      `SELECT file_name, mime_type, file_size, file_data 
       FROM stored_uploads 
       WHERE file_path = ? OR file_path LIKE ? OR file_name = ? OR file_name = ?
       ORDER BY upload_id DESC LIMIT 1`,
      [doc.file_path, `%/${basename}`, basename, doc.file_name]
    );

    if (rows && rows.length > 0 && rows[0].file_data) {
      const rec = rows[0];
      const fileName = rec.file_name || doc.file_name || basename;
      const ext = path.extname(fileName).toLowerCase();

      // Re-hydrate local disk cache so subsequent reads are instant
      try {
        const subfolder = doc.file_path.includes('/institutions') ? 'institutions' : doc.file_path.includes('/orgs') ? 'orgs' : '';
        const targetDir = subfolder ? path.join(UPLOADS_DIR, subfolder) : UPLOADS_DIR;
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        const localPath = path.join(targetDir, basename);
        if (!fs.existsSync(localPath)) fs.writeFileSync(localPath, rec.file_data);
      } catch (cacheErr) {
        console.warn('[Doc Resolver] Re-hydrate disk cache warning:', cacheErr.message);
      }

      return {
        type: 'file',
        buffer: rec.file_data,
        filePath: null,
        fileName,
        fileSize: rec.file_size || rec.file_data.length,
        mimeType: rec.mime_type,
        ext,
        doc
      };
    }
  } catch (dbErr) {
    console.error('[Doc Resolver] stored_uploads query error:', dbErr);
  }

  // 5. Fallback: fuzzy match on disk if timestamp or prefix matches
  try {
    const basename = path.basename(doc.file_path);
    const subfolder = doc.file_path.includes('/institutions') ? 'institutions' : doc.file_path.includes('/orgs') ? 'orgs' : '';
    const searchDir = subfolder ? path.join(UPLOADS_DIR, subfolder) : UPLOADS_DIR;
    if (fs.existsSync(searchDir)) {
      const files = fs.readdirSync(searchDir);
      const match = files.find(f => f.toLowerCase() === basename.toLowerCase() || (doc.file_name && f.toLowerCase().includes(doc.file_name.toLowerCase())));
      if (match) {
        const fullP = path.join(searchDir, match);
        const stat = fs.statSync(fullP);
        return {
          type: 'file',
          buffer: fs.readFileSync(fullP),
          filePath: fullP,
          fileName: match,
          fileSize: stat.size,
          ext: path.extname(match).toLowerCase(),
          doc
        };
      }
    }
  } catch (_) {}

  return { type: 'not_found', doc };
};

router.use(verifyToken);
router.use(requireRole('system_admin'));

// GET /api/admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [
      [[{ totalUsers }]], [[{ totalStudents }]], [[{ totalOrgs }]], [[{ totalInstitutions }]],
      [[{ pendingOrgs }]], [[{ pendingInstitutions }]], [[{ activeOjts }]], [[{ totalJobs }]],
      [[{ pendingComplaints }]], [[{ totalComplaints }]], [[{ activeSuspensions }]],
      [roleRows], [topSkills], [recentOrgs], [recentInstitutions], [recentAuditLogs]
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as totalUsers FROM users'),
      pool.query('SELECT COUNT(*) as totalStudents FROM students'),
      pool.query('SELECT COUNT(*) as totalOrgs FROM hiring_organizations'),
      pool.query('SELECT COUNT(*) as totalInstitutions FROM institutions'),
      pool.query('SELECT COUNT(*) as pendingOrgs FROM hiring_organizations WHERE status = \'pending\''),
      pool.query('SELECT COUNT(*) as pendingInstitutions FROM institutions WHERE status = \'pending\''),
      pool.query('SELECT COUNT(*) as activeOjts FROM ojt_records WHERE status = \'ongoing\''),
      pool.query('SELECT COUNT(*) as totalJobs FROM job_postings'),
      pool.query('SELECT COUNT(*) as pendingComplaints FROM institution_reports WHERE status = \'pending\''),
      pool.query('SELECT COUNT(*) as totalComplaints FROM institution_reports'),
      pool.query('SELECT COUNT(*) as activeSuspensions FROM organization_suspensions WHERE is_active = 1'),
      pool.query(`
        SELECT r.role_name, COUNT(u.user_id) as count 
        FROM users u 
        JOIN roles r ON u.role_id = r.role_id 
        GROUP BY r.role_id, r.role_name
      `),
      pool.query(`
        SELECT s.skill_name, COUNT(ss.student_id) as student_count,
               COALESCE((SELECT COUNT(*) FROM job_required_skills jrs WHERE jrs.skill_id = s.skill_id), 0) as job_demand_count
        FROM skills s
        LEFT JOIN student_skills ss ON s.skill_id = ss.skill_id
        GROUP BY s.skill_id, s.skill_name
        ORDER BY (student_count * 2 + job_demand_count * 5) DESC
        LIMIT 8
      `),
      pool.query('SELECT * FROM hiring_organizations ORDER BY created_at DESC LIMIT 5'),
      pool.query('SELECT * FROM institutions ORDER BY created_at DESC LIMIT 5'),
      pool.query(`
        SELECT al.*, u.email as user_email, r.role_name 
        FROM audit_logs al 
        LEFT JOIN users u ON al.user_id = u.user_id 
        LEFT JOIN roles r ON u.role_id = r.role_id 
        ORDER BY al.created_at DESC 
        LIMIT 6
      `)
    ]);

    const roleDistribution = {};
    roleRows.forEach(r => { roleDistribution[r.role_name] = r.count; });

    return res.json({
      success: true,
      data: {
        metrics: {
          totalUsers,
          totalStudents,
          totalOrgs,
          totalInstitutions,
          pendingOrgs,
          pendingInstitutions,
          activeOjts,
          totalJobs,
          pendingComplaints,
          totalComplaints,
          activeSuspensions
        },
        roleDistribution,
        topSkills,
        recentOrgs,
        recentInstitutions,
        recentAuditLogs
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Could not load admin dashboard.' });
  }
});

// GET /api/admin/institutions
router.get('/institutions', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT i.*, ireg.submitted_at, 
              COALESCE(sc.student_count, 0) as student_count,
              COALESCE(pc.program_count, 0) as program_count
       FROM institutions i
       LEFT JOIN institution_registrations ireg ON i.institution_id = ireg.institution_id
       LEFT JOIN (
           SELECT institution_id, COUNT(*) as student_count
           FROM students
           GROUP BY institution_id
       ) sc ON i.institution_id = sc.institution_id
       LEFT JOIN (
           SELECT institution_id, COUNT(*) as program_count
           FROM programs
           GROUP BY institution_id
       ) pc ON i.institution_id = pc.institution_id
       ORDER BY (CASE WHEN i.status = 'pending' THEN 0 ELSE 1 END), i.created_at DESC`
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Admin fetch institutions error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch institutions.' });
  }
});

// GET /api/admin/institutions/:id
router.get('/institutions/:id', async (req, res) => {
  const instId = req.params.id;
  try {
    const [institutions] = await pool.query('SELECT * FROM institutions WHERE institution_id = ?', [instId]);
    if (institutions.length === 0) {
      return res.status(404).json({ success: false, message: 'Institution not found.' });
    }
    const inst = institutions[0];
    const [regs] = await pool.query('SELECT * FROM institution_registrations WHERE institution_id = ? ORDER BY submitted_at DESC LIMIT 1', [instId]);
    const registration = regs.length > 0 ? regs[0] : null;
    const [docs] = await pool.query('SELECT * FROM institution_documents WHERE institution_id = ? ORDER BY uploaded_at DESC', [instId]);
    const [staff] = await pool.query('SELECT * FROM institution_staff WHERE institution_id = ?', [instId]);
    const [[{ studentCount }]] = await pool.query('SELECT COUNT(*) as studentCount FROM students WHERE institution_id = ?', [instId]);
    const [[{ programCount }]] = await pool.query('SELECT COUNT(*) as programCount FROM programs WHERE institution_id = ?', [instId]);

    return res.json({
      success: true,
      data: {
        institution: inst,
        registration,
        documents: docs,
        staff,
        stats: { studentCount, programCount }
      }
    });
  } catch (error) {
    console.error('Admin fetch institution detail error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch institution details.' });
  }
});

// POST /api/admin/institutions/:id/status
router.post('/institutions/:id/status', async (req, res) => {
  const instId = req.params.id;
  const action = req.body.action; // 'approve' or 'reject'

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Invalid action.' });
  }

  const connection = await pool.getConnection();
  let released = false;
  const safeRelease = () => {
    if (!released) {
      released = true;
      try { connection.release(); } catch (_) {}
    }
  };
  try {
    await connection.beginTransaction();

    if (action === 'approve') {
      await connection.query('UPDATE institutions SET status = \'active\' WHERE institution_id = ?', [instId]);
      await connection.query(
        'UPDATE institution_registrations SET status = \'approved\', reviewed_at = CURRENT_TIMESTAMP WHERE institution_id = ?',
        [instId]
      );
      await connection.query(
        `UPDATE users u
         JOIN institution_registrations inst_r ON u.user_id = inst_r.submitted_by
         SET u.is_verified = 1
         WHERE inst_r.institution_id = ?`,
        [instId]
      );

      await connection.commit();

      emitUpdate('inst_status_updated', { institution_id: instId, action: 'approved' });

      return res.json({ success: true, message: 'Institution approved and activated successfully.' });
    } else {
      const [regRows] = await connection.query('SELECT submitted_by FROM institution_registrations WHERE institution_id = ?', [instId]);
      const submitterUserId = regRows.length > 0 ? regRows[0].submitted_by : null;

      const [docs] = await connection.query('SELECT file_path FROM institution_documents WHERE institution_id = ?', [instId]);
      for (const d of docs) {
        const filePath = resolveUploadedFilePath(d.file_path);
        if (filePath && fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (e) { console.error('Error unlinking institution file:', e); }
        }
      }

      await connection.query('DELETE FROM institution_documents WHERE institution_id = ?', [instId]);
      await connection.query('DELETE FROM institution_registrations WHERE institution_id = ?', [instId]);
      await connection.query('DELETE FROM entity_registrations WHERE entity_type = \'institution\' AND entity_id = ?', [instId]);
      await connection.query('DELETE FROM institution_job_approvals WHERE institution_id = ?', [instId]);
      await connection.query('DELETE FROM institution_staff WHERE institution_id = ?', [instId]);
      await connection.query('DELETE FROM access_codes WHERE institution_id = ?', [instId]);
      await connection.query('DELETE FROM programs WHERE institution_id = ?', [instId]);
      await connection.query('DELETE FROM institutions WHERE institution_id = ?', [instId]);

      if (submitterUserId) {
        await connection.query('DELETE FROM users WHERE user_id = ? AND is_verified = 0', [submitterUserId]);
      }

      await connection.commit();

      emitUpdate('inst_status_updated', { institution_id: instId, action: 'rejected' });

      return res.json({
        success: true,
        message: 'Institution registration rejected and applicant data deleted. The institution can now re-register without duplicate entry conflicts.'
      });
    }
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    console.error('Admin update institution error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update institution status: ' + error.message });
  } finally {
    safeRelease();
  }
});

// GET /api/admin/organizations
router.get('/organizations', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ho.*, oreg.submitted_at, oreg.status as reg_status,
              COALESCE(jc.job_count, 0) as job_count,
              COALESCE(oc.intern_count, 0) as intern_count,
              COALESCE(dc.doc_count, 0) as doc_count
       FROM hiring_organizations ho
       LEFT JOIN organization_registrations oreg ON ho.organization_id = oreg.organization_id
       LEFT JOIN (
           SELECT organization_id, COUNT(*) as job_count
           FROM job_postings
           GROUP BY organization_id
       ) jc ON ho.organization_id = jc.organization_id
       LEFT JOIN (
           SELECT organization_id, COUNT(*) as intern_count
           FROM ojt_records
           GROUP BY organization_id
       ) oc ON ho.organization_id = oc.organization_id
       LEFT JOIN (
           SELECT organization_id, COUNT(*) as doc_count
           FROM organization_documents
           GROUP BY organization_id
       ) dc ON ho.organization_id = dc.organization_id
       ORDER BY (CASE WHEN ho.status = 'pending' THEN 0 ELSE 1 END), ho.created_at DESC`
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Admin fetch organizations error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch organizations.' });
  }
});

// GET /api/admin/organizations/:id
router.get('/organizations/:id', async (req, res) => {
  const orgId = req.params.id;
  try {
    const [orgRows] = await pool.query('SELECT * FROM hiring_organizations WHERE organization_id = ?', [orgId]);
    if (orgRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Organization not found.' });
    }
    const org = orgRows[0];

    const [regRows] = await pool.query(
      `SELECT oreg.*, u.email as submitter_email, u.created_at as user_created_at
       FROM organization_registrations oreg
       LEFT JOIN users u ON oreg.submitted_by = u.user_id
       WHERE oreg.organization_id = ?
       ORDER BY oreg.submitted_at DESC LIMIT 1`,
      [orgId]
    );
    const registration = regRows.length > 0 ? regRows[0] : null;

    const [docs] = await pool.query(
      `SELECT document_id, document_type, document_name, file_path, file_name, verified, uploaded_at
       FROM organization_documents
       WHERE organization_id = ?
       ORDER BY uploaded_at DESC`,
      [orgId]
    );

    const [staff] = await pool.query(
      `SELECT os.org_staff_id, os.first_name, os.last_name, os.position, os.department, os.contact_number, os.is_verified, os.created_at,
              u.email
       FROM organization_staff os
       LEFT JOIN users u ON os.user_id = u.user_id
       WHERE os.organization_id = ?
       ORDER BY os.created_at DESC`,
      [orgId]
    );

    const [[{ jobCount }]] = await pool.query(
      'SELECT COUNT(*) as jobCount FROM job_postings WHERE organization_id = ?', [orgId]
    );
    const [[{ internCount }]] = await pool.query(
      'SELECT COUNT(*) as internCount FROM ojt_records WHERE organization_id = ?', [orgId]
    );

    return res.json({
      success: true,
      data: {
        organization: org,
        registration,
        documents: docs,
        staff,
        stats: { jobCount, internCount }
      }
    });
  } catch (error) {
    console.error('Admin fetch organization detail error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch organization details.' });
  }
});

// POST /api/admin/organizations/:id/status
router.post('/organizations/:id/status', async (req, res) => {
  const orgId = req.params.id;
  const action = req.body.action; // 'approve' or 'reject'

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Invalid action.' });
  }

  const connection = await pool.getConnection();
  let released = false;
  const safeRelease = () => {
    if (!released) {
      released = true;
      try { connection.release(); } catch (_) {}
    }
  };
  try {
    await connection.beginTransaction();

    if (action === 'approve') {
      await connection.query('UPDATE hiring_organizations SET status = \'active\' WHERE organization_id = ?', [orgId]);
      await connection.query(
        'UPDATE organization_registrations SET status = \'approved\', reviewed_at = CURRENT_TIMESTAMP WHERE organization_id = ?',
        [orgId]
      );
      await connection.query(
        `UPDATE users u
         JOIN organization_registrations org_r ON u.user_id = org_r.submitted_by
         SET u.is_verified = 1
         WHERE org_r.organization_id = ?`,
        [orgId]
      );
      await connection.query('UPDATE organization_documents SET verified = 1 WHERE organization_id = ?', [orgId]);

      await connection.commit();

      emitUpdate('org_status_updated', { organization_id: orgId, action: 'approved' });

      return res.json({ success: true, message: 'Organization approved and account verified successfully.' });
    } else {
      const [docs] = await connection.query('SELECT file_path FROM organization_documents WHERE organization_id = ?', [orgId]);
      for (const d of docs) {
        const filePath = resolveUploadedFilePath(d.file_path);
        if (filePath && fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch (e) { console.error('Error unlinking org file:', e); }
        }
      }

      const [regRows] = await connection.query('SELECT submitted_by FROM organization_registrations WHERE organization_id = ?', [orgId]);
      const submitterUserId = regRows.length > 0 ? regRows[0].submitted_by : null;

      await connection.query('DELETE FROM organization_documents WHERE organization_id = ?', [orgId]);
      await connection.query('DELETE FROM organization_registrations WHERE organization_id = ?', [orgId]);
      await connection.query('DELETE FROM entity_registrations WHERE entity_type = \'organization\' AND entity_id = ?', [orgId]);
      await connection.query('DELETE FROM organization_staff WHERE organization_id = ?', [orgId]);
      await connection.query('DELETE FROM organization_warnings WHERE organization_id = ?', [orgId]);
      await connection.query('DELETE FROM organization_suspensions WHERE organization_id = ?', [orgId]);
      await connection.query('DELETE FROM organization_status_history WHERE organization_id = ?', [orgId]);
      await connection.query('DELETE FROM job_postings WHERE organization_id = ?', [orgId]);
      await connection.query('DELETE FROM hiring_organizations WHERE organization_id = ?', [orgId]);

      if (submitterUserId) {
        await connection.query('DELETE FROM users WHERE user_id = ? AND is_verified = 0', [submitterUserId]);
      }

      await connection.commit();

      emitUpdate('org_status_updated', { organization_id: orgId, action: 'rejected' });

      return res.json({
        success: true,
        message: 'Organization registration rejected and applicant account permanently purged.'
      });
    }
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    console.error('Admin update organization error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process organization status: ' + error.message });
  } finally {
    safeRelease();
  }
});

// Helper to look up document metadata from institution_documents or organization_documents
const getDocumentRecord = async (docId, docType) => {
  if (docType === 'institution') {
    const [docs] = await pool.query('SELECT * FROM institution_documents WHERE document_id = ?', [docId]);
    if (docs.length > 0) return { doc: docs[0], actualType: 'institution' };
  } else if (docType === 'organization') {
    const [docs] = await pool.query('SELECT * FROM organization_documents WHERE document_id = ?', [docId]);
    if (docs.length > 0) return { doc: docs[0], actualType: 'organization' };
  } else {
    const [orgDocs] = await pool.query('SELECT * FROM organization_documents WHERE document_id = ?', [docId]);
    if (orgDocs.length > 0) return { doc: orgDocs[0], actualType: 'organization' };
    const [instDocs] = await pool.query('SELECT * FROM institution_documents WHERE document_id = ?', [docId]);
    if (instDocs.length > 0) return { doc: instDocs[0], actualType: 'institution' };
  }
  return { doc: null, actualType: null };
};

// GET /api/admin/documents/:id/download (Supports both organization and institution documents)
router.get('/documents/:id/download', async (req, res) => {
  const docId = req.params.id;
  const docType = req.query.type;
  try {
    const { doc } = await getDocumentRecord(docId, docType);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const resDoc = await fetchDocumentResource(doc);

    if (resDoc.type === 'url') {
      return res.redirect(resDoc.url);
    }

    if (resDoc.type === 'self_declared') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="accreditation_reference.txt"');
      return res.send(`Government Accreditation Reference: ${resDoc.ref}\nDocument Name: ${doc.document_name || 'Accreditation'}\nRecord ID: #${doc.document_id}\nUploaded At: ${doc.uploaded_at || 'N/A'}`);
    }

    if (resDoc.type === 'file') {
      const downloadName = resDoc.fileName || `${doc.document_type || 'document'}${resDoc.ext || '.pdf'}`;
      res.setHeader('Content-Type', resDoc.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`);
      return res.send(resDoc.buffer);
    }

    return res.status(404).json({ success: false, message: 'Document file not found on server storage.' });
  } catch (error) {
    console.error('Download document error:', error);
    return res.status(500).json({ success: false, message: 'Could not download document: ' + error.message });
  }
});

// GET /api/admin/documents/:id/view (Supports both organization and institution documents)
router.get('/documents/:id/view', async (req, res) => {
  const docId = req.params.id;
  const docType = req.query.type;
  const isRaw = req.query.raw === 'true' || req.query.raw === '1';

  try {
    const { doc } = await getDocumentRecord(docId, docType);
    if (!doc) {
      return res.status(404).send(renderMissingDocHtml({
        docName: 'Unknown Document',
        fileName: 'Not found',
        filePath: 'N/A',
        doc: { uploaded_at: null }
      }));
    }

    const resDoc = await fetchDocumentResource(doc);

    // 1. External URLs
    if (resDoc.type === 'url') {
      return res.redirect(resDoc.url);
    }

    // 2. Self-Declared Government Permits
    if (resDoc.type === 'self_declared') {
      return res.send(renderSelfDeclaredProofHtml({
        docName: doc.document_name || 'Government Accreditation Record',
        refNumber: resDoc.ref,
        doc
      }));
    }

    // 3. Local disk or stored_uploads file
    if (resDoc.type === 'file') {
      const ext = resDoc.ext;
      const downloadUrl = `/api/admin/documents/${doc.document_id}/download?type=${docType || ''}&token=${encodeURIComponent(req.query.token || req.sessionToken || '')}`;

      // A) Word Documents (.docx, .doc)
      if ((ext === '.docx' || ext === '.doc') && !isRaw) {
        let textContent = null;
        if (ext === '.docx') {
          try {
            textContent = extractDocxText(resDoc.buffer);
          } catch (tErr) {
            console.warn('[Doc Preview] Text extraction warning:', tErr.message);
          }
        }

        const html = renderDocxPreviewHtml({
          title: doc.document_name || resDoc.fileName,
          docName: doc.document_name || 'Accreditation Softcopy',
          fileName: resDoc.fileName,
          fileSize: resDoc.fileSize,
          uploadedAt: doc.uploaded_at,
          textContent,
          downloadUrl
        });

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      }

      // B) Standard Embeddable Documents (PDF, Images, or Raw Mode)
      const mimeTypes = {
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.doc': 'application/msword'
      };

      const contentType = resDoc.mimeType || mimeTypes[ext] || 'application/octet-stream';
      const disposition = isRaw ? 'attachment' : 'inline';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(resDoc.fileName)}"`);
      return res.send(resDoc.buffer);
    }

    // 4. Missing file fallback
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(404).send(renderMissingDocHtml({
      docName: doc.document_name || doc.document_type || 'Accreditation Softcopy',
      fileName: doc.file_name || path.basename(doc.file_path || ''),
      filePath: doc.file_path,
      doc
    }));
  } catch (error) {
    console.error('View document error:', error);
    return res.status(500).send(`
      <div style="font-family: sans-serif; padding: 2rem; text-align: center; color: #dc2626;">
        <h3>Could not load document preview</h3>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `);
  }
});

// GET /api/admin/institution-documents/:id/view (Legacy alias)
router.get('/institution-documents/:id/view', async (req, res) => {
  req.query.type = 'institution';
  const docId = req.params.id;
  try {
    const [docs] = await pool.query('SELECT * FROM institution_documents WHERE document_id = ?', [docId]);
    if (docs.length === 0) {
      return res.status(404).send(renderMissingDocHtml({
        docName: 'Institution Accreditation Softcopy',
        fileName: 'Not found',
        filePath: 'N/A',
        doc: { uploaded_at: null }
      }));
    }
    const doc = docs[0];
    const resDoc = await fetchDocumentResource(doc);

    if (resDoc.type === 'url') return res.redirect(resDoc.url);
    if (resDoc.type === 'self_declared') {
      return res.send(renderSelfDeclaredProofHtml({ docName: doc.document_name, refNumber: resDoc.ref, doc }));
    }

    if (resDoc.type === 'file') {
      const ext = resDoc.ext;
      const downloadUrl = `/api/admin/institution-documents/${doc.document_id}/download?token=${encodeURIComponent(req.query.token || '')}`;

      if ((ext === '.docx' || ext === '.doc') && req.query.raw !== '1') {
        const textContent = ext === '.docx' ? extractDocxText(resDoc.buffer) : null;
        const html = renderDocxPreviewHtml({
          title: doc.document_name,
          docName: doc.document_name,
          fileName: resDoc.fileName,
          fileSize: resDoc.fileSize,
          uploadedAt: doc.uploaded_at,
          textContent,
          downloadUrl
        });
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
      }

      const mimeTypes = {
        '.pdf': 'application/pdf',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webp': 'image/webp',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.doc': 'application/msword'
      };
      res.setHeader('Content-Type', resDoc.mimeType || mimeTypes[ext] || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(resDoc.fileName)}"`);
      return res.send(resDoc.buffer);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(404).send(renderMissingDocHtml({
      docName: doc.document_name,
      fileName: doc.file_name || path.basename(doc.file_path || ''),
      filePath: doc.file_path,
      doc
    }));
  } catch (error) {
    console.error('View institution document error:', error);
    return res.status(500).json({ success: false, message: 'Could not view document: ' + error.message });
  }
});

// GET /api/admin/institution-documents/:id/download (Legacy alias)
router.get('/institution-documents/:id/download', async (req, res) => {
  const docId = req.params.id;
  try {
    const [docs] = await pool.query('SELECT * FROM institution_documents WHERE document_id = ?', [docId]);
    if (docs.length === 0) {
      return res.status(404).json({ success: false, message: 'Institution document not found.' });
    }
    const doc = docs[0];
    const resDoc = await fetchDocumentResource(doc);

    if (resDoc.type === 'url') return res.redirect(resDoc.url);
    if (resDoc.type === 'self_declared') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="accreditation_reference.txt"');
      return res.send(`Government Accreditation Reference: ${resDoc.ref}\nDocument Name: ${doc.document_name}\nRecord ID: #${doc.document_id}`);
    }

    if (resDoc.type === 'file') {
      const downloadName = resDoc.fileName || `${doc.document_type || 'document'}${resDoc.ext || '.pdf'}`;
      res.setHeader('Content-Type', resDoc.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(downloadName)}"`);
      return res.send(resDoc.buffer);
    }

    return res.status(404).json({ success: false, message: 'Document file not found on server storage.' });
  } catch (error) {
    console.error('Download institution document error:', error);
    return res.status(500).json({ success: false, message: 'Could not download document.' });
  }
});

// GET /api/admin/jobs
router.get('/jobs', async (req, res) => {
  try {
    const [jobs] = await pool.query(
      `SELECT jp.*, ho.organization_name, ho.industry,
              (SELECT COUNT(*) FROM job_applications ja WHERE ja.job_id = jp.job_id) as applicant_count
       FROM job_postings jp
       JOIN hiring_organizations ho ON jp.organization_id = ho.organization_id
       ORDER BY jp.created_at DESC`
    );
    return res.json({ success: true, data: jobs });
  } catch (error) {
    console.error('Admin fetch jobs error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch jobs.' });
  }
});

// PUT /api/admin/jobs/:id/status
router.put('/jobs/:id/status', async (req, res) => {
  const jobId = req.params.id;
  const { status } = req.body;

  try {
    await pool.query('UPDATE job_postings SET status = ? WHERE job_id = ?', [status, jobId]);
    emitUpdate('job_status_updated', { job_id: jobId, status });
    return res.json({ success: true, message: `Job posting marked as ${status}.` });
  } catch (error) {
    console.error('Admin update job status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update job status.' });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  const { role } = req.query;
  try {
    let whereClause = '';
    let params = [];
    if (role) {
      whereClause = 'WHERE r.role_name = ?';
      params = [role];
    }

    const [[{ totalUsers }]] = await pool.query(
      `SELECT COUNT(*) as totalUsers FROM users ${role ? 'u JOIN roles r ON u.role_id = r.role_id WHERE r.role_name = ?' : ''}`,
      role ? [role] : []
    );

    const [users] = await pool.query(
      `SELECT u.user_id, u.email, u.role_id, u.is_active, u.is_verified, u.last_login_at, u.created_at,
              r.role_name,
              s.first_name as student_first_name, s.last_name as student_last_name, s.student_number,
              ho.organization_name,
              i.institution_name
       FROM users u
       JOIN roles r ON u.role_id = r.role_id
       LEFT JOIN students s ON u.user_id = s.user_id
       LEFT JOIN hiring_organizations ho ON u.email = ho.contact_email
       LEFT JOIN institutions i ON u.email = i.contact_email
       ${whereClause}
       ORDER BY u.created_at DESC`,
      params
    );

    const [roles] = await pool.query('SELECT role_id, role_name FROM roles ORDER BY role_name ASC');

    return res.json({ success: true, data: { users, roles, totalUsers: Number(totalUsers || 0) } });
  } catch (error) {
    console.error('Admin fetch users error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch users.' });
  }
});

// PUT /api/admin/users/:id/status
router.put('/users/:id/status', async (req, res) => {
  const userId = req.params.id;
  const { action } = req.body;

  if (!['suspend', 'activate'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Invalid action.' });
  }

  try {
    const isActive = action === 'activate' ? 1 : 0;
    await pool.query('UPDATE users SET is_active = ? WHERE user_id = ?', [isActive, userId]);

    // Log admin action in audit trail
    const clientIp = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '127.0.0.1';
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, created_at)
       VALUES (?, ?, 'users', ?, ?, ?, CURRENT_TIMESTAMP)`,
      [req.user.user_id, `user_${action}d`, userId, JSON.stringify({ target_user_id: userId, status: action }), clientIp]
    );

    emitUpdate('user_status_updated', { user_id: userId, action });
    return res.json({ success: true, message: `User account ${action}d successfully.` });
  } catch (error) {
    console.error('Toggle user status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user status.' });
  }
});

// --- AUDIT LOGS ---
router.get('/audit-logs', async (req, res) => {
  const { action, table_name, limit = 100, user_id, date_from, date_to, search } = req.query;

  try {
    let query = `
      SELECT al.*, u.email as user_email, u.is_active as user_is_active, u.last_login_at,
             r.role_name,
             s.first_name as student_first_name, s.last_name as student_last_name,
             ho.organization_name, i.institution_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.user_id
      LEFT JOIN roles r ON u.role_id = r.role_id
      LEFT JOIN students s ON u.user_id = s.user_id
      LEFT JOIN hiring_organizations ho ON u.email = ho.contact_email
      LEFT JOIN institutions i ON u.email = i.contact_email
      WHERE 1=1
    `;
    const params = [];

    if (action) {
      query += ' AND al.action LIKE ?';
      params.push(`%${action}%`);
    }
    if (table_name) {
      query += ' AND al.table_name = ?';
      params.push(table_name);
    }
    if (user_id) {
      query += ' AND al.user_id = ?';
      params.push(parseInt(user_id));
    }
    if (date_from) {
      query += ' AND al.created_at >= ?';
      params.push(date_from);
    }
    if (date_to) {
      query += ' AND al.created_at <= ?';
      params.push(date_to + ' 23:59:59');
    }
    if (search) {
      query += ' AND (u.email LIKE ? OR al.action LIKE ? OR al.table_name LIKE ? OR al.new_values LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY al.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const [logs] = await pool.query(query, params);

    // Get distinct actions and tables for filter dropdowns
    const [actions] = await pool.query('SELECT DISTINCT action FROM audit_logs ORDER BY action ASC');
    const [tables] = await pool.query('SELECT DISTINCT table_name FROM audit_logs WHERE table_name IS NOT NULL ORDER BY table_name ASC');

    return res.json({
      success: true,
      data: logs,
      meta: {
        availableActions: actions.map(a => a.action),
        availableTables: tables.map(t => t.table_name)
      }
    });
  } catch (error) {
    console.error('Fetch audit logs error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch audit logs.' });
  }
});

// --- USER SESSIONS & ACTIVITY OVERVIEW ---
router.get('/audit-logs/user-sessions', async (req, res) => {
  try {
    // Get all users with their login activity summary
    const [userSessions] = await pool.query(`
      WITH user_stats AS (
        SELECT user_id, 
               SUM(CASE WHEN action = 'user_login' THEN 1 ELSE 0 END) as total_logins,
               MIN(CASE WHEN action = 'user_login' THEN created_at END) as first_login_at,
               MAX(CASE WHEN action = 'user_login' THEN created_at END) as latest_login_at,
               SUM(CASE WHEN action != 'user_login' THEN 1 ELSE 0 END) as total_actions,
               MAX(CASE WHEN action != 'user_login' THEN created_at END) as last_action_at
        FROM audit_logs
        GROUP BY user_id
      ),
      last_ip AS (
        SELECT user_id, ip_address as last_ip_address
        FROM (
          SELECT user_id, ip_address, ROW_NUMBER() OVER(PARTITION BY user_id ORDER BY created_at DESC) as rn
          FROM audit_logs
          WHERE action = 'user_login'
        ) sub
        WHERE rn = 1
      )
      SELECT 
        u.user_id, u.email, u.is_active, u.is_verified, u.last_login_at, u.created_at as registered_at,
        r.role_name,
        s.first_name as student_first_name, s.last_name as student_last_name,
        ho.organization_name, i.institution_name,
        COALESCE(us.total_logins, 0) as total_logins,
        us.first_login_at,
        us.latest_login_at,
        COALESCE(us.total_actions, 0) as total_actions,
        us.last_action_at,
        lip.last_ip_address
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      LEFT JOIN students s ON u.user_id = s.user_id
      LEFT JOIN hiring_organizations ho ON u.email = ho.contact_email
      LEFT JOIN institutions i ON u.email = i.contact_email
      LEFT JOIN user_stats us ON u.user_id = us.user_id
      LEFT JOIN last_ip lip ON u.user_id = lip.user_id
      ORDER BY u.last_login_at IS NULL, u.last_login_at DESC
    `);

    // Summary statistics
    const [stats] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE is_active = 1) as active_users,
        (SELECT COUNT(*) FROM users WHERE is_active = 0) as inactive_users,
        (SELECT COUNT(DISTINCT user_id) FROM audit_logs WHERE action = 'user_login' AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as logins_today,
        (SELECT COUNT(DISTINCT user_id) FROM audit_logs WHERE action = 'user_login' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as logins_this_week,
        (SELECT COUNT(*) FROM audit_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as events_today,
        (SELECT COUNT(*) FROM audit_logs) as total_events
    `);

    return res.json({
      success: true,
      data: {
        sessions: userSessions,
        stats: stats[0] || {}
      }
    });
  } catch (error) {
    console.error('Fetch user sessions error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch user sessions.' });
  }
});

// --- USER ACTIVITY HISTORY (per-user drill-down) ---
router.get('/audit-logs/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const { limit = 50 } = req.query;
  try {
    const [activities] = await pool.query(`
      SELECT al.*, u.email as user_email, r.role_name
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.user_id
      LEFT JOIN roles r ON u.role_id = r.role_id
      WHERE al.user_id = ?
      ORDER BY al.created_at DESC
      LIMIT ?
    `, [parseInt(userId), parseInt(limit)]);

    const [userInfo] = await pool.query(`
      SELECT u.user_id, u.email, u.is_active, u.is_verified, u.last_login_at, u.created_at,
             r.role_name
      FROM users u JOIN roles r ON u.role_id = r.role_id
      WHERE u.user_id = ?
    `, [parseInt(userId)]);

    return res.json({
      success: true,
      data: {
        user: userInfo[0] || null,
        activities
      }
    });
  } catch (error) {
    console.error('Fetch user activity error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch user activity.' });
  }
});

// --- COMPLAINTS & ACCOUNTABILITY (Step 5: Admin Access Gated by Institution Reports) ---
router.get('/complaints', async (req, res) => {
  try {
    // 1. Institution-submitted reports referencing student grievances (Step 5a)
    const [institutionReports] = await pool.query(
      `SELECT ir.*,
              i.institution_name, i.institution_code,
              ho.organization_name, ho.contact_email as org_email,
              cc.category_name,
              u.email as reporter_email,
              (
                SELECT COUNT(*) 
                FROM institution_reports sub_ir 
                WHERE sub_ir.institution_id = ir.institution_id 
                  AND sub_ir.organization_id = ir.organization_id
              ) as institution_org_report_count
       FROM institution_reports ir
       JOIN institutions i ON ir.institution_id = i.institution_id
       JOIN hiring_organizations ho ON ir.organization_id = ho.organization_id
       JOIN complaint_categories cc ON ir.category_id = cc.category_id
       JOIN users u ON ir.reported_by = u.user_id
       ORDER BY ir.created_at DESC`
    );

    // 2. Escalated Accident Reports (Step 5b: Read-only access to serious incidents escalated through Institution)
    const [escalatedAccidents] = await pool.query(
      `SELECT ar.*,
              c.subject, c.description as complaint_description, c.status as complaint_status,
              ho.organization_name, ho.contact_email as org_email,
              s.first_name, s.last_name, s.student_number,
              i.institution_name,
              IF(ar.admin_read_at IS NOT NULL, 1, 0) as is_read
       FROM accident_reports ar
       JOIN complaints c ON ar.complaint_id = c.complaint_id
       JOIN hiring_organizations ho ON ar.organization_id = ho.organization_id
       JOIN students s ON ar.student_id = s.student_id
       LEFT JOIN institutions i ON s.institution_id = i.institution_id
       WHERE c.status IN ('admin_review', 'institution_review', 'resolved', 'dismissed')
       ORDER BY ar.created_at DESC`
    );

    // 3. Official warnings and suspensions on record
    const [warnings] = await pool.query(
      `SELECT ow.*, ho.organization_name, u.email as issued_by_email
       FROM organization_warnings ow
       JOIN hiring_organizations ho ON ow.organization_id = ho.organization_id
       LEFT JOIN users u ON ow.issued_by = u.user_id
       ORDER BY ow.issued_at DESC`
    );

    const [suspensions] = await pool.query(
      `SELECT os.*, ho.organization_name, u.email as issued_by_email
       FROM organization_suspensions os
       JOIN hiring_organizations ho ON os.organization_id = ho.organization_id
       LEFT JOIN users u ON os.issued_by = u.user_id
       ORDER BY os.created_at DESC`
    );

    return res.json({
      success: true,
      data: {
        institutionReports,
        escalatedAccidents,
        warnings,
        suspensions
      }
    });
  } catch (error) {
    console.error('Fetch admin complaints error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch institution reports.' });
  }
});

// PATCH /api/admin/complaints/accidents/:id/read - Toggle or Mark an accident report as read
router.patch('/complaints/accidents/:id/read', async (req, res) => {
  const accidentId = req.params.id;
  const { mark_read } = req.body;

  try {
    const [rows] = await pool.query('SELECT accident_id, admin_read_at FROM accident_reports WHERE accident_id = ?', [accidentId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Accident report not found.' });

    let newReadAt = null;
    if (mark_read === true) {
      newReadAt = new Date();
    } else if (mark_read === false) {
      newReadAt = null;
    } else {
      newReadAt = rows[0].admin_read_at ? null : new Date();
    }

    await pool.query('UPDATE accident_reports SET admin_read_at = ? WHERE accident_id = ?', [newReadAt, accidentId]);

    emitUpdate('complaint_updated', { accident_id: accidentId, role: 'system_admin' });

    return res.json({
      success: true,
      message: newReadAt ? 'Accident report marked as read.' : 'Accident report marked as unread.',
      is_read: Boolean(newReadAt),
      admin_read_at: newReadAt
    });
  } catch (error) {
    console.error('Update accident read status error:', error);
    return res.status(500).json({ success: false, message: 'Could not update accident read status.' });
  }
});

// POST /api/admin/complaints/accidents/read-all - Mark all escalated accident reports as read
router.post('/complaints/accidents/read-all', async (req, res) => {
  try {
    await pool.query('UPDATE accident_reports SET admin_read_at = NOW() WHERE admin_read_at IS NULL');
    emitUpdate('complaint_updated', { role: 'system_admin' });
    return res.json({ success: true, message: 'All accident reports marked as read.' });
  } catch (error) {
    console.error('Mark all accidents read error:', error);
    return res.status(500).json({ success: false, message: 'Could not mark all accidents as read.' });
  }
});

// POST /api/admin/complaints/reports/:id/resolve - Step 3 & 5: Resolve institution report with repeat-offense trigger
router.post('/complaints/reports/:id/resolve', async (req, res) => {
  const reportId = req.params.id;
  const { status, resolution_notes, sanction_type, days } = req.body;

  try {
    const [reports] = await pool.query(
      `SELECT ir.*, ho.organization_name, i.institution_name
       FROM institution_reports ir
       JOIN hiring_organizations ho ON ir.organization_id = ho.organization_id
       JOIN institutions i ON ir.institution_id = i.institution_id
       WHERE ir.report_id = ?`,
      [reportId]
    );
    if (reports.length === 0) return res.status(404).json({ success: false, message: 'Institution report not found.' });

    const report = reports[0];

    // Compute repeat offense count for this specific institution against this organization
    const [[{ repeatCount }]] = await pool.query(
      `SELECT COUNT(*) as repeatCount 
       FROM institution_reports 
       WHERE institution_id = ? AND organization_id = ?`,
      [report.institution_id, report.organization_id]
    );

    // Enforcement policy check: Repeat-offense trigger
    if (sanction_type === 'warning' || sanction_type === 'suspension') {
      if (repeatCount < 2) {
        return res.status(400).json({
          success: false,
          message: `Repeat-Offense Policy Restriction: Administrative sanctions (Warning or Suspension) against ${report.organization_name} can only be issued if the same Institution (${report.institution_name}) has reported the organization multiple times. Current reports on record: ${repeatCount}. This single report is logged under observation.`
        });
      }
    }

    await pool.query(
      'UPDATE institution_reports SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE report_id = ?',
      [status === 'resolved' ? 'action_taken' : 'closed', reportId]
    );

    await pool.query(
      'UPDATE complaints SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE complaint_id = ?',
      [status || 'resolved', report.complaint_id]
    );

    if (sanction_type === 'warning') {
      await pool.query(
        `INSERT INTO organization_warnings (organization_id, complaint_id, issued_by, reason, issued_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [report.organization_id, report.complaint_id, req.user.user_id, resolution_notes || `Repeat-offense sanction issued based on multiple reports from ${report.institution_name}.`]
      );

      // Notify Organization HR
      const [orgUsers] = await pool.query(
        'SELECT submitted_by as user_id FROM organization_registrations WHERE organization_id = ?',
        [report.organization_id]
      );
      for (const u of orgUsers) {
        if (u.user_id) {
          await sendNotification({
            userId: u.user_id,
            senderId: req.user.user_id,
            senderName: 'System Administrator',
            title: 'Official Administrative Warning Issued',
            message: `An official administrative warning has been issued against your organization based on repeated compliance reports from ${report.institution_name}.`,
            type: 'complaint',
            link: '/dashboard/organization/grievances'
          });
        }
      }
    } else if (sanction_type === 'suspension') {
      const suspensionDays = parseInt(days || 30, 10);
      await pool.query(
        `INSERT INTO organization_suspensions (organization_id, complaint_id, issued_by, reason, start_date, end_date, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL ? DAY), 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [report.organization_id, report.complaint_id, req.user.user_id, resolution_notes || `Repeat-offense suspension issued based on multiple reports from ${report.institution_name}.`, suspensionDays]
      );

      await pool.query('UPDATE hiring_organizations SET status = \'suspended\' WHERE organization_id = ?', [report.organization_id]);

      // Notify Organization HR
      const [orgUsers] = await pool.query(
        'SELECT submitted_by as user_id FROM organization_registrations WHERE organization_id = ?',
        [report.organization_id]
      );
      for (const u of orgUsers) {
        if (u.user_id) {
          await sendNotification({
            userId: u.user_id,
            senderId: req.user.user_id,
            senderName: 'System Administrator',
            title: 'Account Suspension Issued',
            message: `Your organization account has been suspended for ${suspensionDays} days due to repeated compliance violations reported by ${report.institution_name}.`,
            type: 'system',
            link: '/dashboard/organization/grievances'
          });
        }
      }
    }

    emitUpdate('complaint_resolved', { report_id: reportId, status });

    return res.json({
      success: true,
      message: `Institution report reviewed and concluded with status ${status}.`
    });
  } catch (error) {
    console.error('Resolve report error:', error);
    return res.status(500).json({ success: false, message: 'Failed to resolve report: ' + error.message });
  }
});

// --- COMPREHENSIVE CROSS-DISCIPLINE SKILL DEMAND ANALYTICS ---
router.get('/analytics/skills', async (req, res) => {
  try {
    const { discipline = 'all', program_code = 'all', search = '' } = req.query;

    // 1. Build Taxonomy Lookup from PROGRAM_SKILLS_CATALOG
    const skillTaxonomy = new Map(); // skill_name_lower -> { programs: Set, departments: Set }
    for (const [pCode, pData] of Object.entries(PROGRAM_SKILLS_CATALOG)) {
      for (const sk of pData.skills) {
        const lower = sk.name.toLowerCase().trim();
        if (!skillTaxonomy.has(lower)) {
          skillTaxonomy.set(lower, { programs: new Set(), departments: new Set() });
        }
        skillTaxonomy.get(lower).programs.add(pCode);
        skillTaxonomy.get(lower).departments.add(pData.department);
      }
    }

    // 2. Fetch distinct Academic Programs with active student & job counts
    const [dbPrograms] = await pool.query(`
      SELECT 
        p.program_code,
        MAX(p.program_name) as program_name,
        MAX(p.department) as department,
        COUNT(DISTINCT s.student_id) as student_count,
        COUNT(DISTINCT jrp.job_id) as job_count
      FROM programs p
      LEFT JOIN students s ON p.program_id = s.program_id
      LEFT JOIN job_required_programs jrp ON p.program_id = jrp.program_id
      GROUP BY p.program_code
      ORDER BY p.program_code ASC
    `);

    // 3. Fetch all active skills with job demand and student counts
    const [skillRows] = await pool.query(`
      SELECT 
        s.skill_id, 
        s.skill_name,
        sc.category_name,
        COALESCE(jCount.cnt, 0) as demand_count,
        COALESCE(sCount.cnt, 0) as student_count,
        GROUP_CONCAT(DISTINCT p.program_code ORDER BY p.program_code SEPARATOR ', ') as db_programs,
        GROUP_CONCAT(DISTINCT p.department ORDER BY p.department SEPARATOR ', ') as db_departments
      FROM skills s
      LEFT JOIN skill_categories sc ON s.category_id = sc.category_id
      LEFT JOIN (
        SELECT skill_id, COUNT(DISTINCT job_id) as cnt 
        FROM job_required_skills 
        GROUP BY skill_id
      ) jCount ON s.skill_id = jCount.skill_id
      LEFT JOIN (
        SELECT skill_id, COUNT(DISTINCT student_id) as cnt 
        FROM student_skills 
        GROUP BY skill_id
      ) sCount ON s.skill_id = sCount.skill_id
      LEFT JOIN job_required_skills jrs ON s.skill_id = jrs.skill_id
      LEFT JOIN job_required_programs jrp ON jrs.job_id = jrp.job_id
      LEFT JOIN programs p ON jrp.program_id = p.program_id
      GROUP BY s.skill_id, s.skill_name, sc.category_name, jCount.cnt, sCount.cnt
      HAVING demand_count > 0 OR student_count > 0
      ORDER BY demand_count DESC, student_count DESC
    `);

    // 4. Enrich skills with cross-discipline academic taxonomy
    const allEnrichedSkills = skillRows.map(sk => {
      const lower = sk.skill_name.toLowerCase().trim();
      const tax = skillTaxonomy.get(lower);

      const progsSet = new Set(sk.db_programs ? sk.db_programs.split(', ') : []);
      const deptsSet = new Set(sk.db_departments ? sk.db_departments.split(', ') : []);

      if (tax) {
        tax.programs.forEach(p => progsSet.add(p));
        tax.departments.forEach(d => deptsSet.add(d));
      }

      // Fallback heuristics for unlinked skills
      if (deptsSet.size === 0) {
        if (/cad|revit|civil|structur|electr|mechanic/i.test(sk.skill_name)) deptsSet.add('Engineering & Architecture');
        else if (/patient|nurse|clinic|pharma|medic|health/i.test(sk.skill_name)) deptsSet.add('Health & Allied Sciences');
        else if (/hotel|kitchen|culinary|food|tourism|pms/i.test(sk.skill_name)) deptsSet.add('Hospitality & Tourism');
        else if (/audit|tax|account|financ|bank|quickbook/i.test(sk.skill_name)) deptsSet.add('Business & Accountancy');
        else if (/teach|lesson|curriculum|class|school|educat/i.test(sk.skill_name)) deptsSet.add('Education & Teacher Training');
        else if (/crime|fingerprint|police|forensic|blotter/i.test(sk.skill_name)) deptsSet.add('Criminology & Public Safety');
        else if (/design|figma|photo|illustrat|animat|video/i.test(sk.skill_name)) deptsSet.add('Arts, Design & Media');
        else if (/crop|agri|soil|pest|farm/i.test(sk.skill_name)) deptsSet.add('Agriculture & Environment');
        else deptsSet.add('Information Technology & Computing');
      }

      return {
        skill_id: sk.skill_id,
        skill_name: sk.skill_name,
        category_name: sk.category_name || 'Technical Skills',
        demand_count: Number(sk.demand_count) || 0,
        student_count: Number(sk.student_count) || 0,
        programs: Array.from(progsSet),
        departments: Array.from(deptsSet),
        primary_department: Array.from(deptsSet)[0] || 'General'
      };
    });

    // 5. Define Standard CHED Discipline Clusters
    const disciplineClusters = [
      { id: 'all', label: 'All Disciplines', deptName: 'All', icon: 'hub', color: 'text-vibrant-orange bg-orange-50 border-orange-200' },
      { id: 'computing', label: 'Computing & IT', deptName: 'Information Technology & Computing', icon: 'terminal', color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
      { id: 'business', label: 'Business & Accountancy', deptName: 'Business & Accountancy', icon: 'payments', color: 'text-blue-600 bg-blue-50 border-blue-200' },
      { id: 'engineering', label: 'Engineering & Architecture', deptName: 'Engineering & Architecture', icon: 'engineering', color: 'text-amber-600 bg-amber-50 border-amber-200' },
      { id: 'healthcare', label: 'Healthcare & Medical', deptName: 'Health & Allied Sciences', icon: 'health_and_safety', color: 'text-rose-600 bg-rose-50 border-rose-200' },
      { id: 'hospitality', label: 'Hospitality & Tourism', deptName: 'Hospitality & Tourism', icon: 'hotel', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
      { id: 'education', label: 'Teacher Education', deptName: 'Education & Teacher Training', icon: 'school', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
      { id: 'criminology', label: 'Criminal Justice', deptName: 'Criminology & Public Safety', icon: 'shield', color: 'text-slate-700 bg-slate-100 border-slate-300' },
      { id: 'arts', label: 'Arts & Multimedia', deptName: 'Arts, Design & Media', icon: 'palette', color: 'text-pink-600 bg-pink-50 border-pink-200' },
      { id: 'agriculture', label: 'Agriculture & Environment', deptName: 'Agriculture & Environment', icon: 'agriculture', color: 'text-lime-700 bg-lime-50 border-lime-200' },
      { id: 'social_sciences', label: 'Social Sciences', deptName: 'Humanities & Social Sciences', icon: 'psychology', color: 'text-teal-600 bg-teal-50 border-teal-200' },
      { id: 'maritime', label: 'Maritime Studies', deptName: 'Maritime Studies', icon: 'directions_boat', color: 'text-sky-700 bg-sky-50 border-sky-200' }
    ];

    // Compute Cross-Discipline Matrix & Cluster Stats
    const crossDisciplineMatrix = disciplineClusters.slice(1).map(c => {
      const matchingSkills = allEnrichedSkills.filter(s => 
        s.departments.some(d => d.toLowerCase().includes(c.deptName.toLowerCase()) || c.deptName.toLowerCase().includes(d.toLowerCase()))
      );

      const topDemand = matchingSkills
        .filter(s => s.demand_count > 0)
        .sort((a, b) => b.demand_count - a.demand_count)
        .slice(0, 4);

      const topTalent = [...matchingSkills]
        .filter(s => s.student_count > 0)
        .sort((a, b) => b.student_count - a.student_count)
        .slice(0, 4);

      const totalOpenings = topDemand.reduce((sum, s) => sum + s.demand_count, 0);
      const totalStudents = matchingSkills.reduce((sum, s) => sum + s.student_count, 0);

      return {
        id: c.id,
        label: c.label,
        deptName: c.deptName,
        icon: c.icon,
        color: c.color,
        total_openings: totalOpenings,
        total_students: totalStudents,
        skills_count: matchingSkills.length,
        top_demand: topDemand,
        top_talent: topTalent
      };
    });

    // 6. Apply Selected Filters
    let filteredSkills = allEnrichedSkills;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      filteredSkills = filteredSkills.filter(s => 
        s.skill_name.toLowerCase().includes(q) ||
        s.programs.some(p => p.toLowerCase().includes(q)) ||
        s.departments.some(d => d.toLowerCase().includes(q))
      );
    }

    if (program_code && program_code !== 'all') {
      filteredSkills = filteredSkills.filter(s => 
        s.programs.includes(program_code)
      );
    } else if (discipline && discipline !== 'all') {
      const selectedCluster = disciplineClusters.find(c => c.id === discipline || c.deptName.toLowerCase() === discipline.toLowerCase());
      const targetDept = selectedCluster ? selectedCluster.deptName.toLowerCase() : discipline.toLowerCase();
      
      filteredSkills = filteredSkills.filter(s => 
        s.departments.some(d => d.toLowerCase().includes(targetDept) || targetDept.includes(d.toLowerCase()))
      );
    }

    // Top demanded skills for active filter
    const topSkills = [...filteredSkills]
      .filter(s => s.demand_count > 0)
      .sort((a, b) => b.demand_count - a.demand_count)
      .slice(0, 25);

    // If no demand count in this specific filter, show catalog skills with highest relevance
    const fallbackTopSkills = topSkills.length > 0 ? topSkills : filteredSkills.slice(0, 20);

    // Student Talent distribution for active filter
    const studentSkillsCount = [...filteredSkills]
      .filter(s => s.student_count > 0)
      .sort((a, b) => b.student_count - a.student_count)
      .slice(0, 25);

    // Total counts
    const [totalSkillsRow] = await pool.query('SELECT COUNT(*) as c FROM skills');
    const [totalJobsRow] = await pool.query("SELECT COUNT(*) as c FROM job_postings WHERE status = 'active'");
    const [totalStudentsRow] = await pool.query('SELECT COUNT(DISTINCT student_id) as c FROM student_skills');

    return res.json({
      success: true,
      data: {
        filter: {
          discipline,
          program_code,
          search
        },
        metrics: {
          total_skills: totalSkillsRow[0]?.c || allEnrichedSkills.length,
          total_programs: dbPrograms.length,
          total_disciplines: disciplineClusters.length - 1,
          total_jobs: totalJobsRow[0]?.c || 0,
          total_students_with_skills: totalStudentsRow[0]?.c || 0
        },
        disciplines: disciplineClusters,
        programs: dbPrograms,
        topSkills: fallbackTopSkills,
        studentSkillsCount,
        crossDisciplineMatrix
      }
    });
  } catch (error) {
    console.error('Fetch analytics error:', error);
    return res.status(500).json({ success: false, message: 'Could not fetch skill analytics: ' + error.message });
  }
});

// POST /api/admin/analytics/recalculate - Recalculate AI Career Matching weights & demand statistics
router.post('/analytics/recalculate', async (req, res) => {
  try {
    // 1. Gather weighted demand (job requirements x 3 + student skills)
    const [aggregatedDemand] = await pool.query(`
      SELECT 
        s.skill_id, 
        COALESCE(jCount.cnt, 0) * 3 + COALESCE(sCount.cnt, 0) as total_demand
      FROM skills s
      LEFT JOIN (
        SELECT skill_id, COUNT(*) as cnt FROM job_required_skills GROUP BY skill_id
      ) jCount ON s.skill_id = jCount.skill_id
      LEFT JOIN (
        SELECT skill_id, COUNT(*) as cnt FROM student_skills GROUP BY skill_id
      ) sCount ON s.skill_id = sCount.skill_id
      WHERE COALESCE(jCount.cnt, 0) > 0 OR COALESCE(sCount.cnt, 0) > 0
    `);

    // 2. Upsert into skill_demand_statistics
    for (const item of aggregatedDemand) {
      if (item.skill_id) {
        await pool.query(`
          INSERT INTO skill_demand_statistics (skill_id, period_start, period_end, demand_count, created_at, updated_at)
          VALUES (?, CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY), ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE demand_count = VALUES(demand_count), updated_at = CURRENT_TIMESTAMP
        `, [item.skill_id, Math.max(1, item.total_demand)]);
      }
    }

    // 3. Log audit action
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, new_values, created_at)
       VALUES (?, 'ai_skills_recalculated', 'skills', ?, CURRENT_TIMESTAMP)`,
      [req.user.user_id, JSON.stringify({ details: 'System-wide AI Curriculum and Demand Alignment Recalculated across all academic disciplines' })]
    );

    // 4. Emit live update event
    emitUpdate('ai_recommendations_updated', {
      timestamp: new Date().toISOString(),
      updatedBy: req.user.user_id
    });
    emitUpdate('dashboard_updated', { type: 'admin' });

    return res.json({
      success: true,
      message: 'AI Skill Demand Model & Curriculum Alignment successfully recalculated across all academic degree programs and disciplines!',
      data: {
        recalculatedAt: new Date().toISOString(),
        skillsEvaluated: aggregatedDemand.length
      }
    });
  } catch (error) {
    console.error('Admin recalculate analytics error:', error);
    return res.status(500).json({ success: false, message: 'Failed to recalculate AI analytics.' });
  }
});

// --- SYSTEM SETTINGS ---
router.get('/settings', async (req, res) => {
  try {
    const [settings] = await pool.query('SELECT * FROM system_settings ORDER BY setting_key ASC');
    return res.json({ success: true, data: settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not fetch system settings.' });
  }
});

router.put('/settings', async (req, res) => {
  const { setting_key, setting_value } = req.body;
  try {
    await pool.query(
      'UPDATE system_settings SET setting_value = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?',
      [setting_value, req.user.user_id, setting_key]
    );

    // Log settings change in audit trail
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, table_name, new_values, created_at)
       VALUES (?, 'settings_updated', 'system_settings', ?, CURRENT_TIMESTAMP)`,
      [req.user.user_id, JSON.stringify({ setting_key, setting_value })]
    );

    emitUpdate('settings_updated', { setting_key });
    return res.json({ success: true, message: 'System setting updated.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update setting.' });
  }
});

export default router;
