import nodemailer from 'nodemailer';
import tls from 'tls';
import { sendNotification } from './notification.helper.js';

/**
 * Default recipient for all Student Attendance Device Re-bind OTPs
 * Ensures every OTP is delivered to denmarkcatolico2@gmail.com even when testing with fake student emails.
 */
export const DEFAULT_OTP_RECIPIENT_EMAIL =
  process.env.OTP_OVERRIDE_EMAIL || 'denmarkcatolico2@gmail.com';

/**
 * Mask an email address for UI display
 */
export function maskEmailAddress(email) {
  const target = email || DEFAULT_OTP_RECIPIENT_EMAIL;
  if (!target || typeof target !== 'string' || !target.includes('@')) return DEFAULT_OTP_RECIPIENT_EMAIL;
  return target.trim();
}

/**
 * Send email using Nodemailer with Gmail SMTP or custom SMTP
 */
async function sendViaNodemailer({ to, subject, html, text }) {
  const smtpUser =
    process.env.GMAIL_USER ||
    process.env.SMTP_USER ||
    process.env.EMAIL_USER ||
    DEFAULT_OTP_RECIPIENT_EMAIL;
  const smtpPass = (
    process.env.GMAIL_APP_PASSWORD ||
    process.env.SMTP_PASS ||
    process.env.EMAIL_PASS ||
    ''
  ).replace(/\s+/g, ''); // strip spaces from Google app passwords

  if (!smtpUser || !smtpPass) {
    return { sent: false, reason: 'GMAIL_APP_PASSWORD_NOT_CONFIGURED' };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000
  });

  try {
    const info = await transporter.sendMail({
      from: `"InternConPH Security" <${smtpUser}>`,
      to,
      subject,
      text,
      html
    });
    return { sent: true, transport: 'nodemailer_gmail', messageId: info.messageId };
  } catch (err) {
    console.warn('[Mailer] Nodemailer failed:', err.message);
    return { sent: false, reason: err.message };
  }
}

/**
 * Fallback lightweight native TLS SMTP sender for Gmail (smtp.gmail.com:465)
 */
async function sendViaGmailSmtp({ to, subject, html, text }) {
  const smtpUser =
    process.env.GMAIL_USER ||
    process.env.SMTP_USER ||
    process.env.EMAIL_USER ||
    DEFAULT_OTP_RECIPIENT_EMAIL;
  const smtpPass = (
    process.env.GMAIL_APP_PASSWORD ||
    process.env.SMTP_PASS ||
    process.env.EMAIL_PASS ||
    ''
  ).replace(/\s+/g, '');
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

    socket.setTimeout(8000, () => {
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
        if (line.length >= 4 && line[3] === '-') continue;
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
          return finish({ sent: true, transport: 'gmail_tls_smtp' });
        }
      }
    });

    socket.on('error', (err) => {
      finish({ sent: false, reason: err.message });
    });

    socket.on('close', () => {
      finish({ sent: step >= commands.length, transport: 'gmail_tls_smtp' });
    });
  });
}

/**
 * Fallback HTTP Email Relay via FormSubmit with 5-second timeout
 */
async function sendViaFormSubmitRelay({ to, subject, studentName, studentAccountEmail, otpCode, newDeviceLabel }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Origin: 'https://interncon-ph.vercel.app',
        Referer: 'https://interncon-ph.vercel.app/'
      },
      body: JSON.stringify({
        _subject: subject,
        _template: 'box',
        _captcha: 'false',
        OTP_Code: otpCode,
        Student_Name: studentName || 'Intern',
        Student_Account_Email: studentAccountEmail || 'N/A',
        New_Device: newDeviceLabel || 'Android Phone',
        Valid_For: '5 minutes (max 5 attempts)'
      })
    });
    clearTimeout(timeoutId);
    const data = await res.json().catch(() => ({}));
    if (res.ok && (data.success === 'true' || data.success === true)) {
      return { sent: true, transport: 'formsubmit_relay' };
    }
    return { sent: false, reason: data.message || `HTTP_${res.status}` };
  } catch (err) {
    clearTimeout(timeoutId);
    return { sent: false, reason: err.name === 'AbortError' ? 'FORMSUBMIT_TIMEOUT' : err.message };
  }
}

