// Complete CHED & Industry Academic Program Skills Taxonomy
// Maps each academic degree program code to its core industry competencies & curriculum skills

export const PROGRAM_SKILLS_CATALOG = {
  // ─── 1. INFORMATION TECHNOLOGY & COMPUTING ───────────────────────────────
  BSIT: {
    program_code: 'BSIT',
    program_name: 'BS Information Technology',
    department: 'Information Technology & Computing',
    skills: [
      { name: 'JavaScript', category: 'Technical Skills' },
      { name: 'TypeScript', category: 'Technical Skills' },
      { name: 'React.js', category: 'Technical Skills' },
      { name: 'Node.js', category: 'Technical Skills' },
      { name: 'SQL', category: 'Technical Skills' },
      { name: 'HTML/CSS', category: 'Technical Skills' },
      { name: 'Tailwind CSS', category: 'Technical Skills' },
      { name: 'Next.js', category: 'Technical Skills' },
      { name: 'Database Design', category: 'Technical Skills' },
      { name: 'RESTful API Development', category: 'Technical Skills' },
      { name: 'Git/Version Control', category: 'Technical Skills' },
      { name: 'Docker', category: 'Technical Skills' },
      { name: 'AWS Cloud', category: 'Technical Skills' },
      { name: 'Linux System Admin', category: 'Technical Skills' },
      { name: 'Cybersecurity Fundamentals', category: 'Technical Skills' },
      { name: 'Mobile App Development (Flutter)', category: 'Technical Skills' }
    ]
  },
  BSCS: {
    program_code: 'BSCS',
    program_name: 'BS Computer Science',
    department: 'Information Technology & Computing',
    skills: [
      { name: 'Python', category: 'Technical Skills' },
      { name: 'Java Programming', category: 'Technical Skills' },
      { name: 'C++ Object-Oriented Programming', category: 'Technical Skills' },
      { name: 'Data Structures & Algorithms', category: 'Technical Skills' },
      { name: 'Machine Learning', category: 'Technical Skills' },
      { name: 'Artificial Intelligence', category: 'Technical Skills' },
      { name: 'Data Analysis', category: 'Technical Skills' },
      { name: 'SQL', category: 'Technical Skills' },
      { name: 'Git/Version Control', category: 'Technical Skills' },
      { name: 'Docker', category: 'Technical Skills' },
      { name: 'Operating Systems Architecture', category: 'Technical Skills' },
      { name: 'Distributed Systems', category: 'Technical Skills' }
    ]
  },
  BSIS: {
    program_code: 'BSIS',
    program_name: 'BS Information Systems',
    department: 'Information Technology & Computing',
    skills: [
      { name: 'Enterprise Resource Planning (ERP)', category: 'Business & Management' },
      { name: 'Business Process Modeling (BPMN)', category: 'Business & Management' },
      { name: 'Systems Analysis & Design', category: 'Technical Skills' },
      { name: 'Database Administration', category: 'Technical Skills' },
      { name: 'SQL', category: 'Technical Skills' },
      { name: 'Project Management & Agile Scrum', category: 'Business & Management' },
      { name: 'Business Intelligence (Power BI)', category: 'Technical Skills' },
      { name: 'IT Service Management (ITIL)', category: 'Business & Management' }
    ]
  },
  BSSE: {
    program_code: 'BSSE',
    program_name: 'BS Software Engineering',
    department: 'Information Technology & Computing',
    skills: [
      { name: 'Software Architecture & Design Patterns', category: 'Technical Skills' },
      { name: 'Test-Driven Development (TDD)', category: 'Technical Skills' },
      { name: 'CI/CD Pipeline Automation', category: 'Technical Skills' },
      { name: 'Microservices Architecture', category: 'Technical Skills' },
      { name: 'TypeScript', category: 'Technical Skills' },
      { name: 'Docker', category: 'Technical Skills' },
      { name: 'Git/Version Control', category: 'Technical Skills' },
      { name: 'RESTful API Development', category: 'Technical Skills' }
    ]
  },
  BSCPE: {
    program_code: 'BSCPE',
    program_name: 'BS Computer Engineering',
    department: 'Information Technology & Computing',
    skills: [
      { name: 'Embedded C/C++ Programming', category: 'Technical Skills' },
      { name: 'Microcontroller Systems & Arduino', category: 'Technical Skills' },
      { name: 'IoT Hardware Prototyping', category: 'Technical Skills' },
      { name: 'Digital Logic Design (VHDL/Verilog)', category: 'Technical Skills' },
      { name: 'PLC Programming & Industrial Automation', category: 'Technical Skills' },
      { name: 'Robotics & Automation', category: 'Technical Skills' },
      { name: 'Computer Hardware Troubleshooting', category: 'Technical Skills' },
      { name: 'Linux System Admin', category: 'Technical Skills' }
    ]
  },
  BSCSB: {
    program_code: 'BSCSB',
    program_name: 'BS Cybersecurity',
    department: 'Information Technology & Computing',
    skills: [
      { name: 'Ethical Hacking & Penetration Testing', category: 'Technical Skills' },
      { name: 'Network Security & Firewalls', category: 'Technical Skills' },
      { name: 'SIEM & Incident Response', category: 'Technical Skills' },
      { name: 'Vulnerability Assessment (OWASP)', category: 'Technical Skills' },
      { name: 'Cryptography & Key Management', category: 'Technical Skills' },
      { name: 'Digital Forensics Investigation', category: 'Technical Skills' },
      { name: 'Linux System Admin', category: 'Technical Skills' }
    ]
  },
  BSDSA: {
    program_code: 'BSDSA',
    program_name: 'BS Data Science and Analytics',
    department: 'Information Technology & Computing',
    skills: [
      { name: 'Python for Data Science (Pandas/NumPy)', category: 'Technical Skills' },
      { name: 'Machine Learning', category: 'Technical Skills' },
      { name: 'Data Visualization (Tableau/Power BI)', category: 'Technical Skills' },
      { name: 'SQL for Big Data', category: 'Technical Skills' },
      { name: 'Statistical Modeling & Hypothesis Testing', category: 'Technical Skills' },
      { name: 'Data Wrangling & ETL Pipelines', category: 'Technical Skills' },
      { name: 'Natural Language Processing (NLP)', category: 'Technical Skills' }
    ]
  },
  BSEMC: {
    program_code: 'BSEMC',
    program_name: 'BS Entertainment and Multimedia Computing',
    department: 'Information Technology & Computing',
    skills: [
      { name: 'Game Development (Unity/Unreal Engine)', category: 'Technical Skills' },
      { name: 'C# Game Scripting', category: 'Technical Skills' },
      { name: '3D Modeling & Texturing (Blender)', category: 'Design & Creative' },
      { name: '2D/3D Animation Fundamentals', category: 'Design & Creative' },
      { name: 'UI/UX Design for Games', category: 'Design & Creative' },
      { name: 'Audio Design & Sound Foley', category: 'Design & Creative' }
    ]
  },

  // ─── 2. BUSINESS & ACCOUNTANCY ──────────────────────────────────────────
  BSA: {
    program_code: 'BSA',
    program_name: 'BS Accountancy',
    department: 'Business & Accountancy',
    skills: [
      { name: 'Financial Accounting', category: 'Business & Management' },
      { name: 'QuickBooks Online', category: 'Business & Management' },
      { name: 'Xero Accounting', category: 'Business & Management' },
      { name: 'Auditing & Assurance', category: 'Business & Management' },
      { name: 'Taxation & BIR Compliance', category: 'Business & Management' },
      { name: 'Cost Accounting', category: 'Business & Management' },
      { name: 'Excel Financial Modeling', category: 'Business & Management' },
      { name: 'Philippine Financial Reporting Standards (PFRS)', category: 'Business & Management' },
      { name: 'Payroll Processing & 2316 Compliance', category: 'Business & Management' },
      { name: 'Internal Audit & Risk Controls', category: 'Business & Management' }
    ]
  },
  BSAIS: {
    program_code: 'BSAIS',
    program_name: 'BS Accounting Information Systems',
    department: 'Business & Accountancy',
    skills: [
      { name: 'SAP Business One / ERP', category: 'Business & Management' },
      { name: 'Accounting Information Systems Audit', category: 'Business & Management' },
      { name: 'Financial Accounting', category: 'Business & Management' },
      { name: 'QuickBooks Online', category: 'Business & Management' },
      { name: 'Database Management & SQL', category: 'Technical Skills' },
      { name: 'Excel Financial Modeling', category: 'Business & Management' }
    ]
  },
  BSMA: {
    program_code: 'BSMA',
    program_name: 'BS Management Accounting',
    department: 'Business & Accountancy',
    skills: [
      { name: 'Strategic Cost Management', category: 'Business & Management' },
      { name: 'Budgeting & Financial Forecasting', category: 'Business & Management' },
      { name: 'Financial Accounting', category: 'Business & Management' },
      { name: 'Management Advisory Services (MAS)', category: 'Business & Management' },
      { name: 'Performance Metrics & Balanced Scorecard', category: 'Business & Management' },
      { name: 'Excel Financial Modeling', category: 'Business & Management' }
    ]
  },
  BSIA: {
    program_code: 'BSIA',
    program_name: 'BS Internal Auditing',
    department: 'Business & Accountancy',
    skills: [
      { name: 'Internal Audit & Risk Controls', category: 'Business & Management' },
      { name: 'SOX Compliance & Operational Audit', category: 'Business & Management' },
      { name: 'Financial Statement Analysis', category: 'Business & Management' },
      { name: 'Fraud Examination & Forensics', category: 'Business & Management' },
      { name: 'Excel Financial Modeling', category: 'Business & Management' }
    ]
  },
  'BSBA-FM': {
    program_code: 'BSBA-FM',
    program_name: 'BSBA - Financial Management',
    department: 'Business & Accountancy',
    skills: [
      { name: 'Corporate Finance', category: 'Business & Management' },
      { name: 'Investment & Portfolio Management', category: 'Business & Management' },
      { name: 'Capital Budgeting & Valuation', category: 'Business & Management' },
      { name: 'Credit Analysis & Underwriting', category: 'Business & Management' },
      { name: 'Commercial Banking Operations', category: 'Business & Management' },
      { name: 'Excel Financial Modeling', category: 'Business & Management' }
    ]
  },
  'BSBA-MM': {
    program_code: 'BSBA-MM',
    program_name: 'BSBA - Marketing Management',
    department: 'Business & Accountancy',
    skills: [
      { name: 'Digital Marketing & Social Media Strategy', category: 'Business & Management' },
      { name: 'Search Engine Optimization (SEO)', category: 'Technical Skills' },
      { name: 'Google Ads & Meta Advertising', category: 'Business & Management' },
      { name: 'Market Research & Consumer Insights', category: 'Business & Management' },
      { name: 'Brand Management & Positioning', category: 'Business & Management' },
      { name: 'Content Marketing & Copywriting', category: 'Design & Creative' },
      { name: 'B2B Sales & Lead Generation', category: 'Business & Management' }
    ]
  },
  'BSBA-HRM': {
    program_code: 'BSBA-HRM',
    program_name: 'BSBA - Human Resource Management',
    department: 'Business & Accountancy',
    skills: [
      { name: 'Talent Acquisition & Recruiting', category: 'Business & Management' },
      { name: 'Philippine Labor Code & Employee Relations', category: 'Business & Management' },
      { name: 'Compensation & Benefits Administration', category: 'Business & Management' },
      { name: 'HRIS & Payroll Systems', category: 'Business & Management' },
      { name: 'Training & Organizational Development', category: 'Business & Management' },
      { name: 'Performance Appraisal Systems', category: 'Business & Management' },
      { name: 'Competency-Based Interviewing (STAR Method)', category: 'Business & Management' }
    ]
  },
  'BSBA-OM': {
    program_code: 'BSBA-OM',
    program_name: 'BSBA - Operations Management',
    department: 'Business & Accountancy',
    skills: [
      { name: 'Supply Chain Management (SCM)', category: 'Business & Management' },
      { name: 'Logistics & Warehouse Operations', category: 'Business & Management' },
      { name: 'Total Quality Management & Lean Six Sigma', category: 'Business & Management' },
      { name: 'Procurement & Vendor Management', category: 'Business & Management' },
      { name: 'Inventory Optimization', category: 'Business & Management' },
      { name: 'Project Management & Agile Scrum', category: 'Business & Management' }
    ]
  },
  'BSBA-BE': {
    program_code: 'BSBA-BE',
    program_name: 'BSBA - Business Economics',
    department: 'Business & Accountancy',
    skills: [
      { name: 'Econometric Modeling (STATA/EViews)', category: 'Business & Management' },
      { name: 'Macroeconomic Policy Analysis', category: 'Business & Management' },
      { name: 'Market Pricing & Cost Structure Analysis', category: 'Business & Management' },
      { name: 'Industry Feasibility Studies', category: 'Business & Management' },
      { name: 'Excel Financial Modeling', category: 'Business & Management' }
    ]
  },
  BSENTREP: {
    program_code: 'BSENTREP',
    program_name: 'BS Entrepreneurship',
    department: 'Business & Accountancy',
    skills: [
      { name: 'Business Model Canvas & Ideation', category: 'Business & Management' },
      { name: 'Startup Pitching & Venture Funding', category: 'Business & Management' },
      { name: 'E-Commerce Store Management (Shopify/Shopee)', category: 'Business & Management' },
      { name: 'Product Prototyping & MVP Testing', category: 'Business & Management' },
      { name: 'Cash Flow & SME Financial Management', category: 'Business & Management' }
    ]
  },
  BSCA: {
    program_code: 'BSCA',
    program_name: 'BS Customs Administration',
    department: 'Business & Accountancy',
    skills: [
      { name: 'Philippine Tariff & Customs Code (CMTA)', category: 'Business & Management' },
      { name: 'Import/Export Clearance & BOC Systems (e2m)', category: 'Business & Management' },
      { name: 'International Freight Forwarding & Incoterms', category: 'Business & Management' },
      { name: 'Customs Valuation & Harmonized System (HS)', category: 'Business & Management' },
      { name: 'Bonded Warehouse Management', category: 'Business & Management' }
    ]
  },
  BSOA: {
    program_code: 'BSOA',
    program_name: 'BS Office Administration',
    department: 'Business & Accountancy',
    skills: [
      { name: 'Executive Administrative Support', category: 'Business & Management' },
      { name: 'Business Correspondence & Minutes Taking', category: 'Business & Management' },
      { name: 'Records Management & Digital Archiving', category: 'Business & Management' },
      { name: 'Office 365 & Google Workspace Suite', category: 'Technical Skills' },
      { name: 'Billing & Invoicing Systems', category: 'Business & Management' }
    ]
  },
  BSREM: {
    program_code: 'BSREM',
    program_name: 'BS Real Estate Management',
    department: 'Business & Accountancy',
    skills: [
      { name: 'Real Estate Property Appraisal & Valuation', category: 'Business & Management' },
      { name: 'Philippine Real Estate Law (RESA)', category: 'Business & Management' },
      { name: 'Real Estate Brokerage & Sales Closing', category: 'Business & Management' },
      { name: 'Property Management & Leasing Operations', category: 'Business & Management' },
      { name: 'Title Verification & Land Registration (LRA)', category: 'Business & Management' }
    ]
  },

  // ─── 3. ENGINEERING & ARCHITECTURE ──────────────────────────────────────
  BSCE: {
    program_code: 'BSCE',
    program_name: 'BS Civil Engineering',
    department: 'Engineering & Architecture',
    skills: [
      { name: 'AutoCAD Drafting', category: 'Technical Skills' },
      { name: 'BIM / Revit Structure', category: 'Technical Skills' },
      { name: 'Structural Analysis & Design (STAAD/ETABS)', category: 'Technical Skills' },
      { name: 'Quantity Surveying & Bill of Materials (BOM)', category: 'Technical Skills' },
      { name: 'Construction Management & Costing', category: 'Business & Management' },
      { name: 'Soil Mechanics & Geotechnical Testing', category: 'Technical Skills' },
      { name: 'Highway & Geometric Design', category: 'Technical Skills' },
      { name: 'Occupational Safety & Health (BOSH/COSH)', category: 'Business & Management' }
    ]
  },
  BSEE: {
    program_code: 'BSEE',
    program_name: 'BS Electrical Engineering',
    department: 'Engineering & Architecture',
    skills: [
      { name: 'Electrical Building Wiring & PEC Code', category: 'Technical Skills' },
      { name: 'Power System Analysis & ETAP', category: 'Technical Skills' },
      { name: 'MATLAB / Simulink', category: 'Technical Skills' },
      { name: 'PLC Programming & SCADA Automation', category: 'Technical Skills' },
      { name: 'Renewable Solar PV System Design', category: 'Technical Skills' },
      { name: 'AutoCAD Electrical', category: 'Technical Skills' },
      { name: 'Occupational Safety & Health (BOSH/COSH)', category: 'Business & Management' }
    ]
  },
  BSME: {
    program_code: 'BSME',
    program_name: 'BS Mechanical Engineering',
    department: 'Engineering & Architecture',
    skills: [
      { name: 'SolidWorks 3D CAD Modeling', category: 'Technical Skills' },
      { name: 'HVAC System Design & Thermodynamics', category: 'Technical Skills' },
      { name: 'Boiler & Power Plant Operations', category: 'Technical Skills' },
      { name: 'Piping & Instrumentation Diagrams (P&ID)', category: 'Technical Skills' },
      { name: 'Hydraulic & Pneumatic Systems', category: 'Technical Skills' },
      { name: 'Preventive Maintenance Scheduling', category: 'Business & Management' }
    ]
  },
  BSECE: {
    program_code: 'BSECE',
    program_name: 'BS Electronics Engineering',
    department: 'Engineering & Architecture',
    skills: [
      { name: 'RF & Wireless Telecommunications', category: 'Technical Skills' },
      { name: 'Fiber Optic Networks & Testing', category: 'Technical Skills' },
      { name: 'PCB Schematic & Layout Design', category: 'Technical Skills' },
      { name: 'Digital Signal Processing (DSP)', category: 'Technical Skills' },
      { name: 'MATLAB / Simulink', category: 'Technical Skills' },
      { name: 'IoT Hardware Prototyping', category: 'Technical Skills' }
    ]
  },
  BSCHE: {
    program_code: 'BSCHE',
    program_name: 'BS Chemical Engineering',
    department: 'Engineering & Architecture',
    skills: [
      { name: 'Chemical Process Simulation (Aspen HYSYS)', category: 'Technical Skills' },
      { name: 'Unit Operations & Mass Transfer', category: 'Technical Skills' },
      { name: 'Industrial Wastewater Treatment', category: 'Technical Skills' },
      { name: 'Chemical Plant Safety & HAZOP', category: 'Business & Management' },
      { name: 'Quality Control & Analytical Chemistry', category: 'Technical Skills' }
    ]
  },
  BSIE: {
    program_code: 'BSIE',
    program_name: 'BS Industrial Engineering',
    department: 'Engineering & Architecture',
    skills: [
      { name: 'Time & Motion Study (Methods Engineering)', category: 'Technical Skills' },
      { name: 'Plant Layout & Facilities Planning', category: 'Technical Skills' },
      { name: 'Lean Six Sigma & Statistical Process Control (SPC)', category: 'Business & Management' },
      { name: 'Operations Research & Optimization', category: 'Technical Skills' },
      { name: 'Ergonomics & Human Factors Design', category: 'Technical Skills' }
    ]
  },
  BSARCH: {
    program_code: 'BSARCH',
    program_name: 'BS Architecture',
    department: 'Engineering & Architecture',
    skills: [
      { name: 'Architectural Space Planning & Design', category: 'Design & Creative' },
      { name: 'Autodesk Revit Architecture', category: 'Technical Skills' },
      { name: 'SketchUp & V-Ray 3D Rendering', category: 'Design & Creative' },
      { name: 'Lumion Architectural Visualization', category: 'Design & Creative' },
      { name: 'National Building Code (PD 1096)', category: 'Business & Management' },
      { name: 'Architectural Working Drawings & Detailing', category: 'Technical Skills' }
    ]
  },
  BSABE: {
    program_code: 'BSABE',
    program_name: 'BS Agricultural and Biosystems Engineering',
    department: 'Engineering & Architecture',
    skills: [
      { name: 'Agricultural Machinery & Power Systems', category: 'Technical Skills' },
      { name: 'Irrigation & Drainage Engineering', category: 'Technical Skills' },
      { name: 'Post-Harvest Technology & Cold Chain', category: 'Technical Skills' },
      { name: 'AutoCAD Drafting', category: 'Technical Skills' }
    ]
  },

  // ─── 4. HOSPITALITY & TOURISM ───────────────────────────────────────────
  BSHM: {
    program_code: 'BSHM',
    program_name: 'BS Hospitality Management',
    department: 'Hospitality & Tourism',
    skills: [
      { name: 'Front Office Operations (Opera PMS)', category: 'Business & Management' },
      { name: 'Food & Beverage Table Service', category: 'Business & Management' },
      { name: 'HACCP & Food Safety Protocols', category: 'Business & Management' },
      { name: 'Event Management & Banqueting', category: 'Business & Management' },
      { name: 'Hospitality Cost Control & Inventory', category: 'Business & Management' },
      { name: 'Barista & Coffee Beverage Crafting', category: 'Business & Management' },
      { name: 'Wine Service & Mixology', category: 'Business & Management' },
      { name: 'Housekeeping Operations & Standards', category: 'Business & Management' }
    ]
  },
  BSHRM: {
    program_code: 'BSHRM',
    program_name: 'BS Hotel and Restaurant Management',
    department: 'Hospitality & Tourism',
    skills: [
      { name: 'Hotel Front Office Operations', category: 'Business & Management' },
      { name: 'Restaurant Operations & Table Service', category: 'Business & Management' },
      { name: 'HACCP & Food Safety Protocols', category: 'Business & Management' },
      { name: 'Event Management & Banqueting', category: 'Business & Management' },
      { name: 'Hospitality Cost Control & Inventory', category: 'Business & Management' }
    ]
  },
  BSCM: {
    program_code: 'BSCM',
    program_name: 'BS Culinary Management',
    department: 'Hospitality & Tourism',
    skills: [
      { name: 'Culinary Knife Skills & Mise en Place', category: 'Business & Management' },
      { name: 'Hot & Cold Kitchen Operations', category: 'Business & Management' },
      { name: 'Baking & Pastry Arts', category: 'Business & Management' },
      { name: 'Menu Engineering & Recipe Costing', category: 'Business & Management' },
      { name: 'Commercial Kitchen Food Sanitation (HACCP)', category: 'Business & Management' }
    ]
  },
  BSTM: {
    program_code: 'BSTM',
    program_name: 'BS Tourism Management',
    department: 'Hospitality & Tourism',
    skills: [
      { name: 'Tourism Tour Guiding & Itinerary Planning', category: 'Business & Management' },
      { name: 'Amadeus / Sabre GDS Flight Booking', category: 'Technical Skills' },
      { name: 'Airline Ticketing & Fare Calculation', category: 'Business & Management' },
      { name: 'Destination Marketing & Sustainable Tourism', category: 'Business & Management' },
      { name: 'Customer Relationship Management', category: 'Business & Management' },
      { name: 'MICE Event Management (Conferences/Exhibits)', category: 'Business & Management' },
      { name: 'Visa Processing & Consular Protocols', category: 'Business & Management' },
      { name: 'Business English Proficiency', category: 'Soft Skills' }
    ]
  },

  // ─── 5. HEALTHCARE & LIFE SCIENCES ──────────────────────────────────────
  BSN: {
    program_code: 'BSN',
    program_name: 'BS Nursing',
    department: 'Health & Allied Sciences',
    skills: [
      { name: 'Patient Care & Clinical Assessment', category: 'Technical Skills' },
      { name: 'Basic Life Support (BLS / CPR)', category: 'Technical Skills' },
      { name: 'Advanced Cardiac Life Support (ACLS)', category: 'Technical Skills' },
      { name: 'Clinical Documentation & EHR Systems', category: 'Technical Skills' },
      { name: 'Pharmacology & Safe Medication Administration', category: 'Technical Skills' },
      { name: 'Infection Control & Sterile Techniques', category: 'Technical Skills' },
      { name: 'Intravenous (IV) Therapy & Cannulation', category: 'Technical Skills' },
      { name: 'Emergency Triage & Patient Monitoring', category: 'Technical Skills' },
      { name: 'Wound Dressing & Post-Operative Care', category: 'Technical Skills' },
      { name: 'Maternal & Child Healthcare', category: 'Technical Skills' }
    ]
  },
  BSMLS: {
    program_code: 'BSMLS',
    program_name: 'BS Medical Technology / Medical Laboratory Science',
    department: 'Health & Allied Sciences',
    skills: [
      { name: 'Clinical Microscopy & Urinalysis', category: 'Technical Skills' },
      { name: 'Hematology & Complete Blood Count (CBC)', category: 'Technical Skills' },
      { name: 'Clinical Chemistry & Automated Analyzers', category: 'Technical Skills' },
      { name: 'Blood Banking & Immunohematology', category: 'Technical Skills' },
      { name: 'Medical Microbiology & Culture Sensitivity', category: 'Technical Skills' },
      { name: 'Histopathology & Tissue Staining', category: 'Technical Skills' }
    ]
  },
  BSM: {
    program_code: 'BSM',
    program_name: 'BS Midwifery',
    department: 'Health & Allied Sciences',
    skills: [
      { name: 'Prenatal Care & Fetal Heart Monitoring', category: 'Technical Skills' },
      { name: 'Normal Spontaneous Delivery Assistance', category: 'Technical Skills' },
      { name: 'Newborn Immediate Care & APGAR Scoring', category: 'Technical Skills' },
      { name: 'Postpartum Care & Lactation Counseling', category: 'Technical Skills' },
      { name: 'Family Planning & Reproductive Health', category: 'Technical Skills' }
    ]
  },

  // ─── 6. SOCIAL SCIENCES & PUBLIC SERVICE ────────────────────────────────
  BSPSY: {
    program_code: 'BSPSY',
    program_name: 'BS Psychology',
    department: 'Humanities & Social Sciences',
    skills: [
      { name: 'Psychological Assessment & Testing', category: 'Technical Skills' },
      { name: 'Psychometric Report Writing', category: 'Technical Skills' },
      { name: 'Talent Acquisition & Recruitment', category: 'Business & Management' },
      { name: 'Philippine Labor Code & Employee Relations', category: 'Business & Management' },
      { name: 'Training & Organizational Development', category: 'Business & Management' },
      { name: 'Competency-Based Interviewing (STAR Method)', category: 'Business & Management' },
      { name: 'Counseling & Mental Health Facilitation', category: 'Soft Skills' },
      { name: 'Statistical Data Analysis (SPSS/JASP)', category: 'Technical Skills' }
    ]
  },
  BSSW: {
    program_code: 'BSSW',
    program_name: 'BS Social Work',
    department: 'Humanities & Social Sciences',
    skills: [
      { name: 'Social Case Study Report Preparation', category: 'Business & Management' },
      { name: 'Community Organizing & Participatory Immersion', category: 'Soft Skills' },
      { name: 'Crisis Intervention & Psychosocial Support', category: 'Soft Skills' },
      { name: 'Child, Youth & Family Welfare Advocacy', category: 'Business & Management' },
      { name: 'Barangay Social Service Referral Systems', category: 'Business & Management' }
    ]
  },
  BSCRIM: {
    program_code: 'BSCRIM',
    program_name: 'BS Criminology',
    department: 'Criminology & Public Safety',
    skills: [
      { name: 'Criminal Investigation & Crime Scene Processing', category: 'Technical Skills' },
      { name: 'Forensic Dactyloscopy (Fingerprint Analysis)', category: 'Technical Skills' },
      { name: 'Forensic Ballistics & Firearms ID', category: 'Technical Skills' },
      { name: 'Philippine Criminal Law & Evidence Rules', category: 'Business & Management' },
      { name: 'Traffic Accident Incident Investigation', category: 'Technical Skills' },
      { name: 'Police Patrol Tactics & Sworn Affidavits', category: 'Technical Skills' }
    ]
  },

  // ─── 7. EDUCATION & TEACHER TRAINING ────────────────────────────────────
  BSED: {
    program_code: 'BSED',
    program_name: 'Bachelor of Secondary Education',
    department: 'Education & Teacher Training',
    skills: [
      { name: 'Curriculum Development & Lesson Planning', category: 'Business & Management' },
      { name: 'Instructional Design & E-Learning Modules', category: 'Technical Skills' },
      { name: 'Educational Technology & LMS (Canvas/Moodle)', category: 'Technical Skills' },
      { name: 'Classroom Management & Student Engagement', category: 'Soft Skills' },
      { name: 'Educational Assessment & Rubrics Design', category: 'Technical Skills' },
      { name: 'Table of Specifications (TOS) Construction', category: 'Technical Skills' },
      { name: 'Differentiated Learning Strategies', category: 'Soft Skills' }
    ]
  },
  BEED: {
    program_code: 'BEED',
    program_name: 'Bachelor of Elementary Education',
    department: 'Education & Teacher Training',
    skills: [
      { name: 'Early Childhood & Elementary Pedagogy', category: 'Soft Skills' },
      { name: 'Curriculum Development & Lesson Planning', category: 'Business & Management' },
      { name: 'Classroom Management & Student Engagement', category: 'Soft Skills' },
      { name: 'Phonics & Literacy Instruction', category: 'Soft Skills' },
      { name: 'Educational Assessment & Rubrics Design', category: 'Technical Skills' }
    ]
  },
  BSNED: {
    program_code: 'BSNED',
    program_name: 'Bachelor of Special Needs Education',
    department: 'Education & Teacher Training',
    skills: [
      { name: 'Individualized Education Program (IEP) Design', category: 'Business & Management' },
      { name: 'Behavioral Intervention Plans (BIP)', category: 'Soft Skills' },
      { name: 'Assistive Technology for Learning Disabilities', category: 'Technical Skills' },
      { name: 'Basic Sign Language & Braille Literacy', category: 'Soft Skills' },
      { name: 'Inclusive Education Classroom Strategies', category: 'Soft Skills' }
    ]
  },

  // ─── 8. ARTS, DESIGN & MEDIA ────────────────────────────────────────────
  BMMA: {
    program_code: 'BMMA',
    program_name: 'Bachelor of Multimedia Arts',
    department: 'Arts, Design & Media',
    skills: [
      { name: 'UI/UX Design', category: 'Design & Creative' },
      { name: 'Figma & Prototyping Systems', category: 'Design & Creative' },
      { name: 'Graphic Design (Photoshop / Illustrator)', category: 'Design & Creative' },
      { name: 'Video Editing (Premiere Pro)', category: 'Design & Creative' },
      { name: 'Motion Graphics (After Effects)', category: 'Design & Creative' },
      { name: '3D Modeling (Blender / Maya)', category: 'Design & Creative' },
      { name: 'Digital Photography & Lighting', category: 'Design & Creative' },
      { name: 'Brand Identity & Style Guides', category: 'Design & Creative' }
    ]
  },
  BFA: {
    program_code: 'BFA',
    program_name: 'Bachelor of Fine Arts',
    department: 'Arts, Design & Media',
    skills: [
      { name: 'Visual Arts & Freehand Drawing', category: 'Design & Creative' },
      { name: 'Digital Illustration & Concept Art', category: 'Design & Creative' },
      { name: 'Typography & Layout Composition', category: 'Design & Creative' },
      { name: 'Graphic Design (Photoshop / Illustrator)', category: 'Design & Creative' },
      { name: 'Art Direction & Creative Production', category: 'Design & Creative' }
    ]
  },

  // ─── 9. AGRICULTURE & ENVIRONMENT ───────────────────────────────────────
  BSAGRI: {
    program_code: 'BSAGRI',
    program_name: 'BS Agriculture',
    department: 'Agriculture & Environment',
    skills: [
      { name: 'Crop Production & Hydroponics', category: 'Technical Skills' },
      { name: 'Soil Chemistry & Fertilizer Management', category: 'Technical Skills' },
      { name: 'Integrated Pest Management (IPM)', category: 'Technical Skills' },
      { name: 'Post-Harvest Handling & Storage', category: 'Technical Skills' },
      { name: 'Agribusiness Value Chain & Marketing', category: 'Business & Management' }
    ]
  },
  BSES: {
    program_code: 'BSES',
    program_name: 'BS Environmental Science',
    department: 'Agriculture & Environment',
    skills: [
      { name: 'Environmental Impact Assessment (EIA)', category: 'Technical Skills' },
      { name: 'Geographic Information Systems (GIS / QGIS)', category: 'Technical Skills' },
      { name: 'Water & Air Quality Sampling Analysis', category: 'Technical Skills' },
      { name: 'Solid Waste Management Systems', category: 'Technical Skills' },
      { name: 'Philippine Environmental Laws (DENR)', category: 'Business & Management' }
    ]
  },

  // ─── 10. MARITIME STUDIES ────────────────────────────────────────────────
  BSMarE: {
    program_code: 'BSMarE',
    program_name: 'BS Marine Engineering',
    department: 'Maritime Studies',
    skills: [
      { name: 'Marine Diesel Engine Propulsion', category: 'Technical Skills' },
      { name: 'Shipboard Auxiliary Machinery Overhaul', category: 'Technical Skills' },
      { name: 'STCW Watchkeeping & Engine Room Safety', category: 'Technical Skills' },
      { name: 'Maritime Firefighting & Life-Saving Appliances', category: 'Technical Skills' },
      { name: 'Marine Electrical Systems & Automation', category: 'Technical Skills' }
    ]
  }
};

