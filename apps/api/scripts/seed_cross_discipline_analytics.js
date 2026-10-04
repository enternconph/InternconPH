import pool from './src/config/db.js';
import { PROGRAM_SKILLS_CATALOG } from './src/data/programSkillsData.js';

async function seedCrossDisciplineAnalytics() {
  console.log('=== SEEDING COMPREHENSIVE CROSS-DISCIPLINE SKILLS & ANALYTICS ===');

  // 1. Ensure all categories exist in skill_categories
  const categories = [
    { id: 1, name: 'Technical Skills' },
    { id: 2, name: 'Soft Skills' },
    { id: 3, name: 'Design & Creative' },
    { id: 4, name: 'Business & Management' }
  ];
  for (const cat of categories) {
    await pool.query(
      `INSERT INTO skill_categories (category_id, category_name) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE category_name = VALUES(category_name)`,
      [cat.id, cat.name]
    );
  }

  // 2. Ensure all skills from PROGRAM_SKILLS_CATALOG exist in `skills` table
  console.log('Syncing skills taxonomy to database...');
  const skillIdMap = new Map(); // skill_name.toLowerCase() -> skill_id

  // Load existing skills
  const [existingSkills] = await pool.query('SELECT skill_id, skill_name FROM skills');
  for (const s of existingSkills) {
    skillIdMap.set(s.skill_name.toLowerCase().trim(), s.skill_id);
  }

  for (const [pCode, pData] of Object.entries(PROGRAM_SKILLS_CATALOG)) {
    for (const skill of pData.skills) {
      const lower = skill.name.toLowerCase().trim();
      if (!skillIdMap.has(lower)) {
        let catId = 1;
        if (skill.category === 'Soft Skills') catId = 2;
        else if (skill.category === 'Design & Creative') catId = 3;
        else if (skill.category === 'Business & Management') catId = 4;

        const [res] = await pool.query(
          `INSERT INTO skills (skill_name, category_id) VALUES (?, ?)`,
          [skill.name, catId]
        );
        skillIdMap.set(lower, res.insertId);
      }
    }
  }
  console.log(`Skills database synced. Total tracked skills: ${skillIdMap.size}`);

  // 3. Ensure specialized hiring organizations exist for all key disciplines
  const extraOrgs = [
    {
      id: 60,
      name: 'Department of Education - South Cotabato Division',
      industry: 'Education & Academic Training',
      address: 'Alunan Avenue, Koronadal City, South Cotabato',
      email: 'hr@deped-southcotabato.gov.ph',
      phone: '083-228-3801'
    },
    {
      id: 61,
      name: 'Philippine National Police - Regional Crime Laboratory & Forensics',
      industry: 'Public Safety, Law Enforcement & Forensics',
      address: 'Camp Fermin Lira, General Santos City',
      email: 'forensics.r12@pnp.gov.ph',
      phone: '083-552-3211'
    },
    {
      id: 62,
      name: 'Dole Philippines Inc. / Agro-Industrial Division',
      industry: 'Agriculture, Post-Harvest & Biosystems',
      address: 'Polomolok, South Cotabato',
      email: 'careers.agro@dolephilippines.com',
      phone: '083-500-2500'
    },
    {
      id: 63,
      name: 'Notre Dame Educational Association (NDEA) Central Office',
      industry: 'Education & Institutional Leadership',
      address: 'Cotabato City / Regional Hub',
      email: 'hr@ndea.edu.ph',
      phone: '064-421-2900'
    },
    {
      id: 64,
      name: 'Philippine Coast Guard Auxiliary / Maritime Safety District',
      industry: 'Maritime Navigation & Marine Safety',
      address: 'Makar Wharf, General Santos City',
      email: 'auxiliary.r12@coastguard.gov.ph',
      phone: '083-553-2940'
    }
  ];

  for (const org of extraOrgs) {
    await pool.query(
      `INSERT INTO hiring_organizations 
       (organization_id, organization_name, industry, address, contact_email, contact_phone, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')
       ON DUPLICATE KEY UPDATE 
         organization_name = VALUES(organization_name), 
         industry = VALUES(industry),
         status = 'active'`,
      [org.id, org.name, org.industry, org.address, org.email, org.phone]
    );
  }

  // 4. Map organizations to their respective disciplines
  const orgMap = {
    computing: [8, 25, 26, 27, 28, 58], // TechCore, Google, Microsoft, Oracle, AWS, TechCore
    business: [13, 14, 21, 31, 32, 43, 44, 45, 46], // BDO, BPI, Metrobank, GCash, Maya, UnionBank, Security Bank, RCBC, Maya Bank
    engineering: [37, 56, 57, 17, 38], // DMCI, Manila Water, Maynilad, Aboitiz, Shell
    healthcare: [52, 53, 54, 55], // St. Luke's, Medical City, Makati Med, Asian Hospital
    hospitality: [7, 18, 47, 20], // The Farm, Jollibee, KCC Malls, Robinsons
    education: [60, 63], // DepEd, NDEA
    criminology: [61], // PNP Forensics
    arts: [33, 6], // Canva, Marbel Worx
    agriculture: [62], // Dole Philippines
    maritime: [64] // Coast Guard Auxiliary
  };

  // Helper: Find skill ID by name
  function getSkillId(name) {
    const s = skillIdMap.get(name.toLowerCase().trim());
    if (s) return s;
    for (const [key, id] of skillIdMap.entries()) {
      if (key.includes(name.toLowerCase().trim()) || name.toLowerCase().trim().includes(key)) {
        return id;
      }
    }
    return null;
  }

  // Helper: Find all DB program_ids for a program_code
  const [dbPrograms] = await pool.query('SELECT program_id, program_code, department FROM programs');
  const codeToProgIds = new Map();
  for (const p of dbPrograms) {
    if (!codeToProgIds.has(p.program_code)) {
      codeToProgIds.set(p.program_code, []);
    }
    codeToProgIds.get(p.program_code).push(p.program_id);
  }

  // 5. Build rich, realistic cross-discipline job postings
  const disciplineJobBlueprints = [
    // ─── HEALTHCARE & MEDICAL ───
    {
      disciplineKey: 'healthcare',
      programCodes: ['BSN'],
      title: 'Clinical Nursing & Patient Care Practicum',
      description: 'Supervised nursing internship rotating through medical-surgical wards, emergency triage, and outpatient clinical care. Practice sterile wound management and vital sign telemetry under senior preceptors.',
      slots: 6,
      skills: ['Patient Care & Clinical Assessment', 'Basic Life Support (BLS / CPR)', 'Clinical Documentation & EHR Systems', 'Pharmacology & Medication Administration', 'Infection Control & Sterile Techniques', 'Wound Dressing & Post-Operative Care']
    },
    {
      disciplineKey: 'healthcare',
      programCodes: ['BSMLS'],
      title: 'Medical Laboratory Science & Diagnostics Intern',
      description: 'Hands-on clinical internship in hematology, clinical chemistry, immunohematology, and automated diagnostic analyzer operation in an accredited hospital laboratory.',
      slots: 4,
      skills: ['Laboratory Diagnostics & Hematology', 'Phlebotomy & Specimen Collection', 'Clinical Chemistry & Automated Analyzers', 'Blood Banking & Immunohematology', 'Microbiology & Culture Sensitivities']
    },
    {
      disciplineKey: 'healthcare',
      programCodes: ['BSPHARM'],
      title: 'Hospital & Clinical Pharmacy Intern',
      description: 'Internship covering inpatient medication dispensing, drug interaction screening, sterile IV compounding, and patient pharmacotherapy counseling.',
      slots: 3,
      skills: ['Dispensing & Community Pharmacy', 'Pharmacology & Drug Interactions', 'Sterile Compounding & IV Admixture', 'Patient Counseling on Medications', 'Clinical Pharmacy Practice']
    },
    {
      disciplineKey: 'healthcare',
      programCodes: ['BSM'],
      title: 'Maternal Care & Clinical Midwifery Practicum',
      description: 'Clinical internship focused on prenatal assessment, normal spontaneous delivery assistance, immediate postpartum care, and newborn APGAR monitoring.',
      slots: 4,
      skills: ['Prenatal Care & Fetal Heart Monitoring', 'Normal Spontaneous Delivery (NSD) Assistance', 'Newborn Immediate Care & APGAR Scoring', 'Postpartum Care & Lactation Counseling', 'Maternal & Child Healthcare']
    },

    // ─── ENGINEERING & ARCHITECTURE ───
    {
      disciplineKey: 'engineering',
      programCodes: ['BSCE'],
      title: 'Civil Engineering Infrastructure & Site Supervision Intern',
      description: 'Field and office engineering internship assisting project managers with structural inspection, AutoCAD drafting, concrete quality testing, and bill of quantities (BOQ) preparation.',
      slots: 5,
      skills: ['AutoCAD', 'Structural Analysis & Design (STAAD/ETABS)', 'BIM / Revit Structure', 'Construction Management & Costing', 'Total Station & Topographic Surveying', 'Cost Estimation & Quantity Surveying']
    },
    {
      disciplineKey: 'engineering',
      programCodes: ['BSARCH'],
      title: 'Architectural Design & BIM Modeling Trainee',
      description: 'Collaborate with principal architects in schematic design, building code compliance review, 3D visualization, and Revit BIM documentation for commercial developments.',
      slots: 4,
      skills: ['BIM / Revit Architecture', 'AutoCAD Drafting', 'SketchUp & 3D Architectural Rendering', 'National Building Code (PD 1096) Compliance', 'Architectural Working Drawings & Detailing']
    },
    {
      disciplineKey: 'engineering',
      programCodes: ['BSEE'],
      title: 'Electrical Power Systems & Building Services Trainee',
      description: 'Hands-on training in commercial electrical system design, Philippine Electrical Code (PEC) compliance, motor control centers, and backup generator telemetry.',
      slots: 4,
      skills: ['Electrical Building Wiring & PEC Code', 'AutoCAD Electrical Design', 'Power Distribution & Load Scheduling', 'Motor Controls & Industrial Wiring', 'PLC Programming & SCADA Automation']
    },
    {
      disciplineKey: 'engineering',
      programCodes: ['BSME'],
      title: 'Mechanical Systems & HVAC Engineering Intern',
      description: 'Assist in the inspection, preventive maintenance, and thermal load calculation of central chiller plants, industrial cooling towers, and pneumatic piping.',
      slots: 3,
      skills: ['HVAC Systems Design & Maintenance', 'SolidWorks 3D CAD Modeling', 'Preventive Maintenance Planning & TPM', 'Refrigeration Cycle Diagnostics', 'Piping & Instrumentation Diagrams (P&ID)']
    },
    {
      disciplineKey: 'engineering',
      programCodes: ['BSIE'],
      title: 'Industrial Engineering & Operations Optimization Intern',
      description: 'Apply Lean Six Sigma, time and motion studies, line balancing, and plant layout optimization to improve plant throughput and eliminate manufacturing waste.',
      slots: 5,
      skills: ['Lean Six Sigma & Statistical Process Control (SPC)', 'Time & Motion Study / Ergonomics', 'Supply Chain Analytics & Demand Forecasting', 'Facility Layout & Material Flow Optimization']
    },

    // ─── BUSINESS, FINANCE & ACCOUNTANCY ───
    {
      disciplineKey: 'business',
      programCodes: ['BSA', 'BSMA', 'BSIA'],
      title: 'Audit, Assurance & Corporate Taxation Trainee',
      description: 'Assist certified public accountants with audit working papers, substantive balance testing, internal control walkthroughs, and corporate tax compliance filings.',
      slots: 6,
      skills: ['Financial Accounting', 'Auditing & Assurance', 'Taxation & Tax Compliance', 'Cost Accounting', 'QuickBooks', 'Excel Advanced Financial Modeling']
    },
    {
      disciplineKey: 'business',
      programCodes: ['BSBA-FM'],
      title: 'Financial Analysis & Portfolio Management Intern',
      description: 'Perform financial ratio analysis, DCF valuation modeling, corporate budget variance reconciliation, and treasury cash flow forecasting.',
      slots: 5,
      skills: ['Financial Modeling', 'Excel Advanced Financial Modeling', 'Financial Accounting', 'Working Capital Management', 'Risk Management & Hedging']
    },
    {
      disciplineKey: 'business',
      programCodes: ['BSBA-MM'],
      title: 'Digital Marketing, Brand Growth & Market Intelligence Intern',
      description: 'Plan omnichannel promotional campaigns, conduct customer demographic research, track SEO/SEM performance metrics, and create social engagement copy.',
      slots: 6,
      skills: ['Digital Marketing Strategy', 'Social Media Marketing & Analytics', 'Search Engine Optimization (SEO)', 'Market Research & Consumer Insights', 'Brand Management & Campaign Execution']
    },
    {
      disciplineKey: 'business',
      programCodes: ['BSBA-HRM', 'BSPSY'],
      title: 'Human Resource Operations & Talent Acquisition Intern',
      description: 'Manage candidate screening pipelines, organize onboarding orientation, administer psychometric assessments, and interpret Philippine Labor Code policies.',
      slots: 5,
      skills: ['Talent Acquisition & Recruitment', 'Employee Relations & Labor Code', 'Compensation & Benefits Administration', 'Training & Development Program Design', 'HRIS Data Management']
    },
    {
      disciplineKey: 'business',
      programCodes: ['BSCA'],
      title: 'Customs Brokerage, Tariff & Supply Chain Trainee',
      description: 'Support licensed customs brokers with import/export documentation, ASEAN Harmonized Tariff Nomenclature classification, and BOC e2m customs lodgement.',
      slots: 4,
      skills: ['Customs Clearance & Documentation', 'Tariff Classification & Rules of Origin', 'Import/Export Procedures (BOC e2m)', 'Freight Forwarding Operations', 'Bonded Warehouse Management']
    },

    // ─── HOSPITALITY & TOURISM ───
    {
      disciplineKey: 'hospitality',
      programCodes: ['BSHM', 'BSHRM'],
      title: 'Hotel Front Office Operations & Guest Relations Trainee',
      description: 'Immersive hotel management internship utilizing Opera PMS for reservations, room inventory control, VIP concierge service, and guest dispute resolution.',
      slots: 6,
      skills: ['Front Office Operations (Opera PMS)', 'Food & Beverage Service', 'HACCP & Food Safety Protocols', 'Hotel Housekeeping Standards', 'Event Management & Banqueting']
    },
    {
      disciplineKey: 'hospitality',
      programCodes: ['BSCM'],
      title: 'Culinary Arts & Hot Kitchen Commis Practicum',
      description: 'Work alongside executive chefs in classical culinary stations, butchery, knife skill mastery, HACCP sanitary compliance, and banquet menu execution.',
      slots: 5,
      skills: ['Culinary Arts & Kitchen Operations', 'HACCP & Food Safety Protocols', 'Culinary Knife Skills & Mise en Place', 'Baking & Pastry Arts Production', 'Food Costing & Menu Engineering']
    },
    {
      disciplineKey: 'hospitality',
      programCodes: ['BSTM'],
      title: 'Travel Agency Operations & Ecotourism Coordinator Trainee',
      description: 'Coordinate domestic and international tour itineraries, execute flight bookings via Amadeus GDS, design sustainable eco-tours, and facilitate group logistics.',
      slots: 5,
      skills: ['Amadeus / Sabre GDS Flight Booking', 'Tourism Tour Guiding & Itinerary Planning', 'Destination Marketing & Sustainable Tourism', 'MICE Management & Conference Planning', 'Ticketing & Travel Documentation']
    },

    // ─── EDUCATION & TEACHER TRAINING ───
    {
      disciplineKey: 'education',
      programCodes: ['BSED-ENG', 'BSED-MATH', 'BSED-SCI', 'BEED', 'BSNED'],
      title: 'Practice Teaching & Instructional Design Intern',
      description: 'Supervised classroom practice teaching, daily lesson plan (DLP) formulation aligned with DepEd MATATAG curriculum, summative assessment drafting, and LMS management.',
      slots: 8,
      skills: ['Curriculum Development & Lesson Planning', 'Classroom Management', 'Student Assessment & Evaluation', 'Educational Technology & LMS', 'Differentiated Instruction', 'Remedial Reading & Literacy Instruction']
    },

    // ─── CRIMINOLOGY & PUBLIC SAFETY ───
    {
      disciplineKey: 'criminology',
      programCodes: ['BSCRIM'],
      title: 'Forensic Science, Crime Scene Processing & Patrol Trainee',
      description: 'Field and laboratory practicum in physical evidence collection, latent fingerprint dactyloscopy, ballistic firearm examination, and sworn police affidavit drafting.',
      slots: 6,
      skills: ['Criminal Investigation & Crime Scene Processing', 'Forensic Dactyloscopy (Fingerprint Analysis)', 'Forensic Ballistics & Firearms ID', 'Police Patrol Tactics & Sworn Affidavits', 'Criminal Law & Jurisprudence', 'Traffic Accident Investigation']
    },

    // ─── ARTS, DESIGN & MEDIA ───
    {
      disciplineKey: 'arts',
      programCodes: ['BMMA', 'BFA'],
      title: 'Multimedia Design, Motion Graphics & UI/UX Intern',
      description: 'Create brand identities, motion graphics, video reels, high-fidelity UI wireframes in Figma, and marketing collateral for print and digital channels.',
      slots: 5,
      skills: ['Figma', 'UI/UX Design', 'Graphic Design', 'Adobe Photoshop', 'Adobe Illustrator', 'Video Editing & Motion Graphics', '2D/3D Animation Fundamentals']
    },

    // ─── AGRICULTURE & ENVIRONMENT ───
    {
      disciplineKey: 'agriculture',
      programCodes: ['BSAGRI', 'BSES', 'BSABE'],
      title: 'Agronomy, Precision Agriculture & Environmental Assessment Intern',
      description: 'Field practicum in soil chemistry analysis, integrated pest management (IPM), precision irrigation control, and environmental impact assessment (EIA) surveys.',
      slots: 5,
      skills: ['Crop Production & Agronomy', 'Soil Fertility & Fertilizer Management', 'Pest & Disease Management (IPM)', 'Environmental Impact Assessment (EIA)', 'GIS & Remote Sensing for Agriculture', 'Hydroponics & Greenhouse Operations']
    },

    // ─── COMPUTING & INFORMATION TECHNOLOGY ───
    {
      disciplineKey: 'computing',
      programCodes: ['BSIT', 'BSCS', 'BSSE'],
      title: 'Full-Stack Software Development & Cloud Engineering Intern',
      description: 'Design and build resilient full-stack applications with React, Node.js, and SQL, implementing CI/CD pipelines and microservices on AWS cloud infrastructure.',
      slots: 6,
      skills: ['JavaScript', 'TypeScript', 'React.js', 'Node.js', 'SQL', 'Python', 'Tailwind CSS', 'Docker', 'AWS Cloud', 'Git/Version Control', 'RESTful API Development']
    },
    {
      disciplineKey: 'computing',
      programCodes: ['BSCSB'],
      title: 'Cybersecurity Analyst & Threat Hunting Practicum',
      description: 'Participate in SOC operations, vulnerability scans, network packet capture analysis, SIEM log monitoring, and incident remediation.',
      slots: 4,
      skills: ['Ethical Hacking & Penetration Testing', 'Network Security & Firewalls', 'SIEM & Incident Response', 'Linux System Admin', 'Cybersecurity Fundamentals']
    },
    {
      disciplineKey: 'computing',
      programCodes: ['BSDSA'],
      title: 'Data Science, Analytics & Machine Learning Intern',
      description: 'Extract actionable business insights from large-scale datasets using Python, Pandas, statistical modeling, and Power BI dashboard visualization.',
      slots: 4,
      skills: ['Python', 'Data Analysis', 'Machine Learning', 'Artificial Intelligence', 'SQL', 'Business Intelligence (Power BI)']
    }
  ];

  console.log('Seeding job postings and skill requirements...');
  let totalJobsCreated = 0;
  let totalSkillsLinked = 0;
  let totalProgramsLinked = 0;

  for (const bp of disciplineJobBlueprints) {
    const orgPool = orgMap[bp.disciplineKey] || [8];
    // Create 1-2 distinct job postings per blueprint using different orgs
    for (let i = 0; i < Math.min(2, orgPool.length); i++) {
      const orgId = orgPool[i];
      const [orgRow] = await pool.query('SELECT organization_name FROM hiring_organizations WHERE organization_id = ?', [orgId]);
      const orgName = orgRow[0]?.organization_name || 'Partner Employer';

      const jobTitle = `${bp.title} (${orgName.split(' ')[0]})`;

      // Insert job posting
      const [jobRes] = await pool.query(
        `INSERT INTO job_postings 
         (organization_id, title, description, requirements, posting_type, job_type, location, target_audience, work_setup, slots_available, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'internship', 'full_time', 'General Santos / Koronadal / Metro Manila', 'students', 'hybrid', ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [orgId, jobTitle, bp.description, 'Enrolled college student in related degree program with foundational coursework and good academic standing.', bp.slots]
      );
      const jobId = jobRes.insertId;
      totalJobsCreated++;

      // Link job_required_programs
      for (const pCode of bp.programCodes) {
        const progIds = codeToProgIds.get(pCode) || [];
        for (const progId of progIds) {
          await pool.query(
            `INSERT IGNORE INTO job_required_programs (job_id, program_id, is_mandatory)
             VALUES (?, ?, 1)`,
            [jobId, progId]
          );
          totalProgramsLinked++;
        }
      }

      // Link job_required_skills
      for (const sName of bp.skills) {
        const skillId = getSkillId(sName);
        if (skillId) {
          await pool.query(
            `INSERT IGNORE INTO job_required_skills (job_id, skill_id, importance)
             VALUES (?, ?, 'required')`,
            [jobId, skillId]
          );
          totalSkillsLinked++;
        }
      }
    }
  }

  console.log(`Created ${totalJobsCreated} cross-discipline job postings.`);
  console.log(`Linked ${totalProgramsLinked} program requirements and ${totalSkillsLinked} skill requirements.`);

  // 6. Seed student skills across students for all programs in the database!
  console.log('Seeding student competencies across all academic programs...');
  let totalStudentSkillsAdded = 0;

  for (const [pCode, pData] of Object.entries(PROGRAM_SKILLS_CATALOG)) {
    // Find up to 15 students enrolled in this program
    const [studentsInProg] = await pool.query(
      `SELECT s.student_id 
       FROM students s 
       JOIN programs p ON s.program_id = p.program_id 
       WHERE p.program_code = ? 
       LIMIT 15`,
      [pCode]
    );

    if (studentsInProg.length === 0) continue;

    // Get skill IDs for this program
    const progSkillIds = pData.skills
      .map(s => getSkillId(s.name))
      .filter(id => id !== null);

    if (progSkillIds.length === 0) continue;

    for (const student of studentsInProg) {
      // Assign 3 to 6 skills from this program
      const numSkillsToAssign = Math.min(progSkillIds.length, 3 + Math.floor(Math.random() * 4));
      const shuffled = [...progSkillIds].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, numSkillsToAssign);

      const levels = ['intermediate', 'advanced', 'beginner'];
      for (const sId of selected) {
        const level = levels[Math.floor(Math.random() * levels.length)];
        const [res] = await pool.query(
          `INSERT IGNORE INTO student_skills (student_id, skill_id, proficiency_level, created_at, updated_at)
           VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [student.student_id, sId, level]
        );
        if (res.affectedRows > 0) totalStudentSkillsAdded++;
      }
    }
  }

  console.log(`Seeded ${totalStudentSkillsAdded} student skills across diverse degree programs.`);

  // 7. Update skill_demand_statistics to reflect real employer demand and student talent pool
  console.log('Recalculating skill_demand_statistics...');
  // Total demand = (job demand * 3) + student count
  const [aggregatedDemand] = await pool.query(`
    SELECT 
      s.skill_id, 
      COALESCE(jCount.cnt, 0) * 3 + COALESCE(sCount.cnt, 0) as total_demand
    FROM skills s
    LEFT JOIN (
      SELECT skill_id, COUNT(*) as cnt FROM job_required_skills GROUP BY skill_id
    ) jCount ON s.skill_id = jCount.skill_id
    LEFT JOIN (
      SELECT skill_id, COUNT(*) as cnt FROM student_skills GROUP BY skill_id
    ) sCount ON s.skill_id = sCount.skill_id
    WHERE COALESCE(jCount.cnt, 0) > 0 OR COALESCE(sCount.cnt, 0) > 0
  `);

  for (const row of aggregatedDemand) {
    await pool.query(
      `INSERT INTO skill_demand_statistics (skill_id, period_start, period_end, demand_count, created_at, updated_at)
       VALUES (?, CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY), ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE demand_count = VALUES(demand_count), updated_at = CURRENT_TIMESTAMP`,
      [row.skill_id, Math.max(1, row.total_demand)]
    );
  }

  console.log(`Updated skill_demand_statistics for ${aggregatedDemand.length} skills across all disciplines.`);
  console.log('=== CROSS-DISCIPLINE SEEDING COMPLETE! ===');
  process.exit(0);
}

seedCrossDisciplineAnalytics().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
