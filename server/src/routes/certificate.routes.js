import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

// Helper to query certificate by code or ID
async function findCertificate(identifier) {
  if (!identifier) return null;
  const cleanCode = String(identifier).trim().replace(/^certificate:\/\//, '').replace(/^certificate:/, '');

  const [rows] = await pool.query(
    `SELECT c.*, 
            o.start_date, o.end_date, o.supervisor_name,
            s.first_name, s.last_name, s.student_number as student_no,
            u.email as student_email,
            inst.institution_name, inst.address as inst_address,
            ho.organization_name, ho.industry, ho.address as org_address
     FROM ojt_certificates c
     LEFT JOIN ojt_records o ON c.ojt_id = o.ojt_id
     LEFT JOIN students s ON c.student_id = s.student_id
     LEFT JOIN users u ON s.user_id = u.user_id
     LEFT JOIN institutions inst ON c.institution_id = inst.institution_id
     LEFT JOIN hiring_organizations ho ON c.organization_id = ho.organization_id
     WHERE c.certificate_code = ? OR c.certificate_id = ? OR c.certificate_code LIKE ?
     LIMIT 1`,
    [cleanCode, isNaN(cleanCode) ? -1 : parseInt(cleanCode, 10), `%${cleanCode}%`]
  );

  if (rows.length > 0) {
    return rows[0];
  }

  // Fallback: check if cleanCode matches an ojt_id or can be derived from portfolio_items
  const [portRows] = await pool.query(
    `SELECT pi.*, sp.student_id, o.ojt_id
     FROM portfolio_items pi
     JOIN student_portfolios sp ON pi.portfolio_id = sp.portfolio_id
     LEFT JOIN ojt_records o ON sp.student_id = o.student_id
     WHERE pi.file_path LIKE ? OR pi.title LIKE ?
     ORDER BY pi.item_id DESC LIMIT 1`,
    [`%${cleanCode}%`, `%${cleanCode}%`]
  );

  if (portRows.length > 0 && portRows[0].ojt_id) {
    const [ojtCert] = await pool.query(
      `SELECT c.*, o.start_date, o.end_date, o.supervisor_name,
              s.first_name, s.last_name, s.student_number as student_no,
              u.email as student_email,
              inst.institution_name, inst.address as inst_address,
              ho.organization_name, ho.industry, ho.address as org_address
       FROM ojt_certificates c
       LEFT JOIN ojt_records o ON c.ojt_id = o.ojt_id
       LEFT JOIN students s ON c.student_id = s.student_id
       LEFT JOIN users u ON s.user_id = u.user_id
       LEFT JOIN institutions inst ON c.institution_id = inst.institution_id
       LEFT JOIN hiring_organizations ho ON c.organization_id = ho.organization_id
       WHERE c.ojt_id = ? LIMIT 1`,
      [portRows[0].ojt_id]
    );
    if (ojtCert.length > 0) return ojtCert[0];
  }

  return null;
}

// GET /api/certificates/:code - JSON certificate details
router.get('/:code', async (req, res) => {
  try {
    const cert = await findCertificate(req.params.code);
    if (!cert) {
      return res.status(404).json({ success: false, message: 'Certificate of OJT Completion not found or not yet generated.' });
    }
    return res.json({ success: true, data: cert });
  } catch (err) {
    console.error('Certificate lookup error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve certificate details.' });
  }
});

// GET /api/certificates/verify/:code - Public verification metadata
router.get('/verify/:code', async (req, res) => {
  try {
    const cert = await findCertificate(req.params.code);
    if (!cert) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: 'Invalid certificate verification serial code.'
      });
    }
    return res.json({
      success: true,
      valid: true,
      data: {
        certificate_code: cert.certificate_code,
        student_name: cert.student_name,
        student_number: cert.student_number || cert.student_no,
        program_name: cert.program_name,
        institution_name: cert.institution_name,
        organization_name: cert.organization_name,
        rendered_hours: cert.rendered_hours,
        required_hours: cert.required_hours,
        evaluation_rating: cert.evaluation_rating,
        issued_at: cert.issued_at,
        completion_date: cert.completion_date
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, valid: false, message: 'Verification lookup failed.' });
  }
});

