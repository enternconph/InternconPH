import pool from '../server/src/config/db.js';
import { PROGRAM_SKILLS_CATALOG } from '../server/src/data/programSkillsData.js';

async function testEndpointLogic() {
  console.log('Testing analytics endpoint logic...');

  // Build taxonomy lookup
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

  // 1. Fetch programs list
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

  console.log('Programs count:', dbPrograms.length);

  // 2. Fetch all skills with demand and student talent counts
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

  console.log('Total skills with activity:', skillRows.length);

  // Enrich skills with taxonomy
  const enrichedSkills = skillRows.map(sk => {
    const lower = sk.skill_name.toLowerCase().trim();
    const tax = skillTaxonomy.get(lower);

    const progsSet = new Set(sk.db_programs ? sk.db_programs.split(', ') : []);
    const deptsSet = new Set(sk.db_departments ? sk.db_departments.split(', ') : []);

    if (tax) {
      tax.programs.forEach(p => progsSet.add(p));
      tax.departments.forEach(d => deptsSet.add(d));
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

  // Cross-Discipline Matrix verification
  const clusters = [
    { id: 'all', label: 'All Disciplines', dept: null },
    { id: 'computing', label: 'Computing & IT', dept: 'Information Technology & Computing' },
    { id: 'business', label: 'Business & Accountancy', dept: 'Business & Accountancy' },
    { id: 'engineering', label: 'Engineering & Architecture', dept: 'Engineering & Architecture' },
    { id: 'healthcare', label: 'Healthcare & Medical', dept: 'Health & Allied Sciences' },
    { id: 'hospitality', label: 'Hospitality & Tourism', dept: 'Hospitality & Tourism' },
    { id: 'education', label: 'Teacher Education', dept: 'Education & Teacher Training' },
    { id: 'criminology', label: 'Criminal Justice', dept: 'Criminology & Public Safety' },
    { id: 'arts', label: 'Arts & Multimedia', dept: 'Arts, Design & Media' },
    { id: 'agriculture', label: 'Agriculture & Environment', dept: 'Agriculture & Environment' }
  ];

  for (const c of clusters.slice(1)) {
    const matching = enrichedSkills.filter(s => s.departments.includes(c.dept));
    const topDemand = matching.filter(s => s.demand_count > 0).slice(0, 3);
    const topTalent = [...matching].sort((a, b) => b.student_count - a.student_count).slice(0, 3);
    console.log(`Cluster [${c.label}]: matching skills=${matching.length}`);
    console.log(`  Top Demand:`, topDemand.map(s => `${s.skill_name} (${s.demand_count})`));
    console.log(`  Top Talent:`, topTalent.map(s => `${s.skill_name} (${s.student_count})`));
  }

  process.exit(0);
}

testEndpointLogic().catch(err => {
  console.error(err);
  process.exit(1);
});
