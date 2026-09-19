import bcrypt from 'bcryptjs';
import pool from './src/config/db.js';

// ==========================================
// 1. CONSTANTS & REFERENCE DATA
// ==========================================

const FIRST_NAMES_MALE = [
  'Juan', 'Mark', 'John', 'Angelo', 'Christian', 'Daniel', 'Michael', 'Joshua', 'Kevin', 'Bryan',
  'Anthony', 'Francis', 'Gabriel', 'Carlos', 'James', 'Rafael', 'Paul', 'Kenneth', 'Jerome', 'Dominic',
  'Adrian', 'Patrick', 'Miguel', 'Vincent', 'David', 'Neil', 'Ramon', 'Manuel', 'Jose', 'Ian',
  'Justin', 'Paolo', 'Lorenzo', 'Marco', 'Leo', 'Jethro', 'Nathan', 'Ethan', 'Kyle', 'Matthew'
];

const FIRST_NAMES_FEMALE = [
  'Maria', 'Christine', 'Angelica', 'Princess', 'Bea', 'Patricia', 'Nicole', 'Hannah', 'Camille', 'Sarah',
  'Alyssa', 'Katherine', 'Danielle', 'Stephanie', 'Clarisse', 'Andrea', 'Erika', 'Jessica', 'Jasmine', 'Kimberly',
  'Charmaine', 'Rochelle', 'Katrina', 'Mary Joy', 'Mae', 'Maricel', 'Janice', 'Jenny', 'Abigail', 'Samantha',
  'Denise', 'Chloe', 'Bianca', 'Sophia', 'Gabrielle', 'Giselle', 'Faith', 'Grace', 'Hope', 'Joy'
];

const LAST_NAMES = [
  'Dela Cruz', 'Santos', 'Reyes', 'Garcia', 'Mendoza', 'Torres', 'Flores', 'Castillo', 'Villanueva', 'Ramos',
  'Castro', 'Rivera', 'Aquino', 'Bautista', 'Pascual', 'Manalo', 'Tan', 'Lim', 'Sy', 'Chua',
  'Cruz', 'Valdez', 'Morales', 'Mercado', 'Gutierrez', 'Salazar', 'Navarro', 'Aguilar', 'Santiago', 'Delos Reyes',
  'Catolico', 'Nemis', 'Soriano', 'Tolentino', 'Corpuz', 'Padilla', 'Pineda', 'David', 'Ferrer', 'Cortez',
  'Ocampo', 'Velasco', 'Estrada', 'Rosario', 'De Guzman', 'Gonzales', 'Hernandez', 'Lopez', 'Fernandez', 'Perez'
];

const INSTITUTIONS_LIST = [
  { name: 'Polytechnic University of the Philippines', code: 'PUP', city: 'Manila', province: 'Metro Manila', domain: 'pup.edu.ph' },
  { name: 'University of Santo Tomas', code: 'UST', city: 'Manila', province: 'Metro Manila', domain: 'ust.edu.ph' },
  { name: 'De La Salle University', code: 'DLSU', city: 'Manila', province: 'Metro Manila', domain: 'dlsu.edu.ph' },
  { name: 'Ateneo de Manila University', code: 'ADMU', city: 'Quezon City', province: 'Metro Manila', domain: 'ateneo.edu' },
  { name: 'University of the Philippines Diliman', code: 'UPD', city: 'Quezon City', province: 'Metro Manila', domain: 'upd.edu.ph' },
  { name: 'Far Eastern University', code: 'FEU', city: 'Manila', province: 'Metro Manila', domain: 'feu.edu.ph' },
  { name: 'Mapua University', code: 'MAPUA', city: 'Manila', province: 'Metro Manila', domain: 'mapua.edu.ph' },
  { name: 'Pamantasan ng Lungsod ng Maynila', code: 'PLM', city: 'Manila', province: 'Metro Manila', domain: 'plm.edu.ph' },
  { name: 'Technological University of the Philippines', code: 'TUP', city: 'Manila', province: 'Metro Manila', domain: 'tup.edu.ph' },
  { name: 'Adamson University', code: 'ADAMSON', city: 'Manila', province: 'Metro Manila', domain: 'adamson.edu.ph' },
  { name: 'Central Luzon State University', code: 'CLSU', city: 'Muñoz', province: 'Nueva Ecija', domain: 'clsu.edu.ph' },
  { name: 'Saint Louis University', code: 'SLU', city: 'Baguio City', province: 'Benguet', domain: 'slu.edu.ph' },
  { name: 'Batangas State University', code: 'BSU', city: 'Batangas City', province: 'Batangas', domain: 'batstate-u.edu.ph' },
  { name: 'University of San Carlos', code: 'USC', city: 'Cebu City', province: 'Cebu', domain: 'usc.edu.ph' },
  { name: 'Silliman University', code: 'SU', city: 'Dumaguete City', province: 'Negros Oriental', domain: 'su.edu.ph' },
  { name: 'Xavier University - Ateneo de Cagayan', code: 'XU', city: 'Cagayan de Oro', province: 'Misamis Oriental', domain: 'xu.edu.ph' },
  { name: 'Mindanao State University', code: 'MSU', city: 'Marawi City', province: 'Lanao del Sur', domain: 'msu.edu.ph' },
  { name: 'Notre Dame of Marbel University', code: 'NDMU', city: 'Koronadal City', province: 'South Cotabato', domain: 'ndmu.edu.ph' },
  { name: 'South East Asian Institute of Technology', code: 'SEAIT', city: 'Tupi', province: 'South Cotabato', domain: 'seait.edu.ph' },
  { name: 'Green Valley College Foundation Inc', code: 'GVCFI', city: 'Koronadal City', province: 'South Cotabato', domain: 'gvcfi.edu.ph' }
];

