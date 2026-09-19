import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import api from '../../api/client';
import PageTransition from '../../components/Layout/PageTransition';

export default function LandingPage() {
  const [stats, setStats] = useState({
    students: 10000,
    jobs: 500,
    organizations: 100,
    institutions: 50
  });

  const [selectedPolicy, setSelectedPolicy] = useState(null);

  const policyDetails = {
    verification: {
      icon: 'verified_user',
      title: 'Institutional & Business Verification Policy',
      subtitle: 'Philippine Legal Registration & Accreditation Standards',
      content: (
        <div className="space-y-4">
          <p>
            InternConPH enforces strict verification protocols for all participating employers and educational institutions prior to account activation, preventing fraudulent recruitment activities:
          </p>
          <div className="bg-surface-container p-4 rounded-xl space-y-2">
            <h4 className="font-bold text-on-surface text-xs uppercase tracking-wider text-vibrant-orange">Hiring Organizations Requirements</h4>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li><strong>Corporations & Partnerships:</strong> Securities and Exchange Commission (SEC) Certificate of Registration and Articles of Incorporation.</li>
              <li><strong>Sole Proprietorships:</strong> Department of Trade and Industry (DTI) Certificate of Business Name Registration.</li>
              <li><strong>Physical Operations:</strong> Current Mayor’s / Business Permit issued by the Local Government Unit (LGU).</li>
              <li><strong>Tax Authority:</strong> Bureau of Internal Revenue (BIR) Form 2303 Certificate of Registration.</li>
            </ul>
          </div>
          <div className="bg-surface-container p-4 rounded-xl space-y-2">
            <h4 className="font-bold text-on-surface text-xs uppercase tracking-wider text-pinoy-green">Higher Education & Technical Institutions</h4>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li><strong>Colleges & Universities:</strong> Official CHED Government Recognition (GR) certificates, Autonomous or Deregulated status certifications.</li>
              <li><strong>Accreditation Bodies:</strong> Certificates of accreditation from ALCUCOA, AACCUP, or PAASCU.</li>
              <li><strong>Technical / Vocational Centers:</strong> DepEd Permit to Operate or TESDA Certificate of TVET Program Registration (CTPR).</li>
            </ul>
          </div>
        </div>
      )
    },
    ojt_safety: {
      icon: 'health_and_safety',
      title: 'CHED CMO 104 & DOLE Internship Safety Standards',
      subtitle: 'Student Internship Program in the Philippines (SIPP) Compliance',
      content: (
        <div className="space-y-4">
          <p>
            In accordance with <strong>CHED Memorandum Order No. 104, Series of 2017</strong> and <strong>Department of Labor and Employment (DOLE)</strong> advisories, InternConPH guarantees the following protections:
          </p>
          <div className="space-y-2">
            <div className="p-3 bg-surface-container rounded-lg">
              <h5 className="font-bold text-xs text-on-surface">1. Maximum Rendered Hours</h5>
              <p className="text-xs text-on-surface-variant">Interns shall not exceed eight (8) hours per day and forty (40) hours per week. Night shifts and overtime beyond standard OJT agreements are strictly prohibited.</p>
            </div>
            <div className="p-3 bg-surface-container rounded-lg">
              <h5 className="font-bold text-xs text-on-surface">2. Structured Mentorship & Training Plan</h5>
              <p className="text-xs text-on-surface-variant">Every host organization must assign a designated Workplace Mentor who coordinates directly with the academic institution’s OJT Supervisor/Adviser.</p>
            </div>
            <div className="p-3 bg-surface-container rounded-lg">
              <h5 className="font-bold text-xs text-on-surface">3. Occupational Safety & Health (OSH)</h5>
              <p className="text-xs text-on-surface-variant">Students must not be assigned to hazardous, life-threatening, or physically punitive tasks. MOA stipulations on workplace insurance and emergency protocols are strictly enforced.</p>
            </div>
          </div>
        </div>
      )
    },
    privacy: {
      icon: 'lock',
      title: 'Data Privacy Policy & NPC Compliance',
      subtitle: 'Republic Act No. 10173 (Data Privacy Act of 2012)',
      content: (
        <div className="space-y-4">
          <p>
            InternConPH respects and upholds your privacy rights under the <strong>Data Privacy Act of 2012 (RA 10173)</strong> and its Implementing Rules and Regulations (IRR) issued by the National Privacy Commission (NPC):
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs">
            <li><strong>Purposeful Processing:</strong> Student academic records, resumes, student IDs, and portfolio materials are processed exclusively for internship deployment, job matching, and institutional compliance monitoring.</li>
            <li><strong>Role-Based Access Control:</strong> Only authorized school coordinators (Registrar, OJT Supervisor, Dean) and verified partner employers with approved active listings can view student candidate profiles.</li>
            <li><strong>Data Security:</strong> Industry-standard TLS encryption is maintained for all data in transit and AES-256 encryption at rest. Passwords are cryptographically hashed using bcrypt.</li>
            <li><strong>Data Subject Rights:</strong> Students and partners retain the right to access, rectify, object to processing, or request erasure of personal data upon graduation or institutional detachment.</li>
          </ul>
        </div>
      )
    },
    recruitment: {
      icon: 'policy',
      title: 'Fair Recruitment & Zero-Fee Policy',
      subtitle: 'Ethical Student Onboarding & Transparent Hiring',
      content: (
        <div className="space-y-4">
          <p>
            InternConPH maintains a strictly zero-fee recruitment standard for all student interns and job applicants:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs">
            <li><strong>No Placement / Processing Fees:</strong> Under no circumstances may an employer partner demand placement fees, training bonds, uniform charges, or registration fees from students.</li>
            <li><strong>No Ghost Listings:</strong> All posted OJT openings and job requisitions must correspond to legitimate, active organizational vacancies verified by institution coordinators.</li>
            <li><strong>Equal Opportunity:</strong> Employers agree not to discriminate based on age, gender identity, religious affiliation, ethnicity, socio-economic status, or physical disability.</li>
          </ul>
        </div>
      )
    },
    grievance: {
      icon: 'report_problem',
      title: 'Multi-Party Grievance & Incident Reporting Policy',
      subtitle: 'Due Process, Investigation, and Resolution Protocol',
      content: (
        <div className="space-y-4">
          <p>
            To address workplace misconduct, contract violations, or student conduct issues, InternConPH provides a structured, multi-tier dispute resolution channel:
          </p>
          <div className="bg-surface-container p-4 rounded-xl space-y-2 text-xs">
            <p><strong>Filing Channels:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Student vs. Organization:</strong> Reported to Institution Guidance Counselor and OJT Supervisor (e.g. interview misconduct, verbal abuse, unpaid agreed stipends).</li>
              <li><strong>Mentor vs. Student:</strong> Reported to OJT Supervisor (e.g. chronic absenteeism, breach of workplace rules, gross misconduct).</li>
              <li><strong>Institution vs. Platform:</strong> Escalated to System Admin for partner suspension or deactivation.</li>
            </ul>
          </div>
          <p className="text-xs">
            Substantiated complaints result in progressive sanctions, including official warning notices, internship reassignment, or immediate blacklisting of non-compliant organizations.
          </p>
        </div>
      )
    },
    integrity: {
      icon: 'workspace_premium',
      title: 'Academic Honor & Attendance Accountability Policy',
      subtitle: 'Cryptographic Audit Trail for Rendered Hours',
      content: (
        <div className="space-y-4">
          <p>
            Academic credibility is the bedrock of InternConPH. All time logs, rendered hours, and employer evaluation ratings are digitally recorded and audited:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-xs">
            <li><strong>Digital Time Record (DTR):</strong> Daily time-in and time-out logs require mentor confirmation and are visible in real-time to school supervisors.</li>
            <li><strong>Zero Tolerance for Falsification:</strong> Forging attendance, falsifying mentor signatures, or circumventing evaluation systems will lead to immediate invalidation of OJT credits and disciplinary action by the home institution.</li>
            <li><strong>Verified Completion Certificates:</strong> Completion records are generated only upon verified satisfaction of all prescribed academic and industry hours.</li>
          </ul>
        </div>
      )
    }
  };

  useEffect(() => {
    api.get('/public/stats').then((res) => {
      if (res.success && res.data) {
        setStats(res.data);
      }
    });
  }, []);

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen">
        <Header />

      <main className="flex-grow">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden bg-surface-container-lowest py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8 border-b border-outline-variant">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-4 sm:space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-tint text-vibrant-orange font-bold text-xs">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                Philippine OJT & Internship Ecosystem
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-on-surface leading-tight">
                Connect Your <span className="text-vibrant-orange">OJT Experience</span> to Your Future Career
              </h1>
              <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed">
                The centralized portal bridging Filipino college students, CHED-accredited universities, and leading hiring organizations for verified on-the-job training.
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 pt-2">
                <Link
                  to="/get-started"
                  className="px-6 sm:px-8 py-3 sm:py-3.5 bg-vibrant-orange text-white rounded-full font-bold text-center text-sm sm:text-base hover:bg-deep-orange transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95"
                >
                  Join InternConPH
                </Link>
                <a
                  href="#how-it-works"
                  className="px-6 sm:px-8 py-3 sm:py-3.5 border border-outline-variant text-on-surface rounded-full font-bold text-center text-sm sm:text-base hover:bg-surface-container transition-colors active:scale-95"
                >
                  Learn More
                </a>
              </div>
            </motion.div>

            {/* Hero Stats Card Bento */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, staggerChildren: 0.1 }}
              className="grid grid-cols-2 gap-2.5 sm:gap-4"
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bento-card flex flex-col justify-center items-center text-center p-4 sm:p-6 md:p-8 bg-gradient-to-br from-vibrant-orange to-deep-orange border-vibrant-orange/30 hover:scale-105 transition-transform cursor-default"
              >
                <span className="material-symbols-outlined text-white/90 text-[28px] sm:text-[36px] mb-1 sm:mb-2">school</span>
                <span className="text-2xl sm:text-3xl font-bold text-white">{stats.students.toLocaleString()}+</span>
                <span className="text-[10px] sm:text-xs font-bold text-white/70 uppercase tracking-wider mt-1">Students Enrolled</span>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bento-card flex flex-col justify-center items-center text-center p-4 sm:p-6 md:p-8 bg-gradient-to-br from-vibrant-orange to-deep-orange border-vibrant-orange/30 hover:scale-105 transition-transform cursor-default"
              >
                <span className="material-symbols-outlined text-white/90 text-[28px] sm:text-[36px] mb-1 sm:mb-2">work</span>
                <span className="text-2xl sm:text-3xl font-bold text-white">{stats.jobs.toLocaleString()}+</span>
                <span className="text-[10px] sm:text-xs font-bold text-white/70 uppercase tracking-wider mt-1">Open Positions</span>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bento-card flex flex-col justify-center items-center text-center p-4 sm:p-6 md:p-8 bg-gradient-to-br from-vibrant-orange to-deep-orange border-vibrant-orange/30 hover:scale-105 transition-transform cursor-default"
              >
                <span className="material-symbols-outlined text-white/90 text-[28px] sm:text-[36px] mb-1 sm:mb-2">business</span>
                <span className="text-2xl sm:text-3xl font-bold text-white">{stats.organizations.toLocaleString()}+</span>
                <span className="text-[10px] sm:text-xs font-bold text-white/70 uppercase tracking-wider mt-1">Employer Partners</span>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bento-card flex flex-col justify-center items-center text-center p-4 sm:p-6 md:p-8 bg-gradient-to-br from-vibrant-orange to-deep-orange border-vibrant-orange/30 hover:scale-105 transition-transform cursor-default"
              >
                <span className="material-symbols-outlined text-white/90 text-[28px] sm:text-[36px] mb-1 sm:mb-2">account_balance</span>
                <span className="text-2xl sm:text-3xl font-bold text-white">{stats.institutions.toLocaleString()}+</span>
                <span className="text-[10px] sm:text-xs font-bold text-white/70 uppercase tracking-wider mt-1">Universities</span>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-20 px-4 md:px-8 max-w-7xl mx-auto scroll-mt-20">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto mb-16 space-y-3"
          >
            <span className="text-xs font-bold text-vibrant-orange uppercase tracking-wider">Streamlined Process</span>
            <h2 className="text-3xl md:text-4xl font-bold text-on-surface">How InternConPH Works</h2>
            <p className="text-on-surface-variant">A seamless 3-way partnership connecting students, universities, and industry partners.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bento-card text-center space-y-4 hover:border-vibrant-orange transition-all duration-300 hover:scale-105 hover:-translate-y-2 hover:shadow-xl cursor-default"
            >
              <div className="w-14 h-14 rounded-2xl bg-orange-tint text-vibrant-orange flex items-center justify-center mx-auto text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-bold text-on-surface">Register & Verify</h3>
              <p className="text-sm text-on-surface-variant">
                Students register with their academic ID; universities verify eligibility for immediate OJT compliance.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bento-card text-center space-y-4 hover:border-vibrant-orange transition-all duration-300 hover:scale-105 hover:-translate-y-2 hover:shadow-xl cursor-default"
            >
              <div className="w-14 h-14 rounded-2xl bg-orange-tint text-vibrant-orange flex items-center justify-center mx-auto text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-bold text-on-surface">Match & Apply</h3>
              <p className="text-sm text-on-surface-variant">
                Explore tailored internship openings filtered by course, setup (onsite/remote), and required hours.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bento-card text-center space-y-4 hover:border-vibrant-orange transition-all duration-300 hover:scale-105 hover:-translate-y-2 hover:shadow-xl cursor-default"
            >
              <div className="w-14 h-14 rounded-2xl bg-orange-tint text-vibrant-orange flex items-center justify-center mx-auto text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-bold text-on-surface">Track & Complete</h3>
              <p className="text-sm text-on-surface-variant">
                Log rendered hours, monitor performance evaluations, and generate OJT completion credentials.
              </p>
            </motion.div>
          </div>
        </section>

        {/* OPPORTUNITIES PREVIEW */}
        <section id="opportunities" className="py-20 px-4 md:px-8 bg-surface-container-lowest border-y border-outline-variant scroll-mt-20">
          <div className="max-w-7xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex flex-col md:flex-row md:items-end justify-between mb-12"
            >
              <div className="space-y-2">
                <span className="text-xs font-bold text-vibrant-orange uppercase tracking-wider">Top Openings</span>
                <h2 className="text-3xl md:text-4xl font-bold text-on-surface">Featured OJT Opportunities</h2>
              </div>
              <Link to="/login" className="mt-4 md:mt-0 text-vibrant-orange font-bold text-sm hover:underline flex items-center gap-1 active:scale-95 transition-transform">
                View all openings in portal <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bento-card space-y-4 hover:border-vibrant-orange transition-all duration-300 hover:scale-105 hover:-translate-y-2 hover:shadow-xl"
              >
                <div className="flex justify-between items-start">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-tint text-vibrant-orange">Hybrid</span>
                  <span className="text-xs text-on-surface-variant">600 hrs</span>
                </div>
                <h3 className="text-lg font-bold text-on-surface">Software Engineering Intern</h3>
                <p className="text-xs text-on-surface-variant">FinTech Solutions PH • BGC, Taguig</p>
                <p className="text-sm text-on-surface-variant line-clamp-2">Assist with frontend development in React and backend API endpoints in Node.js.</p>
                <Link to="/register/student" className="block w-full text-center py-2 bg-surface-container rounded-lg text-xs font-bold text-on-surface hover:bg-vibrant-orange hover:text-white transition-all active:scale-95">
                  Apply via Student Portal
                </Link>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bento-card space-y-4 hover:border-pinoy-green transition-all duration-300 hover:scale-105 hover:-translate-y-2 hover:shadow-xl"
              >
                <div className="flex justify-between items-start">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-tint text-pinoy-green">Remote</span>
                  <span className="text-xs text-on-surface-variant">400 hrs</span>
                </div>
                <h3 className="text-lg font-bold text-on-surface">Digital Marketing & SEO Trainee</h3>
                <p className="text-xs text-on-surface-variant">Apex Media Ventures • Makati City</p>
                <p className="text-sm text-on-surface-variant line-clamp-2">Support social media campaign tracking, content calendar scheduling, and keyword optimization.</p>
                <Link to="/register/student" className="block w-full text-center py-2 bg-surface-container rounded-lg text-xs font-bold text-on-surface hover:bg-vibrant-orange hover:text-white transition-all active:scale-95">
                  Apply via Student Portal
                </Link>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bento-card space-y-4 hover:border-vibrant-orange transition-all duration-300 hover:scale-105 hover:-translate-y-2 hover:shadow-xl"
              >
                <div className="flex justify-between items-start">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-tint text-vibrant-orange">Onsite</span>
                  <span className="text-xs text-on-surface-variant">500 hrs</span>
                </div>
                <h3 className="text-lg font-bold text-on-surface">Human Resources Assistant</h3>
                <p className="text-xs text-on-surface-variant">Global Logistics Corp • Pasig City</p>
                <p className="text-sm text-on-surface-variant line-clamp-2">Support recruitment interview coordination, employee onboarding files, and HR documentation.</p>
                <Link to="/register/student" className="block w-full text-center py-2 bg-surface-container rounded-lg text-xs font-bold text-on-surface hover:bg-vibrant-orange hover:text-white transition-all active:scale-95">
                  Apply via Student Portal
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ROLE CARDS (For Students, Organizations, Institutions) */}
        <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto space-y-16">
          {/* For Students */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            id="for-students" 
            className="bento-card grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-8 md:p-12 scroll-mt-20 hover:border-vibrant-orange hover:shadow-xl transition-all duration-300"
          >
            <div className="space-y-4">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-tint text-vibrant-orange">For Students</span>
              <h2 className="text-3xl font-bold text-on-surface">Launch Your Career with Verified OJTs</h2>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Gain direct access to hundreds of verified partner employers, track your required OJT hours accurately, and complete academic internship requirements with confidence.
              </p>
              <Link to="/register/student" className="inline-block px-6 py-2.5 bg-vibrant-orange text-white rounded-full font-bold text-sm hover:bg-deep-orange transition-all active:scale-95 shadow-md">
                Create Student Account →
              </Link>
            </div>
            <div className="bg-surface-container p-6 rounded-xl space-y-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-pinoy-green">check_circle</span>
                <span className="text-sm font-medium">Direct matching with accredited companies</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-pinoy-green">check_circle</span>
                <span className="text-sm font-medium">Real-time rendered hours progress tracking</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-pinoy-green">check_circle</span>
                <span className="text-sm font-medium">Midterm and final performance evaluations</span>
              </div>
            </div>
          </motion.div>

          {/* For Organizations */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            id="for-organizations" 
            className="bento-card grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-8 md:p-12 scroll-mt-20 hover:border-pinoy-green hover:shadow-xl transition-all duration-300"
          >
            <div className="space-y-4">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-tint text-pinoy-green">For Employers</span>
              <h2 className="text-3xl font-bold text-on-surface">Hire Top Filipino College Interns</h2>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Post internship positions, review pre-screened student candidates from accredited universities, and log rendered hours seamlessly on one unified dashboard.
              </p>
              <Link to="/register/organization" className="inline-block px-6 py-2.5 bg-vibrant-orange text-white rounded-full font-bold text-sm hover:bg-deep-orange transition-all active:scale-95 shadow-md">
                Partner as Employer →
              </Link>
            </div>
            <div className="bg-surface-container p-6 rounded-xl space-y-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-pinoy-green">check_circle</span>
                <span className="text-sm font-medium">Instant candidate pipeline and applicant tracking</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-pinoy-green">check_circle</span>
                <span className="text-sm font-medium">1-click intern hour logging and verification</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-pinoy-green">check_circle</span>
                <span className="text-sm font-medium">Digital midterm and final evaluations</span>
              </div>
            </div>
          </motion.div>

          {/* For Institutions */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            id="for-institutions" 
            className="bento-card grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-8 md:p-12 scroll-mt-20 hover:border-vibrant-orange hover:shadow-xl transition-all duration-300"
          >
            <div className="space-y-4">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-tint text-vibrant-orange">For Universities</span>
              <h2 className="text-3xl font-bold text-on-surface">Effortless OJT Coordination & Compliance</h2>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Maintain complete oversight of student cohorts across various degree programs, approve student readiness, and monitor active deployments in real-time.
              </p>
              <Link to="/register/institution" className="inline-block px-6 py-2.5 bg-vibrant-orange text-white rounded-full font-bold text-sm hover:bg-deep-orange transition-all active:scale-95 shadow-md">
                Accredit Institution →
              </Link>
            </div>
            <div className="bg-surface-container p-6 rounded-xl space-y-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-pinoy-green">check_circle</span>
                <span className="text-sm font-medium">Student verification and enrollment queue</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-pinoy-green">check_circle</span>
                <span className="text-sm font-medium">Academic program hour matrices configuration</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-pinoy-green">check_circle</span>
                <span className="text-sm font-medium">Live host company deployment & safety monitoring</span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* POLICIES & COMPLIANCE SECTION */}
        <section id="policies" className="py-20 px-4 md:px-8 bg-surface-container-lowest border-y border-outline-variant scroll-mt-20">
          <div className="max-w-7xl mx-auto space-y-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-3xl mx-auto space-y-3"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-tint text-pinoy-green font-bold text-xs">
                <span className="material-symbols-outlined text-[16px]">gavel</span>
                Philippine Legal & Regulatory Compliance
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-on-surface">Platform Policies & Governance</h2>
              <p className="text-on-surface-variant text-sm md:text-base leading-relaxed">
                InternConPH strictly implements the guidelines of the Commission on Higher Education (CHED), Department of Labor and Employment (DOLE), and the National Privacy Commission (NPC) to safeguard students, universities, and industry partners.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Policy 1: Legitimacy & Accreditation */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bento-card p-6 rounded-2xl bg-surface-container-low border border-outline-variant flex flex-col justify-between space-y-4 hover:border-vibrant-orange hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-orange-tint text-vibrant-orange flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">verified_user</span>
                  </div>
                  <h3 className="text-lg font-bold text-on-surface">Institutional & Business Verification</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Mandatory verification for all participating entities. Businesses must provide SEC/DTI, Mayor’s Permit, and BIR 2303. HEIs must show CHED GR, Autonomous/Deregulated status, or TESDA CTPR accreditation.
                  </p>
                </div>
                <div className="pt-2 border-t border-outline-variant flex items-center justify-between">
                  <span className="text-[11px] font-bold text-pinoy-green uppercase tracking-wider">Anti-Fraud Safeguard</span>
                  <button
                    type="button"
                    onClick={() => setSelectedPolicy('verification')}
                    className="text-xs font-bold text-vibrant-orange hover:underline flex items-center gap-1 active:scale-95"
                  >
                    View Details <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              </motion.div>

              {/* Policy 2: CHED & DOLE Internship Safety */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bento-card p-6 rounded-2xl bg-surface-container-low border border-outline-variant flex flex-col justify-between space-y-4 hover:border-pinoy-green hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-green-tint text-pinoy-green flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">health_and_safety</span>
                  </div>
                  <h3 className="text-lg font-bold text-on-surface">CHED CMO 104 & DOLE OJT Standards</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Enforcing maximum 8-hour daily / 40-hour weekly OJT caps, dedicated Workplace Mentorship, safe non-hazardous work environments, and direct academic supervisor coordination.
                  </p>
                </div>
                <div className="pt-2 border-t border-outline-variant flex items-center justify-between">
                  <span className="text-[11px] font-bold text-pinoy-green uppercase tracking-wider">Student Welfare</span>
                  <button
                    type="button"
                    onClick={() => setSelectedPolicy('ojt_safety')}
                    className="text-xs font-bold text-vibrant-orange hover:underline flex items-center gap-1 active:scale-95"
                  >
                    View Details <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              </motion.div>

              {/* Policy 3: Data Privacy Act of 2012 */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bento-card p-6 rounded-2xl bg-surface-container-low border border-outline-variant flex flex-col justify-between space-y-4 hover:border-vibrant-orange hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-orange-tint text-vibrant-orange flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">lock</span>
                  </div>
                  <h3 className="text-lg font-bold text-on-surface">Data Privacy Act (RA 10173)</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Strict adherence to the Philippine Data Privacy Act of 2012. Student transcripts, resumes, portfolios, and company tax filings are protected by end-to-end encryption and role-based permissions.
                  </p>
                </div>
                <div className="pt-2 border-t border-outline-variant flex items-center justify-between">
                  <span className="text-[11px] font-bold text-pinoy-green uppercase tracking-wider">NPC Compliant</span>
                  <button
                    type="button"
                    onClick={() => setSelectedPolicy('privacy')}
                    className="text-xs font-bold text-vibrant-orange hover:underline flex items-center gap-1 active:scale-95"
                  >
                    View Details <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              </motion.div>

              {/* Policy 4: Code of Conduct & Fair Recruitment */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bento-card p-6 rounded-2xl bg-surface-container-low border border-outline-variant flex flex-col justify-between space-y-4 hover:border-pinoy-green hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-green-tint text-pinoy-green flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">policy</span>
                  </div>
                  <h3 className="text-lg font-bold text-on-surface">Fair Recruitment & Non-Discrimination</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Zero-fee policy for student applicants. Strict prohibitions on ghost job listings, unauthorized placement fees, and discrimination based on gender, religion, or regional background.
                  </p>
                </div>
                <div className="pt-2 border-t border-outline-variant flex items-center justify-between">
                  <span className="text-[11px] font-bold text-pinoy-green uppercase tracking-wider">Zero Placement Fees</span>
                  <button
                    type="button"
                    onClick={() => setSelectedPolicy('recruitment')}
                    className="text-xs font-bold text-vibrant-orange hover:underline flex items-center gap-1 active:scale-95"
                  >
                    View Details <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              </motion.div>

              {/* Policy 5: Multi-Party Grievance & Incident Reporting */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="bento-card p-6 rounded-2xl bg-surface-container-low border border-outline-variant flex flex-col justify-between space-y-4 hover:border-vibrant-orange hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-orange-tint text-vibrant-orange flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">report_problem</span>
                  </div>
                  <h3 className="text-lg font-bold text-on-surface">Grievance & Dispute Resolution</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Transparent dispute filing for students, workplace mentors, and academic deans. Reports are investigated by designated Guidance Counselors and Administrators with formal warning mechanisms.
                  </p>
                </div>
                <div className="pt-2 border-t border-outline-variant flex items-center justify-between">
                  <span className="text-[11px] font-bold text-pinoy-green uppercase tracking-wider">Due Process</span>
                  <button
                    type="button"
                    onClick={() => setSelectedPolicy('grievance')}
                    className="text-xs font-bold text-vibrant-orange hover:underline flex items-center gap-1 active:scale-95"
                  >
                    View Details <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              </motion.div>

              {/* Policy 6: Academic Honor & Anti-Ghosting */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="bento-card p-6 rounded-2xl bg-surface-container-low border border-outline-variant flex flex-col justify-between space-y-4 hover:border-pinoy-green hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-green-tint text-pinoy-green flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">workspace_premium</span>
                  </div>
                  <h3 className="text-lg font-bold text-on-surface">Academic Integrity & Hour Accountability</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Time logs, rendered hours, and evaluation ratings are cryptographically audited. Falsification of attendance or unauthorized completion certificates results in account revocation.
                  </p>
                </div>
                <div className="pt-2 border-t border-outline-variant flex items-center justify-between">
                  <span className="text-[11px] font-bold text-pinoy-green uppercase tracking-wider">Verified Credentials</span>
                  <button
                    type="button"
                    onClick={() => setSelectedPolicy('integrity')}
                    className="text-xs font-bold text-vibrant-orange hover:underline flex items-center gap-1 active:scale-95"
                  >
                    View Details <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* POLICY DETAIL MODAL */}
        {selectedPolicy && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl border border-outline-variant max-h-[85vh] flex flex-col overflow-hidden">
              <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-tint text-vibrant-orange flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined">{policyDetails[selectedPolicy]?.icon || 'policy'}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-on-surface">{policyDetails[selectedPolicy]?.title}</h3>
                    <p className="text-xs text-on-surface-variant">{policyDetails[selectedPolicy]?.subtitle}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPolicy(null)}
                  className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto text-sm text-on-surface-variant leading-relaxed">
                {policyDetails[selectedPolicy]?.content}
              </div>

              <div className="p-4 border-t border-outline-variant bg-surface-container-low flex justify-between items-center">
                <span className="text-xs text-on-surface-variant">Philippine Regulatory Standard</span>
                <button
                  type="button"
                  onClick={() => setSelectedPolicy(null)}
                  className="px-5 py-2 bg-vibrant-orange text-white rounded-full text-xs font-bold hover:bg-deep-orange transition-colors shadow-sm"
                >
                  Acknowledge & Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
      </div>
    </PageTransition>
  );
}