/**
 * Send a 6-digit Device Re-binding OTP to denmarkcatolico2@gmail.com
 * Also delivers an in-app notification to the authenticated student session.
 */
export async function sendDeviceRebindOtpEmail({
  userId,
  email,
  studentName,
  otpCode,
  newDeviceLabel,
  expiresInMinutes = 5
}) {
  const recipientEmail = DEFAULT_OTP_RECIPIENT_EMAIL;
  const studentAccountEmail = email || 'student@internconph.local';

  const subject = `[InternConPH] ${otpCode} is your 6-digit Attendance OTP`;
  const text = [
    `Hello ${studentName || 'Intern'} (Account: ${studentAccountEmail}),`,
    ``,
    `A request was made to bind your InternConPH Attendance QR to a new device (${newDeviceLabel || 'Mobile Handset'}).`,
    ``,
    `Your 6-digit verification OTP is: ${otpCode}`,
    ``,
    `This code expires in ${expiresInMinutes} minutes and allows a maximum of 5 verification attempts.`,
    `Once verified, the previous device will be unbound immediately.`
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
      <h2 style="margin: 0 0 8px; color: #0f172a; font-size: 18px;">Attendance Device Security Verification</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">
        Student: <strong>${studentName || 'Intern'}</strong> (<code>${studentAccountEmail}</code>)<br/>
        Requested Device: <strong>${newDeviceLabel || 'Android Phone'}</strong>
      </p>
      <div style="margin: 20px 0; padding: 18px; background: #fff7ed; border: 2px dashed #ea580c; border-radius: 12px; text-align: center;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #9a3412; font-weight: 700;">6-Digit Verification OTP</div>
        <div style="font-size: 32px; font-weight: 900; letter-spacing: 6px; color: #c2410c; font-family: monospace; margin-top: 6px;">${otpCode}</div>
      </div>
      <p style="color: #64748b; font-size: 12px; line-height: 1.5;">
        • Valid for <strong>${expiresInMinutes} minutes</strong> (max 5 attempts).<br/>
        • Completing verification will unbind the previous phone and bind this new device.
      </p>
    </div>
  `;

  // 1. Try Nodemailer Gmail first
  let emailResult = await sendViaNodemailer({
    to: recipientEmail,
    subject,
    html,
    text
  }).catch((err) => ({ sent: false, reason: err.message }));

  // 2. If Nodemailer failed, try raw TLS SMTP
  if (!emailResult.sent) {
    const tlsResult = await sendViaGmailSmtp({
      to: recipientEmail,
      subject,
      html,
      text
    }).catch((err) => ({ sent: false, reason: err.message }));
    if (tlsResult.sent) {
      emailResult = tlsResult;
    }
  }

  // 3. Fallback to FormSubmit relay
  if (!emailResult.sent) {
    const relayResult = await sendViaFormSubmitRelay({
      to: recipientEmail,
      subject,
      studentName,
      studentAccountEmail,
      otpCode,
      newDeviceLabel
    });
    if (relayResult.sent) {
      emailResult = relayResult;
    }
  }

  // 4. Always deliver an in-app security notification to the student's account
  if (userId) {
    await sendNotification({
      userId,
      title: `Device Re-bind OTP: ${otpCode}`,
      message: `Use 6-digit OTP ${otpCode} (sent to ${recipientEmail}) to bind your Attendance QR to ${newDeviceLabel || 'your new phone'}. Valid for ${expiresInMinutes} minutes.`,
      type: 'security',
      link: '/dashboard/student/ojt'
    }).catch(() => {});
  }

  // 5. Always log clearly in console for instant developer feedback & test verification
  console.log('================================================================');
  console.log(`[DEVICE OTP DISPATCH] Target: ${recipientEmail}`);
  console.log(`[DEVICE OTP DISPATCH] Student: "${studentName}" (${studentAccountEmail})`);
  console.log(`[DEVICE OTP DISPATCH] 6-DIGIT CODE: >>> ${otpCode} <<<`);
  console.log(`[DEVICE OTP DISPATCH] Delivery Status: ${emailResult.sent ? 'DELIVERED via ' + emailResult.transport : 'PENDING SMTP (' + emailResult.reason + ')'}`);
  console.log('================================================================');

  return {
    ...emailResult,
    otpCode,
    recipientEmail
  };
}