const ORGANIZATIONS_LIST = [
  { name: 'Ayala Corporation', industry: 'Conglomerate & Real Estate', domain: 'ayala.com.ph', city: 'Makati City', province: 'Metro Manila' },
  { name: 'SM Prime Holdings Inc.', industry: 'Retail & Commercial Property', domain: 'smprime.com', city: 'Pasay City', province: 'Metro Manila' },
  { name: 'Globe Telecom Inc.', industry: 'Telecommunications & ICT', domain: 'globe.com.ph', city: 'Taguig City', province: 'Metro Manila' },
  { name: 'PLDT & Smart Communications', industry: 'Telecommunications & Digital Services', domain: 'pldt.com.ph', city: 'Makati City', province: 'Metro Manila' },
  { name: 'BDO Unibank Inc.', industry: 'Banking & Financial Services', domain: 'bdo.com.ph', city: 'Mandaluyong City', province: 'Metro Manila' },
  { name: 'Bank of the Philippine Islands (BPI)', industry: 'Banking & Asset Management', domain: 'bpi.com.ph', city: 'Makati City', province: 'Metro Manila' },
  { name: 'JG Summit Holdings', industry: 'Aviation, Food & Petrochemicals', domain: 'jgsummit.com.ph', city: 'Pasig City', province: 'Metro Manila' },
  { name: 'San Miguel Corporation', industry: 'Food, Beverage & Infrastructure', domain: 'sanmiguel.com.ph', city: 'Mandaluyong City', province: 'Metro Manila' },
  { name: 'Aboitiz Power Corporation', industry: 'Energy & Utilities', domain: 'aboitizpower.com', city: 'Taguig City', province: 'Metro Manila' },
  { name: 'Jollibee Foods Corporation', industry: 'Food Service & QSR Operations', domain: 'jollibee.com.ph', city: 'Pasig City', province: 'Metro Manila' },
  { name: 'Megaworld Corporation', industry: 'Real Estate & Township Development', domain: 'megaworldcorp.com', city: 'Taguig City', province: 'Metro Manila' },
  { name: 'Robinsons Land Corporation', industry: 'Commercial Real Estate & Hospitality', domain: 'robinsonsland.com', city: 'Quezon City', province: 'Metro Manila' },
  { name: 'Metropolitan Bank & Trust Co. (Metrobank)', industry: 'Banking & Financial Markets', domain: 'metrobank.com.ph', city: 'Makati City', province: 'Metro Manila' },
  { name: 'Converge ICT Solutions', industry: 'Fiber Internet & Broadband Network', domain: 'convergeict.com', city: 'Pasig City', province: 'Metro Manila' },
  { name: 'Accenture Philippines', industry: 'IT Consulting & Cloud Solutions', domain: 'accenture.com', city: 'Taguig City', province: 'Metro Manila' },
  { name: 'IBM Philippines Inc.', industry: 'Enterprise Cloud & Cognitive Systems', domain: 'ibm.com', city: 'Taguig City', province: 'Metro Manila' },
  { name: 'Google Philippines', industry: 'Search, Cloud & Digital Media', domain: 'google.com', city: 'Taguig City', province: 'Metro Manila' },
  { name: 'Microsoft Philippines', industry: 'Software & Cloud Infrastructure', domain: 'microsoft.com', city: 'Makati City', province: 'Metro Manila' },
  { name: 'Oracle Philippines', industry: 'Database Systems & Enterprise Cloud', domain: 'oracle.com', city: 'Taguig City', province: 'Metro Manila' },
  { name: 'Amazon Web Services (AWS) PH', industry: 'Cloud Computing & Infrastructure', domain: 'amazon.com', city: 'Taguig City', province: 'Metro Manila' },
  { name: 'Shopee Philippines Inc.', industry: 'E-Commerce & Supply Chain Logistics', domain: 'shopee.ph', city: 'Taguig City', province: 'Metro Manila' },
  { name: 'Lazada Philippines', industry: 'E-Commerce Marketplace & FinTech', domain: 'lazada.com.ph', city: 'Taguig City', province: 'Metro Manila' },
  { name: 'Mynt (GCash)', industry: 'Financial Technology & Mobile Payments', domain: 'mynt.xyz', city: 'Taguig City', province: 'Metro Manila' },
  { name: 'Maya Philippines Inc.', industry: 'Digital Banking & Enterprise Payments', domain: 'maya.ph', city: 'Mandaluyong City', province: 'Metro Manila' },
  { name: 'Canva Philippines', industry: 'Graphic Design & Visual Communications', domain: 'canva.com', city: 'Makati City', province: 'Metro Manila' },
  { name: 'TaskUs Philippines', industry: 'Digital Customer Experience & AI Ops', domain: 'taskus.com', city: 'Taguig City', province: 'Metro Manila' },
  { name: 'Teleperformance Philippines', industry: 'Business Process & Technology Services', domain: 'teleperformance.com', city: 'Mandaluyong City', province: 'Metro Manila' },
  { name: 'Concentrix Philippines', industry: 'Customer Experience & Tech Solutions', domain: 'concentrix.com', city: 'Quezon City', province: 'Metro Manila' },
  { name: 'DMCI Holdings Inc.', industry: 'Civil Engineering & Infrastructure', domain: 'dmciholdings.com', city: 'Makati City', province: 'Metro Manila' },
  { name: 'Shell Pilipinas Corporation', industry: 'Energy, Lubricants & Clean Fuels', domain: 'shell.com.ph', city: 'Taguig City', province: 'Metro Manila' },
  { name: 'Nestle Philippines Inc.', industry: 'Consumer Goods & Food Manufacturing', domain: 'nestle.com.ph', city: 'Makati City', province: 'Metro Manila' },
  { name: 'Unilever Philippines', industry: 'Personal Care & Consumer Goods', domain: 'unilever.com.ph', city: 'Taguig City', province: 'Metro Manila' },
  { name: 'Procter & Gamble Philippines (P&G)', industry: 'FMCG Manufacturing & Supply Chain', domain: 'pg.com', city: 'Taguig City', province: 'Metro Manila' },
  { name: 'Monde Nissin Corporation', industry: 'Food Processing & Global Brands', domain: 'mondenissin.com', city: 'Pasig City', province: 'Metro Manila' },
  { name: 'Union Bank of the Philippines', industry: 'Digital Innovation & Retail Banking', domain: 'unionbankph.com', city: 'Pasig City', province: 'Metro Manila' },
  { name: 'Security Bank Corporation', industry: 'Commercial Banking & Treasury', domain: 'securitybank.com', city: 'Makati City', province: 'Metro Manila' },
  { name: 'Rizal Commercial Banking Corp (RCBC)', industry: 'Universal Banking & FinTech DiskarTech', domain: 'rcbc.com', city: 'Makati City', province: 'Metro Manila' },
  { name: 'Maya Bank Inc.', industry: 'Licensed Digital Banking', domain: 'mayabank.ph', city: 'Mandaluyong City', province: 'Metro Manila' },
  { name: 'KCC Malls & Department Stores', industry: 'Retail, Supermarket & Mall Ops', domain: 'kcc.com.ph', city: 'General Santos City', province: 'South Cotabato' },
  { name: 'Pioneer Life & Insurance Group', industry: 'Life & Non-Life Insurance Underwriting', domain: 'pioneer.com.ph', city: 'Makati City', province: 'Metro Manila' },
  { name: 'Sun Life of Canada (Philippines)', industry: 'Wealth Management & Financial Planning', domain: 'sunlife.com.ph', city: 'Taguig City', province: 'Metro Manila' },
  { name: 'Manulife Philippines', industry: 'Life Insurance & Asset Retirement', domain: 'manulife.com.ph', city: 'Makati City', province: 'Metro Manila' },
  { name: 'AIA Philippines (formerly Philam Life)', industry: 'Insurance & Healthcare Protection', domain: 'aia.com.ph', city: 'Taguig City', province: 'Metro Manila' },
  { name: "St. Luke's Medical Center", industry: 'Healthcare & Clinical Research', domain: 'stlukes.com.ph', city: 'Taguig City', province: 'Metro Manila' },
  { name: 'The Medical City Inc.', industry: 'Tertiary Healthcare & Hospital Ops', domain: 'themedicalcity.com', city: 'Pasig City', province: 'Metro Manila' },
  { name: 'Makati Medical Center', industry: 'Clinical Care & Medical Technology', domain: 'makatimed.net.ph', city: 'Makati City', province: 'Metro Manila' },
  { name: 'Asian Hospital and Medical Center', industry: 'Hospital Care & Biomedical Health', domain: 'asianhospital.com', city: 'Muntinlupa City', province: 'Metro Manila' },
  { name: 'Manila Water Company', industry: 'Water Treatment & Environmental Engineering', domain: 'manilawater.com', city: 'Quezon City', province: 'Metro Manila' },
  { name: 'Maynilad Water Services Inc.', industry: 'Municipal Utilities & Civil Works', domain: 'mayniladwater.com.ph', city: 'Quezon City', province: 'Metro Manila' },
  { name: 'TechCore Solutions Inc.', industry: 'Software Engineering & Enterprise Web', domain: 'techcore.ph', city: 'General Santos City', province: 'South Cotabato' }
];

