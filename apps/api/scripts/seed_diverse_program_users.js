import bcrypt from 'bcryptjs';
import pool from './src/config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to create valid sample PDF for portfolio items
function createSamplePdf(title, program) {
  const content = `BT /F1 16 Tf 72 720 Td (${title}) Tj /F1 11 Tf 72 690 Td (InternCon.ph - Verified Student Career Portfolio Document | ${program}) Tj ET`;
  const streamLen = Buffer.byteLength(content);
  return `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLen} >>
stream
${content}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000234 00000 n 
0000000320 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
410
%%EOF`;
}

// 30 Diverse Student Users across all major disciplines & CHED academic programs
const DIVERSE_STUDENTS = [
  // ─── 1. COMPUTING & INFORMATION TECHNOLOGY ───
  {
    email: 'student.it@interncon.ph',
    altEmail: 'student.it@gmail.com',
    firstName: 'Denmark',
    middleName: 'Nemis',
    lastName: 'Catolico',
    gender: 'male',
    programCode: 'BSIT',
    programName: 'BS Information Technology',
    department: 'Information Technology & Computing',
    instCode: 'NDMU',
    requiredHours: 600,
    completedHours: 240,
    studentNumber: '2024-10001',
    initialSkills: ['JavaScript', 'React.js', 'Tailwind CSS', 'Git/Version Control']
  },
  {
    email: 'student.cs@interncon.ph',
    altEmail: 'student.cs@gmail.com',
    firstName: 'Carlo Miguel',
    middleName: 'Santos',
    lastName: 'Dizon',
    gender: 'male',
    programCode: 'BSCS',
    programName: 'BS Computer Science',
    department: 'Information Technology & Computing',
    instCode: 'SEAIT',
    requiredHours: 600,
    completedHours: 280,
    studentNumber: '2024-10002',
    initialSkills: ['Python', 'Data Structures & Algorithms', 'C++ Object-Oriented Programming', 'Git/Version Control']
  },
  {
    email: 'student.cpe@interncon.ph',
    altEmail: 'student.cpe@gmail.com',
    firstName: 'Raphael John',
    middleName: 'Tan',
    lastName: 'Villanueva',
    gender: 'male',
    programCode: 'BSCPE',
    programName: 'BS Computer Engineering',
    department: 'Information Technology & Computing',
    instCode: 'UPD',
    requiredHours: 600,
    completedHours: 210,
    studentNumber: '2024-10003',
    initialSkills: ['Embedded C/C++ Programming', 'Linux System Admin', 'Python', 'Digital Logic Design']
  },
  {
    email: 'student.data@interncon.ph',
    altEmail: 'student.data@gmail.com',
    firstName: 'Patricia Mae',
    middleName: 'Lopez',
    lastName: 'Gomez',
    gender: 'female',
    programCode: 'BSDSA',
    programName: 'BS Data Science and Analytics',
    department: 'Information Technology & Computing',
    instCode: 'DLSU',
    requiredHours: 500,
    completedHours: 190,
    studentNumber: '2024-10004',
    initialSkills: ['Python', 'SQL', 'Data Analysis', 'Excel / Advanced Spreadsheets']
  },
  {
    email: 'student.cyber@interncon.ph',
    altEmail: 'student.cyber@gmail.com',
    firstName: 'Christian Paul',
    middleName: 'Bautista',
    lastName: 'Cruz',
    gender: 'male',
    programCode: 'BSCSB',
    programName: 'BS Cybersecurity',
    department: 'Information Technology & Computing',
    instCode: 'MAPUA',
    requiredHours: 600,
    completedHours: 320,
    studentNumber: '2024-10005',
    initialSkills: ['Cybersecurity Fundamentals', 'Linux System Admin', 'Network Security & Firewalls', 'Ethical Hacking & Penetration Testing']
  },

  // ─── 2. BUSINESS & ACCOUNTANCY ───
  {
    email: 'student.bsa@interncon.ph',
    altEmail: 'student.bsa@gmail.com',
    firstName: 'Alyssa Marie',
    middleName: 'Fernandez',
    lastName: 'Santos',
    gender: 'female',
    programCode: 'BSA',
    programName: 'BS Accountancy',
    department: 'Business & Accountancy',
    instCode: 'UST',
    requiredHours: 600,
    completedHours: 300,
    studentNumber: '2024-10006',
    initialSkills: ['Financial Accounting', 'QuickBooks Online', 'Excel Advanced Financial Modeling', 'Taxation & Tax Compliance (BIR)']
  },
  {
    email: 'student.ais@interncon.ph',
    altEmail: 'student.ais@gmail.com',
    firstName: 'John Vincent',
    middleName: 'Morales',
    lastName: 'Alcantara',
    gender: 'male',
    programCode: 'BSAIS',
    programName: 'BS Accounting Information Systems',
    department: 'Business & Accountancy',
    instCode: 'PUP',
    requiredHours: 600,
    completedHours: 250,
    studentNumber: '2024-10007',
    initialSkills: ['Financial Accounting', 'SQL', 'QuickBooks', 'Database Design']
  },
  {
    email: 'student.finance@interncon.ph',
    altEmail: 'student.finance@gmail.com',
    firstName: 'Bea Bianca',
    middleName: 'Reyes',
    lastName: 'Alonzo',
    gender: 'female',
    programCode: 'BSBA-FM',
    programName: 'BS Business Administration - Financial Management',
    department: 'Business & Accountancy',
    instCode: 'FEU',
    requiredHours: 600,
    completedHours: 340,
    studentNumber: '2024-10008',
    initialSkills: ['Financial Accounting', 'Excel Advanced Financial Modeling', 'Cost Accounting & Budgeting', 'Financial Statement Analysis']
  },
  {
    email: 'student.marketing@interncon.ph',
    altEmail: 'student.marketing@gmail.com',
    firstName: 'Gabriel Vance',
    middleName: 'Co',
    lastName: 'Lim',
    gender: 'male',
    programCode: 'BSBA-MM',
    programName: 'BS Business Administration - Marketing Management',
    department: 'Business & Accountancy',
    instCode: 'ADMU',
    requiredHours: 600,
    completedHours: 270,
    studentNumber: '2024-10009',
    initialSkills: ['Digital Marketing', 'Search Engine Optimization (SEO)', 'Social Media Management', 'Market Research']
  },
  {
    email: 'student.hr@interncon.ph',
    altEmail: 'student.hr@gmail.com',
    firstName: 'Camille Joy',
    middleName: 'Navarro',
    lastName: 'Flores',
    gender: 'female',
    programCode: 'BSBA-HRM',
    programName: 'BS Business Administration - Human Resource Management',
    department: 'Business & Accountancy',
    instCode: 'SLU',
    requiredHours: 600,
    completedHours: 220,
    studentNumber: '2024-10010',
    initialSkills: ['Talent Acquisition & Recruitment', 'Employee Relations & Labor Code', 'Payroll Accounting & Processing', 'Training & Development']
  },

  // ─── 3. ENGINEERING & ARCHITECTURE ───
  {
    email: 'student.civil@interncon.ph',
    altEmail: 'student.civil@gmail.com',
    firstName: 'Joshua',
    middleName: 'Pascual',
    lastName: 'Ramos',
    gender: 'male',
    programCode: 'BSCE',
    programName: 'BS Civil Engineering',
    department: 'Engineering & Architecture',
    instCode: 'CLSU',
    requiredHours: 600,
    completedHours: 350,
    studentNumber: '2024-10011',
    initialSkills: ['AutoCAD Drafting', 'Structural Analysis & Design (STAAD/ETABS)', 'Quantity Surveying & Bill of Materials', 'Construction Project Management']
  },
  {
    email: 'student.mechanical@interncon.ph',
    altEmail: 'student.mechanical@gmail.com',
    firstName: 'Marco Antonio',
    middleName: 'Garcia',
    lastName: 'Perez',
    gender: 'male',
    programCode: 'BSME',
    programName: 'BS Mechanical Engineering',
    department: 'Engineering & Architecture',
    instCode: 'TUP',
    requiredHours: 600,
    completedHours: 280,
    studentNumber: '2024-10012',
    initialSkills: ['SolidWorks 3D CAD Modeling', 'Thermodynamics & Heat Transfer', 'HVAC Systems Design', 'Pneumatics & Hydraulics Control']
  },
  {
    email: 'student.electrical@interncon.ph',
    altEmail: 'student.electrical@gmail.com',
    firstName: 'Angelo Gabriel',
    middleName: 'Dela Cruz',
    lastName: 'Reyes',
    gender: 'male',
    programCode: 'BSEE',
    programName: 'BS Electrical Engineering',
    department: 'Engineering & Architecture',
    instCode: 'BSU',
    requiredHours: 600,
    completedHours: 310,
    studentNumber: '2024-10013',
    initialSkills: ['Electrical Circuit Analysis', 'AutoCAD Electrical Design', 'Power Distribution Systems', 'PLC Programming & Industrial Automation']
  },
  {
    email: 'student.architecture@interncon.ph',
    altEmail: 'student.architecture@gmail.com',
    firstName: 'Janine Louise',
    middleName: 'Marquez',
    lastName: 'Tolentino',
    gender: 'female',
    programCode: 'BSARCH',
    programName: 'BS Architecture',
    department: 'Engineering & Architecture',
    instCode: 'UST',
    requiredHours: 600,
    completedHours: 390,
    studentNumber: '2024-10014',
    initialSkills: ['AutoCAD Drafting', 'BIM / Revit Architecture', 'SketchUp 3D Modeling & V-Ray', 'Architectural Working Drawings']
  },
  {
    email: 'student.chemical@interncon.ph',
    altEmail: 'student.chemical@gmail.com',
    firstName: 'Leah Joy',
    middleName: 'Sanchez',
    lastName: 'Hernandez',
    gender: 'female',
    programCode: 'BSCHE',
    programName: 'BS Chemical Engineering',
    department: 'Engineering & Architecture',
    instCode: 'MAPUA',
    requiredHours: 600,
    completedHours: 195,
    studentNumber: '2024-10015',
    initialSkills: ['Chemical Process Principles & Balances', 'Thermodynamics for Chemical Engineers', 'Fluid Mechanics & Heat Transfer']
  },

  // ─── 4. HEALTH & ALLIED SCIENCES ───
  {
    email: 'student.nursing@interncon.ph',
    altEmail: 'student.nursing@gmail.com',
    firstName: 'Angela Nicole',
    middleName: 'Castillo',
    lastName: 'Soriano',
    gender: 'female',
    programCode: 'BSN',
    programName: 'BS Nursing',
    department: 'Health & Allied Sciences',
    instCode: 'SLU',
    requiredHours: 600,
    completedHours: 410,
    studentNumber: '2024-10016',
    initialSkills: ['Patient Care & Clinical Assessment', 'Basic Life Support (BLS / CPR)', 'Clinical Documentation & EHR Systems', 'Pharmacology & Safe Medication Administration']
  },
  {
    email: 'student.pharmacy@interncon.ph',
    altEmail: 'student.pharmacy@gmail.com',
    firstName: 'Samantha Faith',
    middleName: 'Aguilar',
    lastName: 'Dela Rosa',
    gender: 'female',
    programCode: 'BSPHARM',
    programName: 'BS Pharmacy',
    department: 'Health & Allied Sciences',
    instCode: 'USC',
    requiredHours: 600,
    completedHours: 260,
    studentNumber: '2024-10017',
    initialSkills: ['Pharmacology & Drug Therapeutics', 'Pharmaceutical Compounding & Dispensing', 'Clinical Pharmacy Practice', 'Patient Counseling on Medications']
  },
  {
    email: 'student.medtech@interncon.ph',
    altEmail: 'student.medtech@gmail.com',
    firstName: 'Kevin Dave',
    middleName: 'Salazar',
    lastName: 'Villanueva',
    gender: 'male',
    programCode: 'BSMLS',
    programName: 'BS Medical Laboratory Science',
    department: 'Health & Allied Sciences',
    instCode: 'XU',
    requiredHours: 600,
    completedHours: 320,
    studentNumber: '2024-10018',
    initialSkills: ['Clinical Chemistry Diagnostics', 'Hematology & Coagulation Testing', 'Medical Microbiology & Parasitology', 'Blood Banking & Transfusion Medicine']
  },

  // ─── 5. HOSPITALITY & TOURISM ───
  {
    email: 'student.hospitality@interncon.ph',
    altEmail: 'student.hospitality@gmail.com',
    firstName: 'Kimberly Anne',
    middleName: 'Rivera',
    lastName: 'Bautista',
    gender: 'female',
    programCode: 'BSHM',
    programName: 'BS Hospitality Management',
    department: 'Hospitality & Tourism',
    instCode: 'GVCFI',
    requiredHours: 600,
    completedHours: 310,
    studentNumber: '2024-10019',
    initialSkills: ['Front Office Operations (Opera PMS)', 'Food & Beverage Table Service', 'HACCP & Food Safety Protocols', 'Hospitality Cost Control & Inventory']
  },
  {
    email: 'student.tourism@interncon.ph',
    altEmail: 'student.tourism@gmail.com',
    firstName: 'Francesca Mae',
    middleName: 'Aquino',
    lastName: 'Del Rosario',
    gender: 'female',
    programCode: 'BSTM',
    programName: 'BS Tourism Management',
    department: 'Hospitality & Tourism',
    instCode: 'PUP',
    requiredHours: 600,
    completedHours: 290,
    studentNumber: '2024-10020',
    initialSkills: ['Amadeus / Sabre GDS Flight Booking', 'Tourism Tour Guiding & Itinerary Planning', 'Customer Relationship Management', 'Business English Proficiency']
  },
  {
    email: 'student.culinary@interncon.ph',
    altEmail: 'student.culinary@gmail.com',
    firstName: 'Lorenzo',
    middleName: 'Villafuerte',
    lastName: 'Mendoza',
    gender: 'male',
    programCode: 'BSCM',
    programName: 'BS Culinary Management',
    department: 'Hospitality & Tourism',
    instCode: 'SEAIT',
    requiredHours: 600,
    completedHours: 380,
    studentNumber: '2024-10021',
    initialSkills: ['Culinary Knife Skills & Food Prep', 'HACCP & Food Safety Protocols', 'Baking & Pastry Arts', 'Kitchen Cost Control & Recipe Costing']
  },

  // ─── 6. EDUCATION & TEACHER TRAINING ───
  {
    email: 'student.education@interncon.ph',
    altEmail: 'student.education@gmail.com',
    firstName: 'Kristine Joy',
    middleName: 'Valdez',
    lastName: 'Ocampo',
    gender: 'female',
    programCode: 'BSED-ENG',
    programName: 'Bachelor of Secondary Education - Major in English',
    department: 'Education & Teacher Training',
    instCode: 'PUP',
    requiredHours: 600,
    completedHours: 340,
    studentNumber: '2024-10022',
    initialSkills: ['Curriculum Development & Lesson Planning', 'Instructional Design & Pedagogy', 'Educational Technology (EdTech)', 'Classroom Management']
  },
  {
    email: 'student.math.ed@interncon.ph',
    altEmail: 'student.math.ed@gmail.com',
    firstName: 'Renz Marion',
    middleName: 'Abad',
    lastName: 'Estrada',
    gender: 'male',
    programCode: 'BSED-MATH',
    programName: 'Bachelor of Secondary Education - Major in Mathematics',
    department: 'Education & Teacher Training',
    instCode: 'NDMU',
    requiredHours: 600,
    completedHours: 280,
    studentNumber: '2024-10023',
    initialSkills: ['Mathematics Teaching Methodologies', 'Curriculum Development & Lesson Planning', 'Student Assessment & Evaluation']
  },
  {
    email: 'student.elementary@interncon.ph',
    altEmail: 'student.elementary@gmail.com',
    firstName: 'Grace Elena',
    middleName: 'Castro',
    lastName: 'Salazar',
    gender: 'female',
    programCode: 'BEED',
    programName: 'Bachelor of Elementary Education',
    department: 'Education & Teacher Training',
    instCode: 'MSU',
    requiredHours: 600,
    completedHours: 310,
    studentNumber: '2024-10024',
    initialSkills: ['Early Childhood Pedagogy', 'Classroom Management', 'Child Development & Learning Psychology']
  },

  // ─── 7. ARTS, DESIGN & MEDIA ───
  {
    email: 'student.multimedia@interncon.ph',
    altEmail: 'student.multimedia@gmail.com',
    firstName: 'Dominic Xavier',
    middleName: 'Torres',
    lastName: 'Pascual',
    gender: 'male',
    programCode: 'BMMA',
    programName: 'Bachelor of Multimedia Arts',
    department: 'Arts, Design & Media',
    instCode: 'DLSU',
    requiredHours: 500,
    completedHours: 240,
    studentNumber: '2024-10025',
    initialSkills: ['UI/UX Design', 'Figma', 'Adobe Photoshop & Illustrator', 'Video Editing (Premiere Pro / After Effects)']
  },
  {
    email: 'student.finearts@interncon.ph',
    altEmail: 'student.finearts@gmail.com',
    firstName: 'Clarisse Marie',
    middleName: 'Guerrero',
    lastName: 'Valenzuela',
    gender: 'female',
    programCode: 'BFA',
    programName: 'Bachelor of Fine Arts',
    department: 'Arts, Design & Media',
    instCode: 'UPD',
    requiredHours: 500,
    completedHours: 210,
    studentNumber: '2024-10026',
    initialSkills: ['Digital Illustration & Concept Art', 'Visual Storyboarding', 'Color Theory & Composition']
  },

  // ─── 8. CRIMINOLOGY, PSYCHOLOGY & SOCIAL SCIENCES ───
  {
    email: 'student.criminology@interncon.ph',
    altEmail: 'student.criminology@gmail.com',
    firstName: 'Cadet Rodolfo',
    middleName: 'Magbanua',
    lastName: 'Macaraeg',
    gender: 'male',
    programCode: 'BSCRIM',
    programName: 'BS Criminology',
    department: 'Criminology & Public Safety',
    instCode: 'PLM',
    requiredHours: 600,
    completedHours: 390,
    studentNumber: '2024-10027',
    initialSkills: ['Criminal Investigation & Forensics', 'Police Report Writing & Documentation', 'Philippine Criminal Law & Evidence']
  },
  {
    email: 'student.psychology@interncon.ph',
    altEmail: 'student.psychology@gmail.com',
    firstName: 'Hannah Danielle',
    middleName: 'Chua',
    lastName: 'Castillo',
    gender: 'female',
    programCode: 'BSPSY',
    programName: 'BS Psychology',
    department: 'Social Sciences & Humanities',
    instCode: 'ADMU',
    requiredHours: 500,
    completedHours: 270,
    studentNumber: '2024-10028',
    initialSkills: ['Psychological Assessment & Testing', 'Counseling & Interview Techniques', 'Statistical Methods in Psychology']
  },

  // ─── 9. AGRICULTURE & MARITIME ───
  {
    email: 'student.agriculture@interncon.ph',
    altEmail: 'student.agriculture@gmail.com',
    firstName: 'Emilio Jose',
    middleName: 'Robles',
    lastName: 'Laurel',
    gender: 'male',
    programCode: 'BSAGRI',
    programName: 'BS Agriculture',
    department: 'Agriculture & Environment',
    instCode: 'CLSU',
    requiredHours: 600,
    completedHours: 320,
    studentNumber: '2024-10029',
    initialSkills: ['Crop Production & Soil Science', 'Pest & Weed Management', 'Agribusiness Economics']
  },
  {
    email: 'student.maritime@interncon.ph',
    altEmail: 'student.maritime@gmail.com',
    firstName: 'Deck Cadet Christian Noel',
    middleName: 'Dalisay',
    lastName: 'Silva',
    gender: 'male',
    programCode: 'BSMT',
    programName: 'BS Marine Transportation',
    department: 'Maritime Studies',
    instCode: 'TUP',
    requiredHours: 600,
    completedHours: 420,
    studentNumber: '2024-10030',
    initialSkills: ['Maritime Navigation & Radar Operations', 'Shipboard Safety & SOLAS Regulations', 'Watchkeeping & Seamanship']
  }
];

