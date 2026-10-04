import pool from './src/config/db.js';
import { getAllUniqueSkills, PROGRAM_SKILLS_CATALOG } from './src/data/programSkillsData.js';

async function seedAllProgramSkills() {
  console.log('=== Seeding All Program Skills into MySQL ===');
  
  const [categories] = await pool.query('SELECT category_id, category_name FROM skill_categories');
  const catMap = {};
  categories.forEach(c => { catMap[c.category_name] = c.category_id; });

  const uniqueSkills = getAllUniqueSkills();
  console.log(`Total unique skills defined across ${Object.keys(PROGRAM_SKILLS_CATALOG).length} programs: ${uniqueSkills.length}`);

  let inserted = 0;
  let updated = 0;

  for (const s of uniqueSkills) {
    const catId = catMap[s.category] || 1;
    const [res] = await pool.query(
      `INSERT INTO skills (skill_name, category_id, created_at, updated_at)
       VALUES (?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE category_id = VALUES(category_id), updated_at = NOW()`,
      [s.name, catId]
    );

    if (res.insertId) inserted++;
    else updated++;
  }

  const [[{ count }]] = await pool.query('SELECT COUNT(*) as count FROM skills');
  console.log(`✅ Skills Database Population Completed!`);
  console.log(`- New skills inserted: ${inserted}`);
  console.log(`- Existing skills updated: ${updated}`);
  console.log(`- Total active skills in table 'skills': ${count}`);

  process.exit(0);
}

seedAllProgramSkills().catch(err => {
  console.error('Failed to seed program skills:', err);
  process.exit(1);
});
