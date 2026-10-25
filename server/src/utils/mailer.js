import tls from 'tls';
import { sendNotification } from './notification.helper.js';

/**
 * Mask an email address for UI display (e.g. "ju***23@gmail.com")
 */
export function maskEmailAddress(email) {
  if (!email || typeof email !== 'string' || !email.includes('@')) return 'registered Gmail';
  const [local, domain] = email.trim().split('@');
  if (local.length <= 2) {
    return `${local[0] || '*'}***@${domain}`;
  }
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

/**
 * Lightweight native TLS SMTP sender for Gmail (smtp.gmail.com:465)
 * Uses Node.js built-in `tls` module (no external dependency required).
 */
async function sendViaGmailSmtp({ to, subject, html, text }) {
  const smtpUser = process.env.GMAIL_USER || process.env.SMTP_USER || process.env.EMAIL_USER;
  const smtpPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);

  if (!smtpUser || !smtpPass) {
    return { sent: false, reason: 'SMTP_NOT_CONFIGURED' };
  }

  return new Promise((resolve) => {
    let resolved = false;
    const finish = (res) => {
      if (!resolved) {
        resolved = true;
        resolve(res);
      }
    };

    const socket = tls.connect(
      { host: smtpHost, port: smtpPort, servername: smtpHost, rejectUnauthorized: false },
      () => {}
    );

    socket.setTimeout(10000, () => {
      socket.destroy();
      finish({ sent: false, reason: 'SMTP_TIMEOUT' });
    });

    const boundary = `interncon_${Date.now().toString(16)}`;
    const commands = [
      `EHLO internconph.local`,
      `AUTH LOGIN`,
      Buffer.from(smtpUser).toString('base64'),
      Buffer.from(smtpPass).toString('base64'),
      `MAIL FROM:<${smtpUser}>`,
      `RCPT TO:<${to}>`,
      `DATA`,
      [
        `From: "InternConPH Security" <${smtpUser}>`,
        `To: <${to}>`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        ``,
        `--${boundary}`,
        `Content-Type: text/plain; charset="UTF-8"`,
        ``,
        text,
        ``,
        `--${boundary}`,
        `Content-Type: text/html; charset="UTF-8"`,
        ``,
        html,
        ``,
        `--${boundary}--`,
        `.`
      ].join('\r\n'),
      `QUIT`
    ];

    let step = 0;
    let buffer = '';

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\r\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.length >= 4 && line[3] === '-') continue; // multi-line response continuation
        const code = parseInt(line.slice(0, 3), 10);
        if (code >= 400) {
          socket.destroy();
          return finish({ sent: false, reason: `SMTP_${code}: ${line}` });
        }
        if (step < commands.length) {
          const cmd = commands[step++];
          socket.write(cmd + '\r\n');
        } else {
          socket.end();
          return finish({ sent: true, transport: 'gmail_smtp' });
        }
      }
    });

    socket.on('error', (err) => {
      finish({ sent: false, reason: err.message });
    });

    socket.on('close', () => {
      finish({ sent: step >= commands.length, transport: 'gmail_smtp' });
    });
  });
}

/**
 * Send a 6-digit Device Re-binding OTP to the student's registered Gmail
 * Also delivers an encrypted in-app notification to the authenticated student session.
 */
export async function sendDeviceRebindOtpEmail({
  userId,
  email,
  studentName,
  otpCode,
  newDeviceLabel,
  expiresInMinutes = 5
}) {
  const subject = `[InternConPH] ${otpCode} is your 6-digit Attendance Device Re-bind OTP`;
  const text = [
    `Hello ${studentName || 'Intern'},`,
    ``,
    `A request was made to bind your InternConPH Attendance QR to a new Android device (${newDeviceLabel || 'Mobile Handset'}).`,
    ``,
    `Your 6-digit verification OTP is: ${otpCode}`,
    ``,
    `This code expires in ${expiresInMinutes} minutes and allows a maximum of 5 verification attempts.`,
    `Once verified, your previous device will be unbound immediately.`,
    ``,
    `If you did not request this device change, please change your password immediately.`
  ].join('\n');

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
      <h2 style="margin: 0 0 8px; color: #0f172a; font-size: 18px;">Attendance Device Security Verification</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">
        Hello <strong>${studentName || 'Intern'}</strong>,<br/>
        You requested to re-bind your InternConPH Attendance QR generator to a new device (<strong>${newDeviceLabel || 'Android Phone'}</strong>).
      </p>
      <div style="margin: 20px 0; padding: 18px; background: #fff7ed; border: 2px dashed #ea580c; border-radius: 12px; text-align: center;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #9a3412; font-weight: 700;">6-Digit Verification OTP</div>
        <div style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #c2410c; font-family: monospace; margin-top: 6px;">${otpCode}</div>
      </div>
      <p style="color: #64748b; font-size: 12px; line-height: 1.5;">
        • Valid for <strong>${expiresInMinutes} minutes</strong> (max 5 attempts).<br/>
        • Completing verification will unbind your old phone and bind this new device.
      </p>
    </div>
  `;

  let emailResult = { sent: false, reason: 'NO_TRANSPORT' };
  try {
    emailResult = await sendViaGmailSmtp({ to: email, subject, html, text });
  } catch (err) {
    emailResult = { sent: false, reason: err.message };
  }

  // Also deliver an in-app security notification to the student's account
  if (userId) {
    await sendNotification({
      userId,
      title: `Device Re-bind OTP: ${otpCode}`,
      message: `Use 6-digit OTP ${otpCode} to bind your Attendance QR to ${newDeviceLabel || 'your new phone'}. Valid for ${expiresInMinutes} minutes.`,
      type: 'security',
      link: '/dashboard/student/ojt'
    }).catch(() => {});
  }

  if (!emailResult.sent) {
    console.log(`[Device OTP Mailer] OTP for ${email} (${studentName}): ${otpCode} (SMTP status: ${emailResult.reason})`);
  }

  return emailResult;
}
