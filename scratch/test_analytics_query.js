import pool from '../server/src/config/db.js';
import { PROGRAM_SKILLS_CATALOG } from '../server/src/data/programSkillsData.js';

async function testQuery() {
  const query = `
    SELECT 
      s.skill_id, 
      s.skill_name,
      sc.category_name,
      GROUP_CONCAT(DISTINCT p.program_code ORDER BY p.program_code SEPARATOR ', ') as programs,
      GROUP_CONCAT(DISTINCT p.department ORDER BY p.department SEPARATOR ', ') as departments,
      COUNT(DISTINCT jrs.job_id) as demand_count,
      COUNT(DISTINCT ss.student_id) as student_count
    FROM skills s
    LEFT JOIN skill_categories sc ON s.category_id = sc.category_id
    LEFT JOIN job_required_skills jrs ON s.skill_id = jrs.skill_id
    LEFT JOIN job_required_programs jrp ON jrs.job_id = jrp.job_id
    LEFT JOIN programs p ON jrp.program_id = p.program_id
    LEFT JOIN student_skills ss ON s.skill_id = ss.skill_id
    GROUP BY s.skill_id, s.skill_name, sc.category_name
    HAVING demand_count > 0 OR student_count > 0
    ORDER BY demand_count DESC, student_count DESC
    LIMIT 20
  `;

  const [rows] = await pool.query(query);
  console.log('Sample Cross-Discipline Skills:');
  console.log(rows);
  process.exit(0);
}

testQuery().catch(err => {
  console.error(err);
  process.exit(1);
});
