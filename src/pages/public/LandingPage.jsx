import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import api from '../../api/client';
import PageTransition from '../../components/Layout/PageTransition';

export default function LandingPage() {
  const location = useLocation();
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

  // Smooth scroll to section when hash is present in URL
  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace('#', '');
      const scrollToTarget = () => {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      };
      scrollToTarget();
      const timer = setTimeout(scrollToTarget, 150);
      return () => clearTimeout(timer);
    } else if (location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.hash, location.pathname]);

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen">
        <Header />

        <main className="flex-grow">
          {/* ========================================================================= */}
          {/* 1. HERO SECTION (Video on Right, Headline & Sign In on Left)              */}
          {/* ========================================================================= */}
          <section className="relative overflow-hidden bg-surface-container-lowest py-12 sm:py-16 md:py-24 px-4 sm:px-6 md:px-8 border-b border-outline-variant">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                
                {/* Left Side: Headline, Subtitle, Sign In CTA, and Live Metrics */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="lg:col-span-6 space-y-6 text-left"
                >
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-black tracking-tight text-on-surface leading-[1.15]">
                    Connect Your <span className="text-vibrant-orange">OJT Experience</span> to Your Future Career
                  </h1>

                  {/* Prominent Sign In CTA Button */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                    <Link
                      to="/login"
                      className="px-8 py-3.5 bg-vibrant-orange text-white rounded-2xl font-bold text-center text-sm sm:text-base hover:bg-deep-orange transition-all shadow-md hover:shadow-xl transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2"
                    >
                      <span>Sign In to Account</span>
                      <span className="material-symbols-outlined text-[18px]">login</span>
                    </Link>
                    
                    <a
                      href="#how-it-works"
                      className="px-6 py-3.5 border border-outline-variant bg-surface hover:bg-surface-container text-on-surface rounded-2xl font-bold text-center text-sm transition-colors active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px] text-vibrant-orange">explore</span>
                      <span>How It Works</span>
                    </a>
                  </div>

                  {/* Live Platform Metrics Strip */}
                  <div className="pt-6 border-t border-outline-variant/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-lg sm:text-xl font-black text-on-surface block">{(stats?.students ?? 10).toLocaleString()}+</span>
                      <span className="text-on-surface-variant text-[11px] font-medium">Students Enrolled</span>
                    </div>
                    <div>
                      <span className="text-lg sm:text-xl font-black text-on-surface block">{(stats?.jobs ?? 5).toLocaleString()}+</span>
                      <span className="text-on-surface-variant text-[11px] font-medium">Open Positions</span>
                    </div>
                    <div>
                      <span className="text-lg sm:text-xl font-black text-on-surface block">{(stats?.organizations ?? 3).toLocaleString()}+</span>
                      <span className="text-on-surface-variant text-[11px] font-medium">Employer Partners</span>
                    </div>
                    <div>
                      <span className="text-lg sm:text-xl font-black text-on-surface block">{(stats?.institutions ?? 2).toLocaleString()}+</span>
                      <span className="text-on-surface-variant text-[11px] font-medium">Universities</span>
                    </div>
                  </div>
                </motion.div>

                {/* Right Side: 3D Video Showcase */}
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.15 }}
                  className="lg:col-span-6 relative w-full"
                >
                  {/* Ambient Glow */}
                  <div className="absolute -inset-3 bg-gradient-to-r from-vibrant-orange/20 via-pinoy-green/15 to-blue-500/20 rounded-3xl blur-2xl opacity-70 pointer-events-none -z-10" />

                  {/* Framed Display Container */}
                  <div className="relative rounded-3xl overflow-hidden border border-outline-variant bg-surface shadow-2xl transition-all hover:border-vibrant-orange/40">
                    <video
                      src="/landingpage.mp4"
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-auto aspect-video object-cover block select-none pointer-events-none"
                    />

                    {/* Floating Badge */}
                    <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 px-3.5 py-1.5 rounded-xl bg-surface/90 backdrop-blur-md border border-outline-variant/60 text-[11px] sm:text-xs font-bold text-on-surface flex items-center gap-2 shadow-md">
                      <span className="w-2.5 h-2.5 rounded-full bg-pinoy-green animate-pulse" />
                      <span>Interactive 3D Ecosystem Showcase</span>
                    </div>
                  </div>
                </motion.div>

              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 2. HOW INTERNCONPH WORKS (9 Comprehensive Pillars)                         */}
          {/* ========================================================================= */}
          <section id="how-it-works" className="py-20 px-4 md:px-8 max-w-7xl mx-auto scroll-mt-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-3xl mx-auto mb-16 space-y-3"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-tint text-vibrant-orange text-xs font-bold">
                <span className="material-symbols-outlined text-[16px]">account_tree</span>
                <span>CHED CMO 104 & DOLE Compliant Architecture</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-on-surface">How InternConPH Works</h2>
            </motion.div>

            {/* 9 Process Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  step: '01',
                  icon: 'verified_user',
                  title: '1. Legitimacy & Verification',
                  desc: 'Strict onboarding compliance for all parties. Employers submit SEC/DTI registration, BIR 2303, and Mayor’s permits. Higher Education Institutions submit CHED Government Recognition, ALCUCOA/PAASCU, or TESDA registration before activation.'
                },
                {
                  step: '02',
                  icon: 'key',
                  title: '2. Delegated Access-Code Governance',
                  desc: 'Secure hierarchical management. Institution Directors and HR Heads generate departmental passcodes so authorized faculty coordinators and workplace mentors can onboard with scoped permissions.'
                },
                {
                  step: '03',
                  icon: 'route',
                  title: '3. Three-Track Opportunity System',
                  desc: 'Dedicated tracks for (a) Undergraduate OJT Internships, (b) Post-OJT On-Call Professional Gigs with instant portfolio crediting, and (c) Career Full-Time Jobs exclusively for graduated alumni.'
                },
                {
                  step: '04',
                  icon: 'approval',
                  title: '4. Institutional Opportunity Clearance',
                  desc: 'Host employers dispatch opportunities to partner universities. School OJT Supervisors and Deans review curricula relevance and approve opportunities before students can view and apply.'
                },
                {
                  step: '05',
                  icon: 'psychology',
                  title: '5. Smart Candidate Matching',
                  desc: 'AI-assisted skill and curriculum matching algorithm connecting student degree programs, verified skill tags, and location preferences directly to accredited vacancies.'
                },
                {
                  step: '06',
                  icon: 'assignment_turned_in',
                  title: '6. OJT Application & Deployment Pipeline',
                  desc: 'End-to-end recruitment lifecycle from application review and interview invitations to formal offer letters, institutional clearance, and supervisor deployment with real-time DTR tracking.'
                },
                {
                  step: '07',
                  icon: 'rate_review',
                  title: '7. OJT Performance Evaluation',
                  desc: 'Formal competency evaluation tools for assigned Workplace Mentors to conduct midterm and final performance evaluations aligned with academic grading requirements.'
                },
                {
                  step: '08',
                  icon: 'workspace_premium',
                  title: '8. Skills Passport / Verified Credentials',
                  desc: 'Tamper-proof Digital Career Portfolio capturing verified rendered hours, mentor ratings, project deliverables, and automated official Certificates of OJT Completion.'
                },
                {
                  step: '09',
                  icon: 'gavel',
                  title: '9. Incident & Complaint System',
                  desc: 'Structured multi-party grievance mechanism allowing students, mentors, and institutions to report workplace infractions, safety issues, or contract violations with due process.'
                }
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                  className="bento-card p-6 flex flex-col justify-between space-y-4 hover:border-vibrant-orange hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-orange-tint text-vibrant-orange flex items-center justify-center font-black text-sm shadow-xs">
                        <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
                      </div>
                      <span className="text-xs font-black text-on-surface-variant/50 tracking-widest">{item.step}</span>
                    </div>
                    <h3 className="text-base font-bold text-on-surface">{item.title}</h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 3. ECOSYSTEM GOAL & OJT TO CAREER TRANSITION (1 Consolidated Paragraph)     */}
          {/* ========================================================================= */}
          <section id="opportunities" className="py-20 px-4 md:px-8 bg-surface-container-lowest border-y border-outline-variant scroll-mt-20">
            <div className="max-w-5xl mx-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="bento-card p-8 md:p-12 space-y-6 bg-gradient-to-br from-surface via-surface-container-low to-orange-500/5 border border-vibrant-orange/30 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-vibrant-orange text-white flex items-center justify-center font-bold shadow-md shrink-0">
                    <span className="material-symbols-outlined text-[26px]">military_tech</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-vibrant-orange uppercase tracking-wider block">The InternConPH Mission</span>
                    <h2 className="text-2xl sm:text-3xl font-black text-on-surface">Connecting OJT Directly to Your Future Career</h2>
                  </div>
                </div>

                {/* 1 Inspiring, Comprehensive Goal Paragraph */}
                <p className="text-sm sm:text-base text-on-surface leading-relaxed text-justify font-medium">
                  InternConPH transforms traditional on-the-job training from a mere academic graduation checklist into a verified, permanent career springboard. Every hour logged through our tamper-proof Digital Time Record (DTR), every competency scored by your workplace mentor, and every milestone achieved during your internship is cryptographically recorded into your lifelong Digital Career Portfolio and Skills Passport. When you graduate and apply for high-growth career jobs or flexible on-call professional engagements across the Philippines, hiring organizations can instantly inspect your verified performance evaluations, authentic attendance history, and faculty clearances—eliminating unverified resume claims and giving you an immediate, credible competitive edge.
                </p>

                <div className="pt-4 border-t border-outline-variant/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-pinoy-green">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>100% Certified Experience for Post-Graduation Employment</span>
                  </div>
                  <Link
                    to="/login"
                    className="px-6 py-2.5 bg-vibrant-orange text-white rounded-xl text-xs font-bold hover:bg-deep-orange transition-colors shadow-sm self-stretch sm:self-auto text-center"
                  >
                    Enter Candidate Portal →
                  </Link>
                </div>
              </motion.div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 4. DETAILED ROLE MODULES (For Students, Organizations, Institutions)      */}
          {/* ========================================================================= */}
          <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto space-y-16">
            
            {/* For Students */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              id="for-students"
              className="bento-card grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-8 md:p-12 scroll-mt-20 hover:border-vibrant-orange hover:shadow-xl transition-all duration-300"
            >
              <div className="space-y-4">
                <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-orange-tint text-vibrant-orange">
                  🎓 For Students & Candidates
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-on-surface">Launch Your Career with Verified OJTs & On-Call Gigs</h2>
                <p className="text-on-surface-variant text-xs sm:text-sm leading-relaxed">
                  Direct access to accredited host organizations pre-cleared by your university. Build a comprehensive career portfolio and graduate with verifiable job-ready skills.
                </p>
                <div className="pt-2">
                  <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-vibrant-orange text-white rounded-2xl font-bold text-xs sm:text-sm hover:bg-deep-orange transition-all shadow-md active:scale-95">
                    <span>Explore Student Portal</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </div>
              </div>

              <div className="bg-surface-container p-6 rounded-2xl space-y-3 text-xs">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-pinoy-green text-[20px] shrink-0">check_circle</span>
                  <div>
                    <span className="font-bold text-on-surface block">Accredited Three-Track Opportunities:</span>
                    <span className="text-on-surface-variant">Apply for approved OJT internships, flexible on-call gigs with instant portfolio crediting, and career jobs.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-pinoy-green text-[20px] shrink-0">check_circle</span>
                  <div>
                    <span className="font-bold text-on-surface block">Digital Time Record (DTR) & Hours Tracking:</span>
                    <span className="text-on-surface-variant">Live login/logout logs, overtime computation safeguards, and automatic supervisor hour confirmation.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-pinoy-green text-[20px] shrink-0">check_circle</span>
                  <div>
                    <span className="font-bold text-on-surface block">Unified Digital Career Portfolio:</span>
                    <span className="text-on-surface-variant">Showcase academic projects, uploaded transcripts, formatted resumes, and auto-generated OJT Completion Certificates.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-pinoy-green text-[20px] shrink-0">check_circle</span>
                  <div>
                    <span className="font-bold text-on-surface block">Workplace Safety & Grievance Protection:</span>
                    <span className="text-on-surface-variant">Direct dispute filing to institution guidance counselors and OJT coordinators under CHED CMO 104 guidelines.</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* For Organizations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              id="for-organizations"
              className="bento-card grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-8 md:p-12 scroll-mt-20 hover:border-pinoy-green hover:shadow-xl transition-all duration-300"
            >
              <div className="space-y-4">
                <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-green-tint text-pinoy-green">
                  🏢 For Hiring Organizations & Employers
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-on-surface">Hire, Supervise, and Retain Top College Talent</h2>
                <p className="text-on-surface-variant text-xs sm:text-sm leading-relaxed">
                  Streamline intern recruitment, mentor assignments, time tracking, and performance evaluations on one unified platform with direct institutional partner integration.
                </p>
                <div className="pt-2">
                  <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-pinoy-green text-white rounded-2xl font-bold text-xs sm:text-sm hover:opacity-90 transition-all shadow-md active:scale-95">
                    <span>Explore Employer Portal</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </div>
              </div>

              <div className="bg-surface-container p-6 rounded-2xl space-y-3 text-xs">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-pinoy-green text-[20px] shrink-0">check_circle</span>
                  <div>
                    <span className="font-bold text-on-surface block">Pre-Screened Talent Pipeline:</span>
                    <span className="text-on-surface-variant">Access enrolled candidates from accredited universities matched by specific course requirements and skills.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-pinoy-green text-[20px] shrink-0">check_circle</span>
                  <div>
                    <span className="font-bold text-on-surface block">Delegated Workplace Mentorship:</span>
                    <span className="text-on-surface-variant">Authorize department supervisors with scoped access codes to supervise DTR hours and conduct midterm/final evaluations.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-pinoy-green text-[20px] shrink-0">check_circle</span>
                  <div>
                    <span className="font-bold text-on-surface block">Formal Dispatch & Offer Management:</span>
                    <span className="text-on-surface-variant">Issue customized interview invitations, official digital offer letters, and manage on-call assignments.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-pinoy-green text-[20px] shrink-0">check_circle</span>
                  <div>
                    <span className="font-bold text-on-surface block">Verified Credential Endorsement:</span>
                    <span className="text-on-surface-variant">Auto-credit student deliverables upon assignment completion, establishing strong university partnership ties.</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* For Institutions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              id="for-institutions"
              className="bento-card grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-8 md:p-12 scroll-mt-20 hover:border-blue-500 hover:shadow-xl transition-all duration-300"
            >
              <div className="space-y-4">
                <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600">
                  🏛️ For Universities & Higher Education Institutions
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-on-surface">Effortless OJT Coordination, Monitoring & CHED Compliance</h2>
                <p className="text-on-surface-variant text-xs sm:text-sm leading-relaxed">
                  Complete departmental oversight of student cohorts across all academic degree programs. Inspect employer opportunities, enforce clearance requirements, and audit time logs.
                </p>
                <div className="pt-2">
                  <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-xs sm:text-sm hover:bg-blue-700 transition-all shadow-md active:scale-95">
                    <span>Explore Academic Portal</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </div>
              </div>

              <div className="bg-surface-container p-6 rounded-2xl space-y-3 text-xs">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-pinoy-green text-[20px] shrink-0">check_circle</span>
                  <div>
                    <span className="font-bold text-on-surface block">Multi-Tier Academic Governance:</span>
                    <span className="text-on-surface-variant">Scoped portals for Institution Directors, Deans, Registrars, OJT Coordinators, and Guidance Counselors.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-pinoy-green text-[20px] shrink-0">check_circle</span>
                  <div>
                    <span className="font-bold text-on-surface block">Pre-OJT Clearance Enforcement:</span>
                    <span className="text-on-surface-variant">Verify student readiness, academic prerequisites, medical clearances, and parent consent forms before matching.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-pinoy-green text-[20px] shrink-0">check_circle</span>
                  <div>
                    <span className="font-bold text-on-surface block">Curricular Opportunity Vetting:</span>
                    <span className="text-on-surface-variant">Review dispatched employer job requisitions to ensure learning outcomes align with program syllabi.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-pinoy-green text-[20px] shrink-0">check_circle</span>
                  <div>
                    <span className="font-bold text-on-surface block">Auditable Rendered Hours & Grading:</span>
                    <span className="text-on-surface-variant">Real-time attendance logs, incident reports, and mentor evaluations for seamless CHED CMO 104 compliance audits.</span>
                  </div>
                </div>
              </div>
            </motion.div>

          </section>

          {/* ========================================================================= */}
          {/* 5. POLICIES & COMPLIANCE SECTION (6 Legal & Ethical Safeguards)           */}
          {/* ========================================================================= */}
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
                  <span>Philippine Legal & Regulatory Compliance</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-on-surface">Platform Policies & Governance</h2>
                <p className="text-on-surface-variant text-xs sm:text-sm leading-relaxed">
                  InternConPH strictly implements the guidelines of the Commission on Higher Education (CHED), Department of Labor and Employment (DOLE), and the National Privacy Commission (NPC) to safeguard students, universities, and industry partners.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  {
                    key: 'verification',
                    icon: 'verified_user',
                    title: 'Institutional & Business Verification',
                    tag: 'Anti-Fraud Safeguard',
                    desc: 'Mandatory verification for all participating entities. Businesses must provide SEC/DTI, Mayor’s Permit, and BIR 2303. HEIs must show CHED GR, Autonomous/Deregulated status, or TESDA CTPR accreditation.'
                  },
                  {
                    key: 'ojt_safety',
                    icon: 'health_and_safety',
                    title: 'CHED CMO 104 & DOLE Safety',
                    tag: 'Intern Protection',
                    desc: 'Enforcement of SIPP standards: 8h/day max limit, 40h/week max, strict ban on hazardous/punitive labor, mandatory workplace insurance, and structured mentorship training plans.'
                  },
                  {
                    key: 'privacy',
                    icon: 'lock',
                    title: 'Data Privacy & NPC Compliance',
                    tag: 'RA 10173 Protected',
                    desc: 'Strict adherence to RA 10173 (Data Privacy Act of 2012). Student academic records, resumes, and identification documents are encrypted at rest (AES-256) and accessed strictly via role-based controls.'
                  },
                  {
                    key: 'recruitment',
                    icon: 'policy',
                    title: 'Fair Recruitment & Zero-Fee',
                    tag: 'Ethical Standard',
                    desc: 'Zero-fee policy strictly banning placement fees, training bonds, uniform fees, or registration charges from student applicants. Prohibits ghost listings and discrimination.'
                  },
                  {
                    key: 'grievance',
                    icon: 'report_problem',
                    title: 'Multi-Party Grievance Resolution',
                    tag: 'Due Process',
                    desc: 'Formal incident reporting channels for students, mentors, and school coordinators to report non-compliance, workplace harassment, or unverified claims with progressive sanction protocols.'
                  },
                  {
                    key: 'integrity',
                    icon: 'workspace_premium',
                    title: 'Attendance Honor & Audit Trail',
                    tag: 'Integrity System',
                    desc: 'Cryptographically audited time-in/out records and mentor evaluations preventing falsification of rendered hours. Certificates of Completion generated only upon verified satisfaction.'
                  }
                ].map((pol, idx) => (
                  <motion.div
                    key={pol.key}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: idx * 0.05 }}
                    className="bento-card p-6 flex flex-col justify-between space-y-4 hover:border-vibrant-orange hover:shadow-xl hover:-translate-y-1 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-orange-tint text-vibrant-orange flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">{pol.icon}</span>
                      </div>
                      <h3 className="text-base font-bold text-on-surface">{pol.title}</h3>
                      <p className="text-xs text-on-surface-variant leading-relaxed">{pol.desc}</p>
                    </div>
                    <div className="pt-2 border-t border-outline-variant flex items-center justify-between">
                      <span className="text-[10px] font-bold text-pinoy-green uppercase tracking-wider">{pol.tag}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedPolicy(pol.key)}
                        className="text-xs font-bold text-vibrant-orange hover:underline flex items-center gap-1 active:scale-95"
                      >
                        <span>View Details</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        </main>

        <Footer />

        {/* POLICY DETAILS MODAL */}
        {selectedPolicy && policyDetails[selectedPolicy] && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
            onClick={() => setSelectedPolicy(null)}
          >
            <div
              className="bg-surface border border-outline-variant rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-outline-variant pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-orange-tint text-vibrant-orange flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[26px]">
                      {policyDetails[selectedPolicy].icon}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-on-surface">
                      {policyDetails[selectedPolicy].title}
                    </h3>
                    <p className="text-xs font-medium text-vibrant-orange">
                      {policyDetails[selectedPolicy].subtitle}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPolicy(null)}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="text-xs sm:text-sm text-on-surface-variant leading-relaxed space-y-4">
                {policyDetails[selectedPolicy].content}
              </div>

              <div className="pt-4 border-t border-outline-variant flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedPolicy(null)}
                  className="px-6 py-2.5 bg-vibrant-orange text-white rounded-xl text-xs font-bold hover:bg-deep-orange transition-colors"
                >
                  Close Policy Document
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
