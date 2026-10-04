import pool from '../config/db.js';

export function generateValidMeetCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const rand = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${rand(3)}-${rand(4)}-${rand(3)}`;
}

export async function fixInvalidMeetLinks() {
  try {
    const [rows] = await pool.query('SELECT interview_id, location_or_link, meeting_link FROM interviews');
    let fixedCount = 0;

    for (const row of rows) {
      const link = row.meeting_link || row.location_or_link || '';
      const meetPattern = /^https?:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/i;

      if (link.includes('meet.google.com') && !meetPattern.test(link.trim())) {
        const code = generateValidMeetCode();
        const validUri = `https://meet.google.com/${code}`;
        await pool.query(
          'UPDATE interviews SET location_or_link = ?, meeting_link = ?, meeting_code = ? WHERE interview_id = ?',
          [validUri, validUri, code, row.interview_id]
        );
        fixedCount++;
        console.log(`[Meet Link Fix] Updated interview #${row.interview_id}: ${validUri}`);
      }
    }
    if (fixedCount > 0) {
      console.log(`[Meet Link Fix] Successfully repaired ${fixedCount} invalid Google Meet links in database.`);
    }
  } catch (err) {
    console.error('[Meet Link Fix Error]', err);
  }
}

if (process.argv[1]?.includes('fixMeetLinks.js')) {
  fixInvalidMeetLinks().then(() => process.exit(0));
}