const STAFF_POSITIONS = [
  'Dean of Academic Affairs',
  'College OJT Coordinator',
  'Department Chairperson',
  'Internship Practicum Supervisor',
  'Industry Linkage & Placement Officer',
  'Student Career Adviser',
  'University Practicum Registrar',
  'Academic Compliance Supervisor'
];

const MENTOR_JOB_TITLES = [
  'Lead Software Architect',
  'Senior Full-Stack Web Engineer',
  'Senior Financial Analyst & Controller',
  'HR & Talent Development Specialist',
  'Operations & Supply Chain Director'
];

const JOB_POSTING_TEMPLATES = [
  {
    title: 'Software Development & Cloud Engineering Intern',
    desc: 'Assist in building, testing, and deploying scalable full-stack applications with React, Node.js, and cloud microservices.',
    reqs: 'Knowledge in JavaScript/TypeScript, React or Node.js, Git version control, and relational database fundamentals.',
    slots: 10,
    allowance: 450.00
  },
  {
    title: 'Financial Analysis & Business Accounting Trainee',
    desc: 'Support corporate finance teams in monthly ledger reconciliation, budget forecasting, and financial modeling.',
    reqs: 'Coursework in Financial Management, Accounting Information Systems, Excel financial functions, and reporting.',
    slots: 10,
    allowance: 400.00
  },
  {
    title: 'Human Resource Operations & Recruitment Practicum',
    desc: 'Help coordinate university talent acquisition, screening student intern cohorts, and managing onboarding documentation.',
    reqs: 'Background in HR Management, Psychology, or Business Administration; strong written and oral English communication.',
    slots: 10,
    allowance: 350.00
  },
  {
    title: 'Digital Marketing & Content Strategy Intern',
    desc: 'Create social media campaigns, analyze Google Analytics metrics, and draft company newsletters and copy.',
    reqs: 'Proficiency with Canva, Figma, social media algorithms, SEO principles, and creative content writing.',
    slots: 10,
    allowance: 380.00
  },
  {
    title: 'Operations & Enterprise Logistics Trainee',
    desc: 'Collaborate with supply chain managers in inventory monitoring, logistics ERP updates, and vendor management.',
    reqs: 'Industrial Engineering, Operations Management, or Logistics background with strong problem-solving skills.',
    slots: 10,
    allowance: 420.00
  }
];

