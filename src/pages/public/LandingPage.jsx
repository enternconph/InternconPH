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
  const [activeMember, setActiveMember] = useState(null);
  const [selectedRoleDetail, setSelectedRoleDetail] = useState(null);

  const teamMembers = [
    {
      id: 1,
      image: '/photo/image1.jpg',
      role: 'The Hacker',
      roleSubtitle: 'The Builder & Engineer',
      emoji: '💻',
      icon: 'terminal',
      badgeBg: 'rgba(14, 165, 233, 0.15)',
      badgeColor: '#38bdf8',
      badgeBorder: 'rgba(56, 189, 248, 0.3)',
      desc: "The technical backbone of the operation. Takes the Hipster's designs and the Hustler's vision and turns them into working, functional code.",
      coreFocus: 'Software engineering, architecture, infrastructure, and technical problem-solving.',
      responsibilities: [
        'Writing clean, maintainable code',
        'Choosing and optimizing the tech stack',
        'Managing databases and security schemas',
        'Shipping product updates quickly and reliably'
      ],
      superpower: 'Building prototypes overnight and finding creative workarounds to complex technical roadblocks.',
      typicalTitles: 'Chief Technology Officer (CTO), Lead Engineer, Full-Stack Developer'
    },
    {
      id: 2,
      image: '/photo/image2.jpg',
      role: 'The Hipster',
      roleSubtitle: 'The Designer & Storyteller',
      emoji: '🎨',
      icon: 'palette',
      badgeBg: 'rgba(168, 85, 247, 0.15)',
      badgeColor: '#c084fc',
      badgeBorder: 'rgba(192, 132, 252, 0.3)',
      desc: 'The creative force focused on the user experience (UX), branding, and aesthetic appeal. Ensures the product is not just functional, but beautiful and intuitive to use.',
      coreFocus: 'Design, user experience, branding, and customer empathy.',
      responsibilities: [
        'Designing wireframes and responsive UI components',
        'Conducting user research and testing student flows',
        'Keeping the brand trendy and modern',
        'Crafting the company’s creative visual identity'
      ],
      superpower: 'Understanding what the customer wants before the customer even knows it.',
      typicalTitles: 'Chief Design Officer (CDO), VP of Product, Creative Director'
    },
    {
      id: 3,
      image: '/photo/image3.jpg',
      role: 'The Hipster',
      roleSubtitle: 'The Designer & Storyteller',
      emoji: '🎨',
      icon: 'auto_awesome',
      badgeBg: 'rgba(244, 63, 94, 0.15)',
      badgeColor: '#fb7185',
      badgeBorder: 'rgba(251, 113, 133, 0.3)',
      desc: 'Drives customer empathy and aesthetic harmony across every touchpoint, ensuring intuitive interactions for students, mentors, and academic coordinators.',
      coreFocus: 'Design, user experience, branding, and customer empathy.',
      responsibilities: [
        'Crafting intuitive user journeys and accessibility',
        'Designing engaging digital interfaces and design tokens',
        'User research and student feedback synthesis',
        'Delivering cohesive visual storytelling across portals'
      ],
      superpower: 'Understanding what the customer wants before the customer even knows it.',
      typicalTitles: 'Chief Design Officer (CDO), VP of Product, Creative Director'
    },
    {
      id: 4,
      image: '/photo/image4.jpg',
      role: 'The Hustler',
      roleSubtitle: 'The Business & Sales Driver',
      emoji: '💼',
      icon: 'rocket_launch',
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      badgeColor: '#fbbf24',
      badgeBorder: 'rgba(251, 191, 36, 0.3)',
      desc: 'The operational heartbeat and the public face of the startup. Responsible for traction, monetization, and scaling the business.',
      coreFocus: 'Sales, marketing, fundraising, and business strategy.',
      responsibilities: [
        'Pitching to academic and enterprise partners',
        'Finding early customer organizations and internships',
        'Managing the operational roadmap and budgets',
        'Forming strategic partnerships across the country'
      ],
      superpower: "Selling a vision that doesn't fully exist yet and keeping the team focused on generating revenue.",
      typicalTitles: 'Chief Executive Officer (CEO), Chief Operating Officer (COO), Head of Sales'
    }
  ];

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
          {/* 1. HERO SECTION (Immersive Video Card with Cinematic Dark Overlay)         */}
          {/* ========================================================================= */}
          <section className="relative px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-6 sm:pb-10 max-w-[1440px] mx-auto">
            <div className="relative rounded-[28px] sm:rounded-[36px] md:rounded-[44px] overflow-hidden shadow-2xl border border-white/15 dark:border-white/10 min-h-[580px] sm:min-h-[640px] md:min-h-[720px] flex flex-col justify-between p-6 sm:p-10 md:p-14 lg:p-16 bg-black">
              
              {/* Background Video */}
              <video
                src="/landingpage.mp4"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none z-0"
              />

              {/* Multi-layer Cinematic Overlays for Crystal Clear Contrast */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/35 z-10" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-10" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent z-10" />
              <div className="absolute -inset-1 bg-gradient-to-tr from-vibrant-orange/15 via-transparent to-pinoy-green/10 z-10 pointer-events-none" />

              {/* Top Floating Badge */}
              <div className="relative z-20 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 text-xs font-semibold shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>CHED CMO 104 & DOLE SIPP Certified Platform</span>
                </div>
              </div>

              {/* Center/Left Hero Typography & CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="relative z-20 max-w-3xl my-auto space-y-6 pt-8 pb-12 text-left"
              >
                {/* Eyebrow */}
                <div className="flex items-center gap-3">
                  <span className="w-8 sm:w-12 h-[2.5px] bg-gradient-to-r from-amber-400 to-vibrant-orange rounded-full shadow-sm" />
                  <span className="text-amber-300 sm:text-amber-400 font-bold tracking-[0.2em] text-xs sm:text-sm uppercase">
                    YOUR DREAM CAREER AWAITS
                  </span>
                </div>

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.08] tracking-tight drop-shadow-lg">
                  Find Your <br className="hidden sm:inline" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-vibrant-orange to-orange-500">
                    Perfect Opportunity.
                  </span>
                </h1>

                {/* Subtitle description */}
                <p className="text-base sm:text-lg md:text-xl text-white/85 max-w-xl font-normal leading-relaxed drop-shadow">
                  Modern internships, verified partner employers, automated DTR tracking, and graduate pathways. We help Filipino students connect with real-world careers.
                </p>

                {/* Action CTA Buttons */}
                <div className="flex flex-wrap items-center gap-3.5 pt-2">
                  <Link
                    to="/get-started"
                    className="px-7 sm:px-8 py-3.5 sm:py-4 rounded-full bg-gradient-to-r from-amber-400 via-vibrant-orange to-deep-orange text-white font-black text-sm sm:text-base hover:brightness-110 shadow-xl shadow-orange-500/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <span>Get Started</span>
                    <span className="material-symbols-outlined text-[20px] transition-transform duration-200 group-hover:translate-x-1">
                      arrow_forward
                    </span>
                  </Link>

                  <a
                    href="#how-it-works"
                    className="px-6 sm:px-7 py-3.5 sm:py-4 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/25 text-white font-bold text-sm sm:text-base transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px] text-amber-300">
                      explore
                    </span>
                    <span>How It Works</span>
                    <span className="material-symbols-outlined text-[18px] opacity-70 transition-transform duration-200 group-hover:translate-x-0.5">
                      arrow_forward
                    </span>
                  </a>
                </div>
              </motion.div>

              {/* Bottom Metrics & Scroll Indicator Strip */}
              <div className="relative z-20 pt-6 border-t border-white/15 flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Metric Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
                      <span className="material-symbols-outlined text-[22px]">school</span>
                    </div>
                    <div>
                      <span className="text-xl sm:text-2xl font-black text-white block leading-tight">
                        {(stats?.students ?? 10000).toLocaleString()}+
                      </span>
                      <span className="text-white/70 text-[11px] sm:text-xs font-medium">Students Enrolled</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
                      <span className="material-symbols-outlined text-[22px]">work</span>
                    </div>
                    <div>
                      <span className="text-xl sm:text-2xl font-black text-white block leading-tight">
                        {(stats?.jobs ?? 500).toLocaleString()}+
                      </span>
                      <span className="text-white/70 text-[11px] sm:text-xs font-medium">Verified Positions</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
                      <span className="material-symbols-outlined text-[22px]">corporate_fare</span>
                    </div>
                    <div>
                      <span className="text-xl sm:text-2xl font-black text-white block leading-tight">
                        {(stats?.organizations ?? 100).toLocaleString()}+
                      </span>
                      <span className="text-white/70 text-[11px] sm:text-xs font-medium">Partner Employers</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
                      <span className="material-symbols-outlined text-[22px]">account_balance</span>
                    </div>
                    <div>
                      <span className="text-xl sm:text-2xl font-black text-white block leading-tight">
                        {(stats?.institutions ?? 50).toLocaleString()}+
                      </span>
                      <span className="text-white/70 text-[11px] sm:text-xs font-medium">Accredited HEIs</span>
                    </div>
                  </div>
                </div>

                {/* Scroll Indicator on Bottom Right */}
                <a
                  href="#how-it-works"
                  className="hidden md:flex items-center gap-2.5 text-white/75 hover:text-white transition-colors group cursor-pointer shrink-0"
                >
                  <div className="w-9 h-9 rounded-full border border-white/30 group-hover:border-white flex items-center justify-center backdrop-blur-sm bg-white/5 transition-all group-hover:bg-white/15">
                    <span className="material-symbols-outlined text-[18px] animate-bounce">
                      arrow_downward
                    </span>
                  </div>
                  <span className="text-xs font-semibold tracking-wide">Scroll Down to Explore</span>
                </a>
              </div>

            </div>
          </section>

          {/* ========================================================================= */}
          {/* 1.5 CLIENT LOGOS STRIP & ABOUT / TEAM SECTION                             */}
          {/* ========================================================================= */}
          <section
            id="about"
            className="py-16 sm:py-20 md:py-24 bg-surface-container-lowest/80 border-b border-outline-variant/30 scroll-mt-20 transition-colors"
            onClick={() => setActiveMember(null)}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14 md:space-y-18">
              
              {/* Centered Heading: InternConPH Developer */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-center max-w-3xl mx-auto space-y-3"
              >
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-tint text-vibrant-orange text-xs font-bold shadow-xs">
                  <span className="material-symbols-outlined text-[16px]">terminal</span>
                  <span>CORE ENGINEERING & DESIGN</span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-on-surface tracking-tight">
                  InternConPH Developer
                </h2>
                <p className="text-xs sm:text-sm text-on-surface-variant max-w-xl mx-auto font-medium">
                  Meet the passionate engineers, designers, and innovators building the future of Philippine internships.
                </p>
              </motion.div>

              {/* 4 Team Member Photos in a Row (Edge-to-Edge Photo Strip) */}
              <div
                id="team"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-2"
              >
                {teamMembers.map((member, idx) => {
                  const isRevealed = activeMember === idx;
                  return (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, y: 25 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: idx * 0.08 }}
                      tabIndex={0}
                      role="button"
                      aria-label={`${member.role}: ${member.desc}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMember(isRevealed ? null : idx);
                      }}
                      onFocus={() => setActiveMember(idx)}
                      onBlur={() => setActiveMember(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setActiveMember(isRevealed ? null : idx);
                        }
                      }}
                      className="group relative rounded-2xl sm:rounded-3xl overflow-hidden bg-white dark:bg-neutral-900 border border-outline-variant/30 hover:border-vibrant-orange/60 focus:border-vibrant-orange focus:ring-2 focus:ring-vibrant-orange/40 transition-all duration-300 outline-none cursor-pointer select-none shadow-xs hover:shadow-2xl"
                    >
                      {/* Photo Container: Clean cutout on plain background, edge-to-edge */}
                      <div className="relative w-full h-[380px] sm:h-[420px] md:h-[460px] lg:h-[480px] flex items-end justify-center overflow-hidden bg-gradient-to-b from-transparent via-neutral-50/60 to-neutral-100/80 dark:from-transparent dark:via-neutral-900/60 dark:to-neutral-950/80">
                        <img
                          src={member.image}
                          alt={member.role}
                          loading="lazy"
                          className={`w-full h-full object-contain object-bottom transition-all duration-300 ease-out group-hover:scale-105 group-hover:brightness-75 group-focus:scale-105 group-focus:brightness-75 ${
                            isRevealed ? 'scale-105 brightness-75' : 'brightness-100'
                          }`}
                        />
                      </div>

                      {/* Smooth Fade / Slide-up Overlay on Hover / Focus / Tap */}
                      <div
                        className={`absolute inset-0 bg-gradient-to-t from-black/95 via-black/80 to-black/30 backdrop-blur-[3px] flex flex-col justify-end p-5 sm:p-6 text-center transition-all duration-300 ease-out pointer-events-none ${
                          isRevealed
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 group-focus:opacity-100 group-focus:translate-y-0'
                        }`}
                      >
                        <div className="space-y-2.5">
                          {/* Role Pill Badge */}
                          <div
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase shadow-md mx-auto"
                            style={{
                              backgroundColor: member.badgeBg,
                              color: member.badgeColor,
                              border: `1px solid ${member.badgeBorder}`
                            }}
                          >
                            <span>{member.emoji}</span>
                            <span>{member.role}</span>
                          </div>

                          {/* Role Subtitle */}
                          <p className="text-[11px] font-bold tracking-wide uppercase text-white/80">
                            {member.roleSubtitle}
                          </p>

                          {/* Description */}
                          <p className="text-xs text-white/90 font-normal leading-relaxed line-clamp-3">
                            {member.desc}
                          </p>

                          {/* Superpower Callout */}
                          <div className="p-2 rounded-xl bg-white/10 border border-white/15 text-[11px] text-white/90 text-left flex items-start gap-1.5">
                            <span className="text-amber-400 font-bold shrink-0">⚡</span>
                            <span className="line-clamp-2"><strong>Superpower:</strong> {member.superpower}</span>
                          </div>

                          {/* View Full Breakdown CTA */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRoleDetail(member);
                            }}
                            className="pointer-events-auto w-full py-2 px-3 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white text-[11px] font-bold border border-white/20 transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                          >
                            <span>View Full Profile</span>
                            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
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
          {/* 3. MISSION & OJT TO CAREER TRANSITION (1 Consolidated Paragraph)           */}
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

        {/* ROLE DETAILS BREAKDOWN MODAL */}
        {selectedRoleDetail && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
            onClick={() => setSelectedRoleDetail(null)}
          >
            <div
              className="bg-surface border border-outline-variant rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-scale-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-outline-variant pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-surface-container shrink-0 border border-outline-variant shadow-sm">
                    <img src={selectedRoleDetail.image} alt={selectedRoleDetail.role} className="w-full h-full object-cover object-top" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{selectedRoleDetail.emoji}</span>
                      <h3 className="text-xl font-black text-on-surface">
                        {selectedRoleDetail.role}
                      </h3>
                    </div>
                    <p className="text-xs font-bold text-vibrant-orange tracking-wide uppercase">
                      {selectedRoleDetail.roleSubtitle}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRoleDetail(null)}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="space-y-4 text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                <p className="text-sm font-medium text-on-surface bg-surface-container/60 p-4 rounded-2xl border border-outline-variant/40">
                  {selectedRoleDetail.desc}
                </p>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-on-surface text-xs uppercase tracking-wider text-vibrant-orange flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">target</span>
                    <span>Core Focus</span>
                  </h4>
                  <p className="p-3.5 bg-surface-container rounded-xl text-on-surface font-medium">
                    {selectedRoleDetail.coreFocus}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-on-surface text-xs uppercase tracking-wider text-pinoy-green flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">checklist</span>
                    <span>Key Responsibilities</span>
                  </h4>
                  <ul className="list-disc pl-5 space-y-1.5 text-on-surface bg-surface-container p-3.5 rounded-xl">
                    {selectedRoleDetail.responsibilities.map((resp, i) => (
                      <li key={i}>{resp}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-on-surface text-xs uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">bolt</span>
                    <span>Superpower</span>
                  </h4>
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-on-surface font-medium">
                    {selectedRoleDetail.superpower}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-on-surface text-xs uppercase tracking-wider text-blue-500 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">badge</span>
                    <span>Typical Industry Titles</span>
                  </h4>
                  <p className="p-3.5 bg-surface-container rounded-xl text-on-surface font-semibold">
                    {selectedRoleDetail.typicalTitles}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-outline-variant flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedRoleDetail(null)}
                  className="px-6 py-2.5 bg-vibrant-orange text-white rounded-xl text-xs font-bold hover:bg-deep-orange transition-colors cursor-pointer shadow-sm active:scale-95"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