async function seedDiverseUsers() {
  console.log('================================================================');
  console.log('SEEDING DIVERSE STUDENT USERS ACROSS ACADEMIC COURSES & PROGRAMS');
  console.log('================================================================\n');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Ensure student role exists
  const [[studentRole]] = await pool.query("SELECT role_id FROM roles WHERE role_name = 'student'");
  if (!studentRole) {
    console.error('Role "student" not found in database.');
    process.exit(1);
  }

  // 2. Ensure portfolio uploads directory exists
  const uploadsDir = path.resolve(__dirname, 'uploads/portfolio');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Cache institutions map
  const [instRows] = await pool.query('SELECT institution_id, institution_code FROM institutions');
  const instMap = {};
  instRows.forEach(i => {
    instMap[i.institution_code.toUpperCase()] = i.institution_id;
  });

  let createdCount = 0;
  let updatedCount = 0;

  for (const st of DIVERSE_STUDENTS) {
    // A. Resolve Institution
    let instId = instMap[st.instCode.toUpperCase()];
    if (!instId) {
      instId = instRows[0]?.institution_id || 4;
    }

    // B. Resolve Program
    let [progRows] = await pool.query(
      'SELECT program_id FROM programs WHERE institution_id = ? AND UPPER(program_code) = UPPER(?) LIMIT 1',
      [instId, st.programCode]
    );

    let progId;
    if (progRows.length > 0) {
      progId = progRows[0].program_id;
    } else {
      // Find program anywhere
      let [anyProg] = await pool.query(
        'SELECT program_id FROM programs WHERE UPPER(program_code) = UPPER(?) LIMIT 1',
        [st.programCode]
      );
      if (anyProg.length > 0) {
        progId = anyProg[0].program_id;
      } else {
        // Create program record
        const [pRes] = await pool.query(
          `INSERT INTO programs (institution_id, program_name, program_code, department, required_ojt_hours, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [instId, st.programName, st.programCode, st.department, st.requiredHours]
        );
        progId = pRes.insertId;
      }
    }

    // C. Upsert Primary User Account
    const emailsToEnsure = [st.email];
    if (st.altEmail) emailsToEnsure.push(st.altEmail);

    let primaryUserId;

    for (const em of emailsToEnsure) {
      const [existingUser] = await pool.query('SELECT user_id FROM users WHERE LOWER(email) = LOWER(?)', [em]);
      let uId;
      if (existingUser.length > 0) {
        uId = existingUser[0].user_id;
        await pool.query(
          `UPDATE users SET password_hash = ?, is_active = 1, is_verified = 1, role_id = ? WHERE user_id = ?`,
          [passwordHash, studentRole.role_id, uId]
        );
        updatedCount++;
      } else {
        const [uRes] = await pool.query(
          `INSERT INTO users (role_id, email, password_hash, is_active, is_verified, created_at, updated_at)
           VALUES (?, ?, ?, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [studentRole.role_id, em, passwordHash]
        );
        uId = uRes.insertId;
        createdCount++;
      }
      if (em === st.email) primaryUserId = uId;
    }

    // D. Upsert Student Profile linked to primary user
    let [existingStudent] = await pool.query('SELECT student_id FROM students WHERE user_id = ?', [primaryUserId]);
    let studentId;

    if (existingStudent.length > 0) {
      studentId = existingStudent[0].student_id;
      await pool.query(
        `UPDATE students 
         SET institution_id = ?, program_id = ?, first_name = ?, middle_name = ?, last_name = ?, gender = ?,
             student_number = ?, required_ojt_hours = ?, completed_ojt_hours = ?, is_verified = 1, is_active = 1,
             classification = 'regular', ojt_status = 'ongoing'
         WHERE student_id = ?`,
        [
          instId, progId, st.firstName, st.middleName, st.lastName, st.gender,
          st.studentNumber, st.requiredHours, st.completedHours, studentId
        ]
      );
    } else {
      const [sRes] = await pool.query(
        `INSERT INTO students 
         (user_id, institution_id, program_id, student_number, category_id, status_id, classification, ojt_status,
          first_name, middle_name, last_name, gender, contact_number, required_ojt_hours, completed_ojt_hours, is_verified, is_active, created_at, updated_at)
         VALUES 
         (?, ?, ?, ?, 1, 2, 'regular', 'ongoing', ?, ?, ?, ?, '09170000000', ?, ?, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          primaryUserId, instId, progId, st.studentNumber,
          st.firstName, st.middleName, st.lastName, st.gender, st.requiredHours, st.completedHours
        ]
      );
      studentId = sRes.insertId;
    }

    // Also link altEmail user to a student profile if not present
    if (st.altEmail) {
      const [[altUser]] = await pool.query('SELECT user_id FROM users WHERE LOWER(email) = LOWER(?)', [st.altEmail]);
      if (altUser) {
        const [altStudent] = await pool.query('SELECT student_id FROM students WHERE user_id = ?', [altUser.user_id]);
        if (altStudent.length === 0) {
          await pool.query(
            `INSERT INTO students 
             (user_id, institution_id, program_id, student_number, category_id, status_id, classification, ojt_status,
              first_name, middle_name, last_name, gender, contact_number, required_ojt_hours, completed_ojt_hours, is_verified, is_active, created_at, updated_at)
             VALUES 
             (?, ?, ?, ?, 1, 2, 'regular', 'ongoing', ?, ?, ?, ?, '09170000000', ?, ?, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
              altUser.user_id, instId, progId, st.studentNumber + '-A',
              st.firstName, st.middleName, st.lastName, st.gender, st.requiredHours, st.completedHours
            ]
          );
        }
      }
    }

    // E. Ensure Student Registration is Verified
    const [regRows] = await pool.query('SELECT registration_id FROM student_registrations WHERE student_id = ?', [studentId]);
    if (regRows.length === 0) {
      await pool.query(
        `INSERT INTO student_registrations (student_id, status, submitted_at, verified_at, created_at, updated_at)
         VALUES (?, 'verified', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [studentId]
      );
    } else {
      await pool.query(
        `UPDATE student_registrations SET status = 'verified', verified_at = CURRENT_TIMESTAMP WHERE student_id = ?`,
        [studentId]
      );
    }

    // F. Seed Initial Verified Skills for student
    for (const skillName of st.initialSkills) {
      let [skillRecord] = await pool.query('SELECT skill_id FROM skills WHERE LOWER(skill_name) = LOWER(?)', [skillName]);
      let skillId;
      if (skillRecord.length > 0) {
        skillId = skillRecord[0].skill_id;
      } else {
        const [insSkill] = await pool.query(
          'INSERT INTO skills (skill_name, category_id, created_at, updated_at) VALUES (?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
          [skillName]
        );
        skillId = insSkill.insertId;
      }

      const [hasSkill] = await pool.query(
        'SELECT id FROM student_skills WHERE student_id = ? AND skill_id = ?',
        [studentId, skillId]
      );
      if (hasSkill.length === 0) {
        await pool.query(
          `INSERT INTO student_skills (student_id, skill_id, proficiency_level, created_at, updated_at)
           VALUES (?, ?, 'intermediate', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [studentId, skillId]
        );
      }
    }

    // G. Seed Portfolio, Items & Resume
    let [portfolioRows] = await pool.query('SELECT portfolio_id FROM student_portfolios WHERE student_id = ?', [studentId]);
    let portfolioId;
    if (portfolioRows.length === 0) {
      const [pRes] = await pool.query(
        `INSERT INTO student_portfolios (student_id, title, summary, created_at, updated_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [studentId, `${st.firstName} ${st.lastName} - Career Portfolio`, `Verified career portfolio and academic records in ${st.programName}.`]
      );
      portfolioId = pRes.insertId;
    } else {
      portfolioId = portfolioRows[0].portfolio_id;
    }

    // Ensure sample PDF file on disk
    const pdfFilename = `${st.programCode.toLowerCase()}_academic_record_${studentId}.pdf`;
    const pdfPath = path.join(uploadsDir, pdfFilename);
    if (!fs.existsSync(pdfPath)) {
      fs.writeFileSync(pdfPath, createSamplePdf(`${st.programName} Capstone & OJT Documentation`, st.programCode));
    }

    // Ensure portfolio item
    const [pItem] = await pool.query('SELECT item_id FROM portfolio_items WHERE portfolio_id = ?', [portfolioId]);
    if (pItem.length === 0) {
      await pool.query(
        `INSERT INTO portfolio_items 
         (portfolio_id, title, description, file_path, file_name, file_size, item_type, is_verified, created_at, updated_at)
         VALUES 
         (?, ?, ?, ?, ?, 1500000, 'academic_portfolio', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          portfolioId,
          `${st.programCode} Capstone & Project Documentation`,
          `Major academic project and practical internship documentation for ${st.programName}.`,
          `/uploads/portfolio/${pdfFilename}`,
          pdfFilename
        ]
      );
    }

    // Ensure active resume
    const [resumeRows] = await pool.query('SELECT resume_id FROM student_resumes WHERE student_id = ?', [studentId]);
    if (resumeRows.length === 0) {
      await pool.query(
        `INSERT INTO student_resumes 
         (student_id, file_path, file_name, file_size, version, is_active, created_at, updated_at)
         VALUES (?, ?, ?, 450000, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          studentId,
          `/uploads/portfolio/${pdfFilename}`,
          `${st.firstName}_${st.lastName}_Resume_2026.pdf`
        ]
      );
    }

    console.log(`✓ [${st.programCode}] ${st.email} | ${st.firstName} ${st.lastName} (${st.programName})`);
  }

  console.log(`\n================================================================`);
  console.log(`SUCCESS: Seeded ${DIVERSE_STUDENTS.length} diverse program accounts!`);
  console.log(`Users created/updated: ${createdCount} created, ${updatedCount} updated`);
  console.log(`Default password for all accounts: Password123!`);
  console.log(`================================================================`);
  process.exit(0);
}

seedDiverseUsers().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
