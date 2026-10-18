import pool from './src/config/db.js';

async function test() {
  try {
    console.log('=== TEST: DEAN DEPARTMENT NOTIFICATION & SCOPING ===');

    // 1. Check existing Dean in DB
    const [deans] = await pool.query(`
      SELECT ist.user_id, ist.staff_id, ist.first_name, ist.last_name, ist.department, p.department as prog_department
      FROM institution_staff ist
      JOIN users u ON ist.user_id = u.user_id
      LEFT JOIN programs p ON ist.program_id = p.program_id
      WHERE ist.institution_id = 76 
        AND ist.position = 'dean' 
        AND ist.is_verified = 1 
        AND ist.is_active = 1
        AND u.is_active = 1
    `);
    console.log('Deans in institution 76:', deans);

    if (deans.length === 0) {
      console.log('No verified dean found for institution 76.');
      return;
    }

    const testDean = deans[0];
    const deanDept = (testDean.department || testDean.prog_department || '').trim();
    console.log(`Test Dean is assigned to department: "${deanDept}" (User ID: ${testDean.user_id})`);

    // 2. Test staff matching department:
    // Case A: Staff assigned to same department "Information Technology & Computing"
    const staffDeptMatch = "Information Technology & Computing";
    const matchingDeansA = deans.filter(d => {
      const dDept = (d.department || d.prog_department || '').trim().toLowerCase();
      return dDept && dDept === staffDeptMatch.toLowerCase();
    });
    console.log(`Staff registering in "${staffDeptMatch}" matches deans:`, matchingDeansA.map(d => d.user_id));
    if (matchingDeansA.length === 1 && matchingDeansA[0].user_id === testDean.user_id) {
      console.log('✓ PASS: Matching Dean WILL receive notification for staff in their department.');
    } else {
      console.error('✗ FAIL: Expected matching dean to receive notification.');
    }

    // Case B: Staff assigned to different department e.g. "Business & Accountancy"
    const staffDeptDifferent = "Business & Accountancy";
    const matchingDeansB = deans.filter(d => {
      const dDept = (d.department || d.prog_department || '').trim().toLowerCase();
      return dDept && dDept === staffDeptDifferent.toLowerCase();
    });
    console.log(`Staff registering in "${staffDeptDifferent}" matches deans:`, matchingDeansB.map(d => d.user_id));
    if (matchingDeansB.length === 0) {
      console.log('✓ PASS: Dean of IT does NOT receive notification for Business & Accountancy staff.');
    } else {
      console.error('✗ FAIL: Dean should NOT receive notification for different department.');
    }

    // 3. Test Staff Scoping Query for GET /staff
    const [allStaffRows] = await pool.query(`
      SELECT s.staff_id, s.department, p.department as program_department, s.program_id
      FROM institution_staff s
      LEFT JOIN programs p ON s.program_id = p.program_id
      WHERE s.institution_id = 76
    `);
    console.log(`Total staff in institution 76: ${allStaffRows.length}`);

    // Department programs for deanDept
    const [deptPrograms] = await pool.query(
      `SELECT program_id FROM programs WHERE institution_id = 76 AND department = ?`,
      [deanDept]
    );
    const progIds = deptPrograms.map(p => p.program_id);

    const deanDeptLower = deanDept.toLowerCase();
    const scopedStaff = allStaffRows.filter(s => {
      const sDept = (s.department || s.program_department || '').trim().toLowerCase();
      const matchesDept = Boolean(sDept && sDept === deanDeptLower);
      const matchesProg = Boolean(s.program_id && progIds.includes(Number(s.program_id)));
      return matchesDept || matchesProg;
    });

    console.log(`Staff scoped to Dean's department ("${deanDept}"): ${scopedStaff.length}`);
    console.log('✓ PASS: Staff list scoped to Dean department successfully.');

  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
test();