// Aliases for secondary education programs
['BSED-ENG', 'BSED-MATH', 'BSED-SCI', 'BSED-FIL', 'BSED-SOCSCI', 'BSED-VALED'].forEach(code => {
  if (!PROGRAM_SKILLS_CATALOG[code]) {
    PROGRAM_SKILLS_CATALOG[code] = {
      ...PROGRAM_SKILLS_CATALOG.BSED,
      program_code: code
    };
  }
});

// Returns list of all unique skills across all programs
export function getAllUniqueSkills() {
  const skillMap = new Map();
  Object.values(PROGRAM_SKILLS_CATALOG).forEach(prog => {
    prog.skills.forEach(sk => {
      const key = sk.name.toLowerCase().trim();
      if (!skillMap.has(key)) {
        skillMap.set(key, sk);
      }
    });
  });
  return Array.from(skillMap.values());
}

// Returns program skills for a given code (or empty array)
export function getSkillsForProgram(programCode) {
  if (!programCode) return [];
  const normalized = programCode.toUpperCase().trim();
  if (PROGRAM_SKILLS_CATALOG[normalized]) {
    return PROGRAM_SKILLS_CATALOG[normalized].skills;
  }
  const foundKey = Object.keys(PROGRAM_SKILLS_CATALOG).find(k => normalized.startsWith(k) || k.startsWith(normalized));
  return foundKey ? PROGRAM_SKILLS_CATALOG[foundKey].skills : [];
}