// Helper: Escape SQL string literals
function esc(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

// Random integer [min, max]
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Random choice
function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ==========================================
// 2. MAIN SEEDING WORKFLOW
// ==========================================

async function runMassiveSeed() {
  console.log('====================================================');
  console.log('🚀 INTERNCONPH PRODUCTION-SCALE DATABASE SEEDER');
  console.log('====================================================');
  const startTime = Date.now();

  const connection = await pool.getConnection();

  try {
    // 0. Precompute password hash once (blazing fast)
    console.log('Generating base password hash for "Password123!"...');
    const defaultPasswordHash = await bcrypt.hash('Password123!', 10);
    console.log('✅ Base password hash generated.');

    // Fetch master programs from catalog
    const [masterPrograms] = await connection.query('SELECT * FROM master_programs ORDER BY master_program_id ASC');
    if (masterPrograms.length === 0) {
      throw new Error('Master programs catalog is empty. Run standard migrations first.');
    }
    console.log(`Loaded ${masterPrograms.length} degree programs from nationwide CHED catalog.`);

    // ----------------------------------------------------------------
    // STEP 1: Seed / Ensure 20 Educational Institutions & Staff
    // ----------------------------------------------------------------
    console.log('\n--- Step 1: Seeding 20 Institutions & 8 Staff Each (160 Staff) ---');

    const institutionRecords = []; // { instId, code, programs: [] }
    const allStaffRecords = [];   // { staffId, userId, instId, programId }

    for (let i = 0; i < INSTITUTIONS_LIST.length; i++) {
      const instMeta = INSTITUTIONS_LIST[i];
      const directorEmail = `director.${instMeta.code.toLowerCase()}@${instMeta.domain}`;

      // A. Director user
      await connection.query(
        `INSERT INTO users (role_id, email, password_hash, is_active, is_verified, created_at, updated_at)
         VALUES (2, ?, ?, 1, 1, NOW(), NOW())
         ON DUPLICATE KEY UPDATE is_active = 1, is_verified = 1`,
        [directorEmail, defaultPasswordHash]
      );
      const [[userRow]] = await connection.query('SELECT user_id FROM users WHERE email = ?', [directorEmail]);
      const directorUserId = userRow.user_id;

      // B. Institution entity
      await connection.query(
        `INSERT INTO institutions (institution_name, institution_code, address, city, province, postal_code, contact_email, contact_phone, website, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, '1000', ?, '09171234567', ?, 'active', NOW(), NOW())
         ON DUPLICATE KEY UPDATE institution_name = VALUES(institution_name), status = 'active'`,
        [
          instMeta.name,
          instMeta.code,
          `Campus Boulevard, ${instMeta.city}`,
          instMeta.city,
          instMeta.province,
          directorEmail,
          `https://${instMeta.domain}`
        ]
      );

      const [[instRow]] = await connection.query('SELECT * FROM institutions WHERE institution_code = ?', [instMeta.code]);
      const instId = instRow.institution_id;

      // C. Institution registration approval
      await connection.query(
        `INSERT IGNORE INTO institution_registrations (institution_id, submitted_by, status, reviewed_at, created_at, updated_at)
         VALUES (?, ?, 'approved', NOW(), NOW(), NOW())`,
        [instId, directorUserId]
      );

      // D. Curricular Programs: Ensure 22 programs from master catalog
      // 22 programs * 700 students ≈ 15,000 students per institution
      const programsToSeed = masterPrograms.slice(0, 22);
      for (const mp of programsToSeed) {
        await connection.query(
          `INSERT INTO programs (institution_id, program_name, program_code, department, required_ojt_hours, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, NOW(), NOW())
           ON DUPLICATE KEY UPDATE 
             program_name = VALUES(program_name), 
             department = VALUES(department),
             required_ojt_hours = VALUES(required_ojt_hours),
             updated_at = NOW()`,
          [instId, mp.program_name, mp.program_code, mp.discipline, mp.default_ojt_hours || 486]
        );
      }

      const [instPrograms] = await connection.query(
        'SELECT program_id, program_name, program_code, required_ojt_hours FROM programs WHERE institution_id = ? ORDER BY program_id ASC',
        [instId]
      );

      institutionRecords.push({
        instId,
        code: instMeta.code,
        domain: instMeta.domain,
        programs: instPrograms
      });

      // E. 8 Staff Members per Institution
      for (let s = 0; s < 8; s++) {
        const staffPos = STAFF_POSITIONS[s];
        const staffEmail = `staff.${s + 1}.${instMeta.code.toLowerCase()}@${instMeta.domain}`;
        const staffNum = `STF-${instMeta.code}-${1000 + s + 1}`;
        const assignedProg = instPrograms[s % instPrograms.length];

        await connection.query(
          `INSERT INTO users (role_id, email, password_hash, is_active, is_verified, created_at, updated_at)
           VALUES (3, ?, ?, 1, 1, NOW(), NOW())
           ON DUPLICATE KEY UPDATE is_active = 1, is_verified = 1`,
          [staffEmail, defaultPasswordHash]
        );
        const [[stfUser]] = await connection.query('SELECT user_id FROM users WHERE email = ?', [staffEmail]);

        const fName = (s % 2 === 0 ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE)[(i * 8 + s) % 40];
        const lName = LAST_NAMES[(i * 8 + s) % 50];

        await connection.query(
          `INSERT INTO institution_staff (
             user_id, institution_id, program_id, position, employee_id, staff_number,
             first_name, last_name, contact_number, is_active, is_verified, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '09180001122', 1, 1, NOW(), NOW())
           ON DUPLICATE KEY UPDATE 
             position = VALUES(position), 
             program_id = VALUES(program_id), 
             is_active = 1, 
             is_verified = 1`,
          [
            stfUser.user_id,
            instId,
            assignedProg ? assignedProg.program_id : null,
            staffPos,
            staffNum,
            staffNum,
            fName,
            lName
          ]
        );

        const [[staffRow]] = await connection.query('SELECT staff_id FROM institution_staff WHERE user_id = ?', [stfUser.user_id]);
        allStaffRecords.push({
          staffId: staffRow.staff_id,
          userId: stfUser.user_id,
          instId,
          programId: assignedProg ? assignedProg.program_id : null
        });
      }

      console.log(`  ✓ Institution [${i + 1}/20]: ${instMeta.code} (${instMeta.name}) configured with ${instPrograms.length} programs and 8 staff.`);
    }

    console.log(`✅ Total Institutions: ${institutionRecords.length}, Total Staff: ${allStaffRecords.length}`);

    // ----------------------------------------------------------------
    // STEP 2: Seed 50 Organizations + 1 HR + 5 Mentors each (250 Mentors)
    // ----------------------------------------------------------------
    console.log('\n--- Step 2: Seeding 50 Organizations, 1 HR each & 5 Mentors each (250 Mentors total) ---');

    const orgRecords = []; // { orgId, mentors: [] }

    for (let o = 0; o < ORGANIZATIONS_LIST.length; o++) {
      const orgMeta = ORGANIZATIONS_LIST[o];
      const hrEmail = `hr.${orgMeta.domain.replace(/\./g, '_')}@interncon.ph`;

      // A. HR user
      await connection.query(
        `INSERT INTO users (role_id, email, password_hash, is_active, is_verified, created_at, updated_at)
         VALUES (5, ?, ?, 1, 1, NOW(), NOW())
         ON DUPLICATE KEY UPDATE is_active = 1, is_verified = 1`,
        [hrEmail, defaultPasswordHash]
      );
      const [[hrUser]] = await connection.query('SELECT user_id FROM users WHERE email = ?', [hrEmail]);

      // B. Organization record
      await connection.query(
        `INSERT INTO hiring_organizations (
           organization_name, industry, address, city, province, contact_email, contact_phone, website, status, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, '09998887766', ?, 'active', NOW(), NOW())
         ON DUPLICATE KEY UPDATE organization_name = VALUES(organization_name), status = 'active'`,
        [
          orgMeta.name,
          orgMeta.industry,
          `Corporate Center, ${orgMeta.city}`,
          orgMeta.city,
          orgMeta.province,
          hrEmail,
          `https://${orgMeta.domain}`
        ]
      );

      const [[orgRow]] = await connection.query('SELECT organization_id FROM hiring_organizations WHERE contact_email = ?', [hrEmail]);
      const orgId = orgRow.organization_id;

      // C. Registration
      await connection.query(
        `INSERT IGNORE INTO organization_registrations (organization_id, submitted_by, status, reviewed_at, created_at, updated_at)
         VALUES (?, ?, 'approved', NOW(), NOW(), NOW())`,
        [orgId, hrUser.user_id]
      );

      // D. 5 Mentors per Organization (Can handle up to 10 OJT students)
      const mentorsForOrg = [];

      for (let m = 0; m < 5; m++) {
        const mentorEmail = `mentor.${m + 1}.${orgMeta.domain.replace(/\./g, '_')}@interncon.ph`;
        const mentorEmpId = `EMP-${orgId}-${100 + m + 1}`;
        const mentorTitle = MENTOR_JOB_TITLES[m % MENTOR_JOB_TITLES.length];

        await connection.query(
          `INSERT INTO users (role_id, email, password_hash, is_active, is_verified, created_at, updated_at)
           VALUES (5, ?, ?, 1, 1, NOW(), NOW())
           ON DUPLICATE KEY UPDATE is_active = 1, is_verified = 1`,
          [mentorEmail, defaultPasswordHash]
        );
        const [[mUser]] = await connection.query('SELECT user_id FROM users WHERE email = ?', [mentorEmail]);

        const mFirst = (m % 2 === 0 ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE)[(o * 5 + m) % 40];
        const mLast = LAST_NAMES[(o * 5 + m) % 50];

        await connection.query(
          `INSERT INTO organization_staff (
             user_id, organization_id, staff_number, title, first_name, last_name,
             position, job_title, department, work_location, years_of_experience,
             contact_number, is_verified, created_at, updated_at
           ) VALUES (?, ?, ?, 'Engr.', ?, ?, 'workplace_mentor', ?, ?, ?, 5, '09201112233', 1, NOW(), NOW())
           ON DUPLICATE KEY UPDATE 
             position = 'workplace_mentor', 
             job_title = VALUES(job_title), 
             is_verified = 1`,
          [
            mUser.user_id,
            orgId,
            mentorEmpId,
            mFirst,
            mLast,
            mentorTitle,
            orgMeta.industry,
            orgMeta.city
          ]
        );

        const [[mStaffRow]] = await connection.query('SELECT org_staff_id FROM organization_staff WHERE user_id = ?', [mUser.user_id]);

        mentorsForOrg.push({
          mentorId: mStaffRow.org_staff_id,
          userId: mUser.user_id,
          name: `${mFirst} ${mLast}`,
          email: mentorEmail,
          title: mentorTitle
        });
      }

      // E. Job Postings for each mentor (up to 10 slots each)
      const jobsForOrg = [];
      for (let j = 0; j < mentorsForOrg.length; j++) {
        const assignedMentor = mentorsForOrg[j];
        const template = JOB_POSTING_TEMPLATES[j % JOB_POSTING_TEMPLATES.length];

        const [jRes] = await connection.query(
          `INSERT INTO job_postings (
             organization_id, mentor_id, title, description, requirements,
             location, posting_type, job_type, salary_rate, work_setup, slots_available, status, posted_at, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, 'ojt', 'ojt', ?, 'hybrid', 10, 'active', NOW(), NOW(), NOW())`,
          [
            orgId,
            assignedMentor.mentorId,
            `${template.title} (${orgMeta.name})`,
            template.desc,
            template.reqs,
            `${orgMeta.city} / Hybrid`,
            template.allowance
          ]
        );

        jobsForOrg.push({
          jobId: jRes.insertId,
          mentor: assignedMentor
        });
      }

      orgRecords.push({
        orgId,
        name: orgMeta.name,
        mentors: mentorsForOrg,
        jobs: jobsForOrg
      });

      if ((o + 1) % 10 === 0 || o === ORGANIZATIONS_LIST.length - 1) {
        console.log(`  ✓ Organizations configured: ${o + 1}/50`);
      }
    }

    console.log(`✅ Total Organizations: ${orgRecords.length}, Total Workplace Mentors: ${orgRecords.length * 5}`);

    // ----------------------------------------------------------------
    // STEP 3: Generate 15,000 Students per Institution (300,000 Total)
    // ----------------------------------------------------------------
    console.log('\n--- Step 3: Generating up to 15,000 Students per Institution (~300,000 Total) ---');
    console.log('Using high-performance chunked bulk inserts (2,500 students per transaction)...');

    const BATCH_SIZE = 2500;
    const STUDENTS_PER_INSTITUTION = 15000;
    const STUDENTS_PER_PROGRAM = 700;

    let globalStudentCounter = 1;
    const activeOjtCandidateStudents = []; // Store 2,500 students for mentor OJT placement

    for (let instIdx = 0; instIdx < institutionRecords.length; instIdx++) {
      const inst = institutionRecords[instIdx];
      const instPrograms = inst.programs;
      const numPrograms = instPrograms.length; // ~22 programs

      const instStartTime = Date.now();
      let instStudentsInserted = 0;

      // 15,000 students divided into 6 batches of 2,500
      for (let batchOffset = 0; batchOffset < STUDENTS_PER_INSTITUTION; batchOffset += BATCH_SIZE) {
        const currentBatchCount = Math.min(BATCH_SIZE, STUDENTS_PER_INSTITUTION - batchOffset);

        // 1. Prepare User Insert Payload
        const userValues = [];
        const studentMetas = [];

        for (let b = 0; b < currentBatchCount; b++) {
          const studentSeqInInst = batchOffset + b + 1;
          const globalId = globalStudentCounter++;

          // Distribute ~700 students per program
          const progIndex = Math.min(Math.floor((studentSeqInInst - 1) / STUDENTS_PER_PROGRAM), numPrograms - 1);
          const assignedProgram = instPrograms[progIndex];

          const isMale = (globalId % 2 === 0);
          const fName = isMale ? FIRST_NAMES_MALE[globalId % FIRST_NAMES_MALE.length] : FIRST_NAMES_FEMALE[globalId % FIRST_NAMES_FEMALE.length];
          const mName = LAST_NAMES[(globalId * 3) % LAST_NAMES.length];
          const lName = LAST_NAMES[globalId % LAST_NAMES.length];
          const studentNum = `2024-${String(studentSeqInInst).padStart(5, '0')}-${inst.code}`;
          const email = `s.${inst.code.toLowerCase()}.${studentSeqInInst}@${inst.domain}`;

          // Status: 70% active enrolled (2), 20% ongoing OJT (3), 10% completed OJT (4)
          const statusRandom = (globalId % 10);
          let statusId = 2; // active
          let ojtStatus = 'starting_ojt';
          let completedHours = 0;

          if (statusRandom >= 7 && statusRandom <= 8) {
            statusId = 3; // ongoing_ojt
            ojtStatus = 'in_progress';
            completedHours = randInt(120, 350);
          } else if (statusRandom === 9) {
            statusId = 4; // completed_ojt
            ojtStatus = 'completed';
            completedHours = assignedProgram.required_ojt_hours || 486;
          }

          userValues.push(`(4, ${esc(email)}, ${esc(defaultPasswordHash)}, 1, 1, NOW(), NOW())`);
          studentMetas.push({
            instId: inst.instId,
            programId: assignedProgram.program_id,
            studentNum,
            statusId,
            ojtStatus,
            fName,
            mName,
            lName,
            gender: isMale ? 'male' : 'female',
            reqHours: assignedProgram.required_ojt_hours || 486,
            completedHours
          });
        }

        // Execute batch in transaction
        await connection.beginTransaction();

        const [uBatchRes] = await connection.query(
          `INSERT INTO users (role_id, email, password_hash, is_active, is_verified, created_at, updated_at)
           VALUES ${userValues.join(',')}`
        );

        const firstUserId = uBatchRes.insertId;

        // 2. Insert students rows
        const studentValues = [];
        for (let b = 0; b < currentBatchCount; b++) {
          const userId = firstUserId + b;
          const meta = studentMetas[b];

          studentValues.push(
            `(${userId}, ${meta.instId}, ${meta.programId}, ${esc(meta.studentNum)}, 1, 'regular', ${esc(meta.ojtStatus)}, ${meta.statusId}, ${esc(meta.fName)}, ${esc(meta.mName)}, ${esc(meta.lName)}, ${esc(meta.gender)}, '09170002233', 'Metro Manila', 4, ${meta.reqHours}, ${meta.completedHours}, 1, 1, NOW(), NOW())`
          );
        }

        const [sBatchRes] = await connection.query(
          `INSERT INTO students (
             user_id, institution_id, program_id, student_number, category_id,
             classification, ojt_status, status_id, first_name, middle_name,
             last_name, gender, contact_number, address, year_level,
             required_ojt_hours, completed_ojt_hours, is_verified, is_active, created_at, updated_at
           ) VALUES ${studentValues.join(',')}`
        );

        const firstStudentId = sBatchRes.insertId;

        // 3. Insert student_registrations
        const regValues = [];
        const staffAssignValues = [];

        // Find relevant staff for this institution
        const instStaffList = allStaffRecords.filter(st => st.instId === inst.instId);

        for (let b = 0; b < currentBatchCount; b++) {
          const studentId = firstStudentId + b;
          const meta = studentMetas[b];

          regValues.push(`(${studentId}, 'verified', NOW(), NOW(), NOW(), NOW())`);

          if (instStaffList.length > 0) {
            const assignedStaff = instStaffList.find(st => st.programId === meta.programId) || instStaffList[b % instStaffList.length];
            staffAssignValues.push(`(${studentId}, ${assignedStaff.staffId}, 1, NOW(), NOW(), NOW())`);
          }

          // Pick candidate for active OJT placement (up to 2,500 total)
          if (meta.statusId === 3 && activeOjtCandidateStudents.length < 2500) {
            activeOjtCandidateStudents.push({
              studentId,
              programId: meta.programId,
              fName: meta.fName,
              lName: meta.lName,
              reqHours: meta.reqHours,
              completedHours: meta.completedHours
            });
          }
        }

        await connection.query(
          `INSERT INTO student_registrations (student_id, status, submitted_at, verified_at, created_at, updated_at)
           VALUES ${regValues.join(',')}`
        );

        if (staffAssignValues.length > 0) {
          await connection.query(
            `INSERT INTO student_staff_assignments (student_id, staff_id, is_active, assigned_at, created_at, updated_at)
             VALUES ${staffAssignValues.join(',')}`
          );
        }

        await connection.commit();
        instStudentsInserted += currentBatchCount;
      }

      const instElapsed = ((Date.now() - instStartTime) / 1000).toFixed(1);
      console.log(`  ✓ [${instIdx + 1}/20] ${inst.code}: Added ${instStudentsInserted.toLocaleString()} students across ${inst.programs.length} programs in ${instElapsed}s.`);
    }

    const totalStudentsAdded = globalStudentCounter - 1;
    console.log(`\n✅ Generated a total of ${totalStudentsAdded.toLocaleString()} students across all 20 institutions!`);

    // ----------------------------------------------------------------
    // STEP 4: Seed Active OJT Placements (250 Mentors × 10 Interns = 2,500 Placements)
    // ----------------------------------------------------------------
    console.log('\n--- Step 4: Seeding 2,500 Active OJT Placements (10 students per mentor across 50 orgs) ---');

    // Flatten all 250 mentors from the 50 organizations
    const allMentorsFlat = [];
    for (const org of orgRecords) {
      for (const m of org.mentors) {
        // find job for this mentor
        const job = org.jobs.find(j => j.mentor.mentorId === m.mentorId) || org.jobs[0];
        allMentorsFlat.push({
          mentor: m,
          orgId: org.orgId,
          jobId: job ? job.jobId : null
        });
      }
    }

    console.log(`Deploying 10 students to each of the ${allMentorsFlat.length} workplace mentors...`);

    let candidateIdx = 0;
    const ojtInsertValues = [];
    const appInsertValues = [];
    const createdOjtList = [];

    await connection.beginTransaction();

    for (let mIdx = 0; mIdx < allMentorsFlat.length; mIdx++) {
      const { mentor, orgId, jobId } = allMentorsFlat[mIdx];

      // Assign exactly 10 students to this mentor
      for (let s = 0; s < 10; s++) {
        if (candidateIdx >= activeOjtCandidateStudents.length) break;
        const student = activeOjtCandidateStudents[candidateIdx++];

        appInsertValues.push(
          `(${jobId}, ${student.studentId}, 'accepted', NOW(), NOW(), NOW(), NOW())`
        );

        ojtInsertValues.push(
          `(${student.studentId}, ${orgId}, ${student.programId}, '2026-02-01', ${student.reqHours}, ${student.completedHours}, 'ongoing', ${esc(mentor.name)}, ${esc(mentor.email)}, NOW(), NOW())`
        );

        createdOjtList.push({
          studentId: student.studentId,
          mentorId: mentor.mentorId,
          renderedHours: student.completedHours
        });
      }
    }

    // Insert job applications in chunks
    for (let i = 0; i < appInsertValues.length; i += 1000) {
      const chunk = appInsertValues.slice(i, i + 1000);
      await connection.query(
        `INSERT INTO job_applications (job_id, student_id, status, accepted_at, applied_at, created_at, updated_at)
         VALUES ${chunk.join(',')}`
      );
    }

    // Insert OJT records in chunks
    let firstOjtId = null;
    for (let i = 0; i < ojtInsertValues.length; i += 1000) {
      const chunk = ojtInsertValues.slice(i, i + 1000);
      const [res] = await connection.query(
        `INSERT INTO ojt_records (student_id, organization_id, program_id, start_date, required_hours, rendered_hours, status, supervisor_name, supervisor_contact, created_at, updated_at)
         VALUES ${chunk.join(',')}`
      );
      if (firstOjtId === null) firstOjtId = res.insertId;
    }

    await connection.commit();
    console.log(`✅ Successfully seeded ${createdOjtList.length} active OJT placements linked to 250 workplace mentors!`);

    // ----------------------------------------------------------------
    // STEP 5: Seed Attendance Logs & Mentor Evaluations
    // ----------------------------------------------------------------
    console.log('\n--- Step 5: Seeding Daily Time Records (DTRs) & Mentor Evaluations ---');

    await connection.beginTransaction();

    const dtrValues = [];
    const evalValues = [];

    for (let i = 0; i < createdOjtList.length; i++) {
      const ojtId = firstOjtId + i;
      const placement = createdOjtList[i];

      // 5 daily attendance logs per intern
      for (let day = 1; day <= 5; day++) {
        const logDate = `2026-03-0${day}`;
        dtrValues.push(
          `(${ojtId}, ${placement.studentId}, ${placement.mentorId}, '${logDate}', '08:00:00', '17:00:00', 8.00, 'Completed assigned workplace tasks and daily scrum sprint objectives.', 'verified', ${placement.mentorId}, NOW(), NOW(), NOW())`
        );
      }

      // Midterm performance evaluation by mentor
      const rating = (4.3 + (i % 8) * 0.1).toFixed(2);
      evalValues.push(
        `(${ojtId}, ${placement.mentorId}, 'midterm', ${rating}, 'Shows outstanding work ethic, dependable problem-solving, and punctual attendance.', NOW(), NOW(), NOW())`
      );
    }

    // Insert DTRs in batches
    for (let i = 0; i < dtrValues.length; i += 2000) {
      const chunk = dtrValues.slice(i, i + 2000);
      await connection.query(
        `INSERT INTO ojt_attendance_logs (ojt_id, student_id, mentor_id, log_date, time_in, time_out, hours_rendered, tasks_accomplished, status, verified_by, verified_at, created_at, updated_at)
         VALUES ${chunk.join(',')}`
      );
    }

    // Insert evaluations in batches
    for (let i = 0; i < evalValues.length; i += 1000) {
      const chunk = evalValues.slice(i, i + 1000);
      await connection.query(
        `INSERT INTO ojt_performance_records (ojt_id, evaluator_id, evaluation_period, rating, comments, evaluated_at, created_at, updated_at)
         VALUES ${chunk.join(',')}`
      );
    }

    await connection.commit();
    console.log(`✅ Seeded ${dtrValues.length.toLocaleString()} verified DTR attendance logs and ${evalValues.length.toLocaleString()} mentor evaluations!`);

    // ----------------------------------------------------------------
    // STEP 6: Seed Institution Requirements
    // ----------------------------------------------------------------
    console.log('\n--- Step 6: Seeding Institution OJT Requirements ---');

    const STANDARD_REQS = [
      'Memorandum of Agreement (MOA) with Industry Partner',
      'Medical Certificate & Physical Examination Clearance',
      'Notarized Parent / Guardian Consent Form',
      'Endorsement Letter from University Dean',
      'Certificate of Registration (COR) - Current Academic Term'
    ];

    for (const inst of institutionRecords) {
      for (const reqName of STANDARD_REQS) {
        await connection.query(
          `INSERT IGNORE INTO ojt_requirements (institution_id, requirement_name, description, is_mandatory, created_at, updated_at)
           VALUES (?, ?, ?, 1, NOW(), NOW())`,
          [inst.instId, reqName, `Required prerequisite document for student OJT cohort clearance under ${inst.code}.`]
        );
      }
    }

    console.log('✅ Institutional prerequisite requirements seeded across all 20 institutions.');

    const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n====================================================');
    console.log(`🎉 MASSIVE DATA SEEDING COMPLETE IN ${totalSeconds}s!`);
    console.log('====================================================');
    console.log(`• Institutions: ${institutionRecords.length}`);
    console.log(`• Institution Staff: ${allStaffRecords.length} (8 per institution)`);
    console.log(`• Programs: 22 per institution (~700 students per program)`);
    console.log(`• Students: ${totalStudentsAdded.toLocaleString()} (15,000 per institution)`);
    console.log(`• Organizations: ${orgRecords.length}`);
    console.log(`• Workplace Mentors: ${orgRecords.length * 5} (5 per organization)`);
    console.log(`• Active OJT Interns: ${createdOjtList.length} (10 per mentor)`);
    console.log(`• Verified DTR Logs: ${dtrValues.length.toLocaleString()}`);
    console.log(`• Mentor Evaluations: ${evalValues.length.toLocaleString()}`);
    console.log('• Default Password for all accounts: "Password123!"');
    console.log('====================================================');

    connection.release();
    process.exit(0);
  } catch (err) {
    connection.release();
    console.error('❌ SEEDING FATAL ERROR:', err);
    process.exit(1);
  }
}

runMassiveSeed();
