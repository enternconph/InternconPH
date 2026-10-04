import pool from './src/config/db.js';

const DISCIPLINE_SKILLS = [
  // 1. Technical & Software (BSIT / BSCS / BSIS / BSCpE)
  { name: 'JavaScript', category: 'Technical Skills' },
  { name: 'TypeScript', category: 'Technical Skills' },
  { name: 'Python', category: 'Technical Skills' },
  { name: 'React.js', category: 'Technical Skills' },
  { name: 'Node.js', category: 'Technical Skills' },
  { name: 'SQL', category: 'Technical Skills' },
  { name: 'Database Design', category: 'Technical Skills' },
  { name: 'Git/Version Control', category: 'Technical Skills' },
  { name: 'RESTful API Development', category: 'Technical Skills' },
  { name: 'Docker', category: 'Technical Skills' },
  { name: 'AWS Cloud', category: 'Technical Skills' },
  { name: 'Data Analysis', category: 'Technical Skills' },
  { name: 'Machine Learning', category: 'Technical Skills' },
  { name: 'HTML/CSS', category: 'Technical Skills' },
  { name: 'Tailwind CSS', category: 'Technical Skills' },
  { name: 'Next.js', category: 'Technical Skills' },
  { name: 'MongoDB', category: 'Technical Skills' },
  { name: 'Linux System Admin', category: 'Technical Skills' },
  { name: 'Cybersecurity Fundamentals', category: 'Technical Skills' },
  { name: 'Mobile App Development (Flutter/React Native)', category: 'Technical Skills' },

  // 2. Accountancy & Finance (BSA / BSMA / BSBA-FM)
  { name: 'Financial Accounting', category: 'Business & Management' },
  { name: 'QuickBooks', category: 'Business & Management' },
  { name: 'Taxation & Tax Compliance', category: 'Business & Management' },
  { name: 'Auditing & Assurance', category: 'Business & Management' },
  { name: 'Cost Accounting', category: 'Business & Management' },
  { name: 'Financial Modeling', category: 'Business & Management' },
  { name: 'Xero Accounting', category: 'Business & Management' },
  { name: 'Excel / Advanced Spreadsheets', category: 'Business & Management' },
  { name: 'Payroll Processing & BIR Compliance', category: 'Business & Management' },
  { name: 'Philippine Financial Reporting Standards (PFRS)', category: 'Business & Management' },
  { name: 'Internal Audit & Risk Controls', category: 'Business & Management' },

  // 3. Civil, Electrical & Computer Engineering (BSCE / BSEE / BSECE / BSME)
  { name: 'AutoCAD', category: 'Technical Skills' },
  { name: 'BIM / Revit Architecture', category: 'Technical Skills' },
  { name: 'Structural Analysis & Design (STAAD/ETABS)', category: 'Technical Skills' },
  { name: 'Construction Management & Costing', category: 'Business & Management' },
  { name: 'Quantity Surveying & Bill of Materials', category: 'Technical Skills' },
  { name: 'MATLAB / Simulink', category: 'Technical Skills' },
  { name: 'Electrical Circuit Design & Wiring', category: 'Technical Skills' },
  { name: 'PLC Programming & Industrial Automation', category: 'Technical Skills' },
  { name: 'HVAC Design & Thermodynamics', category: 'Technical Skills' },
  { name: 'Occupational Safety & Health (BOSH/COSH)', category: 'Business & Management' },

  // 4. Hospitality & Culinary Management (BSHM / HRM)
  { name: 'Food & Beverage Service', category: 'Business & Management' },
  { name: 'HACCP & Food Safety Protocols', category: 'Business & Management' },
  { name: 'Front Office Operations (Opera PMS)', category: 'Business & Management' },
  { name: 'Culinary Arts & Kitchen Operations', category: 'Business & Management' },
  { name: 'Event Management & Banqueting', category: 'Business & Management' },
  { name: 'Hospitality Cost Control & Inventory', category: 'Business & Management' },
  { name: 'Wine & Barista Beverage Operations', category: 'Business & Management' },
  { name: 'Housekeeping Operations & Standards', category: 'Business & Management' },

  // 5. Tourism & Travel Management (BSTM)
  { name: 'Tourism Tour Guiding & Itinerary Planning', category: 'Business & Management' },
  { name: 'Amadeus / Sabre GDS Flight Booking', category: 'Technical Skills' },
  { name: 'Airline Ticketing & Fare Calculation', category: 'Business & Management' },
  { name: 'Destination Marketing & Sustainable Tourism', category: 'Business & Management' },
  { name: 'Customer Relationship Management', category: 'Business & Management' },
  { name: 'Visa Processing & Consular Protocols', category: 'Business & Management' },

  // 6. Healthcare & Nursing (BSN / BSMLS / BSP)
  { name: 'Patient Care & Clinical Assessment', category: 'Technical Skills' },
  { name: 'Basic Life Support (BLS / CPR)', category: 'Technical Skills' },
  { name: 'Clinical Documentation & EHR Systems', category: 'Technical Skills' },
  { name: 'Pharmacology & Safe Medication Administration', category: 'Technical Skills' },
  { name: 'Infection Control & Sterile Techniques', category: 'Technical Skills' },
  { name: 'Intravenous (IV) Therapy', category: 'Technical Skills' },
  { name: 'Laboratory Diagnostics & Hematology', category: 'Technical Skills' },
  { name: 'Dispensing & Community Pharmacy', category: 'Technical Skills' },
  { name: 'Emergency Triage & Patient Monitoring', category: 'Technical Skills' },

  // 7. Psychology & Human Resources (BSPSY / ABPSY / BSBA-HR)
  { name: 'Psychological Assessment & Testing', category: 'Technical Skills' },
  { name: 'Talent Acquisition & Recruitment', category: 'Business & Management' },
  { name: 'Philippine Labor Code & Employee Relations', category: 'Business & Management' },
  { name: 'Training & Organizational Development', category: 'Business & Management' },
  { name: 'Psychometric Report Writing', category: 'Technical Skills' },
  { name: 'Competency-Based Interviewing (STAR Method)', category: 'Business & Management' },
  { name: 'Counseling & Mental Health Facilitation', category: 'Soft Skills' },

  // 8. Business, Marketing & Entrepreneurship (BSBA / BSEntrep)
  { name: 'Digital Marketing & Social Media Strategy', category: 'Business & Management' },
  { name: 'Search Engine Optimization (SEO)', category: 'Technical Skills' },
  { name: 'Content Strategy & Copywriting', category: 'Design & Creative' },
  { name: 'Google Ads & Meta Advertising', category: 'Business & Management' },
  { name: 'Market Research & Competitive Analysis', category: 'Business & Management' },
  { name: 'E-Commerce Store Management (Shopify/Shopee/Lazada)', category: 'Business & Management' },
  { name: 'Sales Pipeline & B2B Lead Generation', category: 'Business & Management' },
  { name: 'Supply Chain & Logistics Operations', category: 'Business & Management' },

  // 9. Design, Multimedia & Creative Arts (BMA / BFA)
  { name: 'UI/UX Design', category: 'Design & Creative' },
  { name: 'Figma', category: 'Design & Creative' },
  { name: 'Design Systems', category: 'Design & Creative' },
  { name: 'Graphic Design (Adobe Photoshop / Illustrator)', category: 'Design & Creative' },
  { name: 'Video Editing (Premiere Pro / After Effects)', category: 'Design & Creative' },
  { name: 'Canva Design & Social Collateral', category: 'Design & Creative' },
  { name: '2D/3D Animation Fundamentals', category: 'Design & Creative' },
  { name: 'Brand Identity & Style Guide Development', category: 'Design & Creative' },

  // 10. Education & Pedagogy (BSEd / BEEd)
  { name: 'Curriculum Development & Lesson Planning', category: 'Business & Management' },
  { name: 'Instructional Design & E-Learning Modules', category: 'Technical Skills' },
  { name: 'Educational Technology & LMS (Canvas/Moodle/Google Classroom)', category: 'Technical Skills' },
  { name: 'Classroom Management & Student Engagement', category: 'Soft Skills' },
  { name: 'Educational Assessment & Rubrics Design', category: 'Technical Skills' },

  // 11. Core Universal Soft & Workplace Skills
  { name: 'Communication & Presentation Skills', category: 'Soft Skills' },
  { name: 'Project Management & Agile Scrum', category: 'Business & Management' },
  { name: 'Critical Thinking & Complex Problem Solving', category: 'Soft Skills' },
  { name: 'Collaborative Teamwork & Interpersonal Skills', category: 'Soft Skills' },
  { name: 'Professional Work Ethic & Time Management', category: 'Soft Skills' },
  { name: 'Business English Proficiency', category: 'Soft Skills' }
];

async function seedSkills() {
  console.log('Seeding multi-disciplinary skill taxonomy across all programs...');
  
  // Ensure categories exist
  const [existingCats] = await pool.query('SELECT category_id, category_name FROM skill_categories');
  const catMap = {};
  existingCats.forEach(c => { catMap[c.category_name] = c.category_id; });

  let insertedCount = 0;
  let updatedCount = 0;

  for (const s of DISCIPLINE_SKILLS) {
    const catId = catMap[s.category] || 1;
    const [res] = await pool.query(
      `INSERT INTO skills (skill_name, category_id, created_at, updated_at)
       VALUES (?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE category_id = VALUES(category_id), updated_at = NOW()`,
      [s.name, catId]
    );
    if (res.insertId) insertedCount++;
    else updatedCount++;
  }

  const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM skills');
  console.log(`✅ Skills seeded! Inserted: ${insertedCount}, Updated: ${updatedCount}. Total in database: ${total}`);
  process.exit(0);
}

seedSkills().catch(err => {
  console.error(err);
  process.exit(1);
});