// GET /api/certificates/render/:code - Full official visual HTML certificate with print/save support
router.get('/render/:code', async (req, res) => {
  try {
    const cert = await findCertificate(req.params.code);
    if (!cert) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <title>Certificate Not Found - InternConPH</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1.5rem; text-align: center; }
              .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 2.5rem; max-width: 480px; }
              h1 { font-size: 1.25rem; margin-bottom: 0.5rem; color: #f97316; }
              p { font-size: 0.9rem; color: #94a3b8; line-height: 1.5; margin-bottom: 1.5rem; }
              .btn { background: #f97316; color: #fff; text-decoration: none; padding: 0.6rem 1.25rem; border-radius: 8px; font-weight: 600; font-size: 0.85rem; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Certificate Record Not Found</h1>
              <p>The requested Certificate of OJT Completion could not be found or has not been generated yet.</p>
              <a href="javascript:window.close()" class="btn">Close Window</a>
            </div>
          </body>
        </html>
      `);
    }

    const issuedDate = cert.issued_at
      ? new Date(cert.issued_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const completionDate = cert.completion_date
      ? new Date(cert.completion_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : issuedDate;

    return res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Certificate of OJT Completion - ${cert.student_name} (${cert.certificate_code})</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Inter:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;0,900;1,400&display=swap" rel="stylesheet">
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              background: #0f172a;
              color: #1e293b;
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 1.5rem;
            }
            .action-bar {
              width: 100%;
              max-width: 960px;
              margin-bottom: 1.25rem;
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 1rem;
              flex-wrap: wrap;
            }
            .back-link {
              color: #94a3b8;
              text-decoration: none;
              font-size: 0.85rem;
              font-weight: 600;
              display: inline-flex;
              align-items: center;
              gap: 0.35rem;
            }
            .back-link:hover { color: #f8fafc; }
            .btn-print {
              background: linear-gradient(135deg, #059669 0%, #047857 100%);
              color: white;
              border: none;
              padding: 0.65rem 1.5rem;
              border-radius: 10px;
              font-size: 0.85rem;
              font-weight: 700;
              cursor: pointer;
              box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
              display: inline-flex;
              align-items: center;
              gap: 0.5rem;
              transition: all 0.2s;
            }
            .btn-print:hover { opacity: 0.95; transform: translateY(-1px); }

            /* Certificate Frame */
            .cert-wrapper {
              width: 100%;
              max-width: 960px;
              background: #ffffff;
              border-radius: 16px;
              padding: 1.25rem;
              box-shadow: 0 25px 60px rgba(0, 0, 0, 0.45);
              position: relative;
            }
            .cert-outer-border {
              border: 3px solid #d97706;
              padding: 0.5rem;
              border-radius: 12px;
            }
            .cert-inner-border {
              border: 2px dashed #b45309;
              padding: 2.75rem 2.5rem;
              border-radius: 8px;
              background: radial-gradient(circle at center, #ffffff 0%, #fffbeb 100%);
              text-align: center;
              position: relative;
              overflow: hidden;
            }
            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-25deg);
              font-size: 5.5rem;
              font-weight: 900;
              font-family: 'Cinzel', serif;
              color: rgba(217, 119, 6, 0.04);
              letter-spacing: 0.25em;
              white-space: nowrap;
              pointer-events: none;
              user-select: none;
            }
            .cert-header {
              margin-bottom: 1.75rem;
              position: relative;
              z-index: 2;
            }
            .cert-badge {
              display: inline-block;
              font-size: 0.75rem;
              font-weight: 800;
              letter-spacing: 0.2em;
              text-transform: uppercase;
              color: #b45309;
              background: rgba(245, 158, 11, 0.12);
              padding: 0.35rem 1.25rem;
              border-radius: 999px;
              border: 1px solid rgba(245, 158, 11, 0.3);
              margin-bottom: 0.75rem;
            }
            .cert-title {
              font-family: 'Cinzel', serif;
              font-size: 2.4rem;
              font-weight: 900;
              color: #1e293b;
              letter-spacing: 0.05em;
              line-height: 1.15;
            }
            .cert-subtitle {
              font-size: 0.85rem;
              color: #64748b;
              font-style: italic;
              margin-top: 0.5rem;
            }
            .cert-body {
              position: relative;
              z-index: 2;
              margin-bottom: 2rem;
            }
            .cert-recipient-intro {
              font-size: 0.95rem;
              color: #475569;
              margin-bottom: 0.75rem;
            }
            .cert-name-block {
              display: inline-block;
              border-bottom: 2px solid #b45309;
              padding: 0.25rem 2rem 0.5rem;
              margin-bottom: 1.25rem;
            }
            .cert-name {
              font-family: 'Playfair Display', serif;
              font-size: 2rem;
              font-weight: 900;
              color: #0f172a;
              letter-spacing: 0.02em;
            }
            .cert-student-id {
              font-size: 0.8rem;
              color: #64748b;
              font-family: monospace;
              font-weight: 600;
              margin-top: 0.15rem;
            }
            .cert-description {
              font-size: 0.95rem;
              color: #334155;
              max-width: 700px;
              margin: 0 auto;
              line-height: 1.7;
            }
            .cert-description strong {
              color: #0f172a;
            }
            .cert-metrics {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 1rem;
              max-width: 720px;
              margin: 1.75rem auto 0;
              padding: 1rem;
              background: rgba(255, 255, 255, 0.8);
              border: 1px solid rgba(217, 119, 6, 0.25);
              border-radius: 12px;
              text-align: left;
            }
            .metric-item span {
              display: block;
              font-size: 0.7rem;
              font-weight: 700;
              text-transform: uppercase;
              color: #64748b;
              margin-bottom: 0.2rem;
            }
            .metric-item strong {
              font-size: 0.95rem;
              color: #0f172a;
            }
            .cert-footer {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 2.5rem;
              padding-top: 1.5rem;
              border-top: 1px solid rgba(217, 119, 6, 0.2);
              position: relative;
              z-index: 2;
              text-align: left;
              gap: 1.5rem;
            }
            .seal-wrapper {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .gold-seal {
              width: 72px;
              height: 72px;
              border-radius: 50%;
              background: radial-gradient(circle, #fef3c7 0%, #f59e0b 70%, #b45309 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              color: #fff;
              font-size: 2rem;
              box-shadow: 0 4px 12px rgba(180, 83, 9, 0.35);
              border: 2px solid #fff;
            }
            .seal-text {
              font-size: 0.65rem;
              font-weight: 800;
              color: #92400e;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              margin-top: 0.35rem;
            }
            .sig-block {
              min-width: 180px;
              text-align: center;
            }
            .sig-line {
              border-top: 1.5px solid #475569;
              padding-top: 0.35rem;
              font-size: 0.8rem;
              font-weight: 700;
              color: #0f172a;
            }
            .sig-title {
              font-size: 0.7rem;
              color: #64748b;
            }
            .cert-serial {
              margin-top: 1.5rem;
              display: inline-block;
              font-family: monospace;
              font-size: 0.75rem;
              font-weight: 700;
              color: #047857;
              background: #d1fae5;
              padding: 0.3rem 0.85rem;
              border-radius: 999px;
              border: 1px solid #6ee7b7;
            }

            @media print {
              body {
                background: #ffffff !important;
                padding: 0 !important;
              }
              .action-bar {
                display: none !important;
              }
              .cert-wrapper {
                box-shadow: none !important;
                max-width: 100% !important;
                border-radius: 0 !important;
                padding: 0 !important;
              }
              @page {
                size: landscape;
                margin: 0.5cm;
              }
            }
          </style>
        </head>
        <body>
          <div class="action-bar">
            <a href="javascript:window.close()" class="back-link">&larr; Close / Return</a>
            <button onclick="window.print()" class="btn-print">&#128424; Print / Save PDF</button>
          </div>

          <div class="cert-wrapper">
            <div class="cert-outer-border">
              <div class="cert-inner-border">
                <div class="watermark">INTERNCONPH</div>

                <div class="cert-header">
                  <span class="cert-badge">Verified Credential &middot; CHED & Industry Compliant</span>
                  <h1 class="cert-title">Certificate of OJT Completion</h1>
                  <p class="cert-subtitle">Official Proof of Practical Internship Competency</p>
                </div>

                <div class="cert-body">
                  <p class="cert-recipient-intro">This is to officially certify that</p>

                  <div class="cert-name-block">
                    <div class="cert-name">${cert.student_name}</div>
                    ${cert.student_number || cert.student_no ? `<div class="cert-student-id">Student ID: ${cert.student_number || cert.student_no}</div>` : ''}
                  </div>

                  <p class="cert-description">
                    has successfully fulfilled and satisfactorily completed all the prescribed requirements and rendering of 
                    <strong>${cert.rendered_hours || cert.required_hours || 600} hours</strong> of On-the-Job Training in 
                    <strong>${cert.program_name || 'Academic Degree Program'}</strong> under 
                    <strong>${cert.institution_name}</strong> at 
                    <strong>${cert.organization_name}</strong>.
                  </p>

                  <div class="cert-metrics">
                    <div class="metric-item">
                      <span>Host Employer</span>
                      <strong>${cert.organization_name}</strong>
                    </div>
                    <div class="metric-item">
                      <span>Total Credited Hours</span>
                      <strong>${cert.rendered_hours || cert.required_hours || 600} Hours Completed</strong>
                    </div>
                    <div class="metric-item">
                      <span>Final Evaluation Rating</span>
                      <strong>${cert.evaluation_rating ? `${cert.evaluation_rating} / 5.0 ★` : '5.0 / 5.0 ★ (Recommended)'}</strong>
                    </div>
                  </div>
                </div>

                <div class="cert-footer">
                  <div class="sig-block">
                    <div class="sig-line">${cert.supervisor_name || 'Workplace Mentor / HR'}</div>
                    <div class="sig-title">Host Organization Supervisor</div>
                  </div>

                  <div class="seal-wrapper">
                    <div class="gold-seal">&#10004;</div>
                    <span class="seal-text">Official Seal</span>
                  </div>

                  <div class="sig-block">
                    <div class="sig-line">Dean / OJT Coordinator</div>
                    <div class="sig-title">${cert.institution_name}</div>
                  </div>
                </div>

                <div>
                  <span class="cert-serial">AUTHENTICATED SERIAL: ${cert.certificate_code}</span>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Certificate render error:', err);
    return res.status(500).send('Failed to render certificate.');
  }
});

export default router;