// Returns comprehensive core + department-related skills for a given academic program code
export function getRelatedSkillsForProgram(programCode) {
  if (!programCode) return { core: [], related: [], all: [], department: '', program_code: '', program_name: '' };
  const normalized = programCode.toUpperCase().trim();
  const entry = PROGRAM_SKILLS_CATALOG[normalized] ||
    Object.values(PROGRAM_SKILLS_CATALOG).find(p => p.program_code === normalized || normalized.startsWith(p.program_code));

  if (!entry) {
    return { core: [], related: [], all: [], department: '', program_code: normalized, program_name: normalized };
  }

  const coreSkills = Array.isArray(entry.skills) ? entry.skills : [];
  const coreSkillNames = new Set(coreSkills.map(s => (s.name || '').toLowerCase().trim()));
  const department = entry.department || '';

  // Gather all unique competencies from other degree programs belonging to the same academic department / discipline
  const relatedMap = new Map();
  Object.values(PROGRAM_SKILLS_CATALOG).forEach(prog => {
    if (prog.department && prog.department.toLowerCase() === department.toLowerCase()) {
      (prog.skills || []).forEach(sk => {
        const key = (sk.name || '').toLowerCase().trim();
        if (key && !coreSkillNames.has(key) && !relatedMap.has(key)) {
          relatedMap.set(key, {
            ...sk,
            from_program: prog.program_code,
            is_related_field: true
          });
        }
      });
    }
  });

  const relatedSkills = Array.from(relatedMap.values());
  const allSkills = [...coreSkills, ...relatedSkills];

  return {
    program_code: entry.program_code,
    program_name: entry.program_name,
    department,
    core: coreSkills,
    related: relatedSkills,
    all: allSkills
  };
}
