import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import PageTransition from '../../components/Layout/PageTransition';
import { isWeb } from '../../utils/platform';

export default function LandingPage() {
  const [stats] = useState({
    students: 10000,
    jobs: 500,
    organizations: 100,
    institutions: 50
  });

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-surface-container-low text-on-surface transition-colors">
        <Header />

        <main className="flex-grow pt-12 sm:pt-20">
          
          {/* HERO SECTION */}
          <section className="py-16 sm:py-20 px-4 md:px-8 max-w-5xl mx-auto text-center space-y-6 sm:space-y-8">
            <h1 className="text-3xl sm:text-5xl font-extrabold text-on-surface leading-tight tracking-tight">
              Bridge the Gap Between <span className="text-vibrant-orange">Education</span> and <span className="text-vibrant-orange">Industry</span>
            </h1>
            <p className="text-base sm:text-lg text-on-surface-variant max-w-3xl mx-auto font-medium leading-relaxed">
              Modern internships, verified partner employers, automated DTR tracking, and graduate pathways. We help Filipino students connect with real-world careers.
            </p>
            {!isWeb() && (
              <div className="flex justify-center pt-2">
                <Link
                  to="/get-started"
                  className="px-8 py-3.5 bg-vibrant-orange hover:bg-deep-orange text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-95 text-sm sm:text-base inline-flex items-center gap-2"
                >
                  <span>Get Started</span>
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </Link>
              </div>
            )}
          </section>

          {/* STATS SECTION */}
          <section className="py-12 bg-surface-container-lowest border-y border-outline-variant">
            <div className="max-w-5xl mx-auto px-4 md:px-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
                <div>
                  <div className="text-2xl sm:text-4xl font-extrabold text-vibrant-orange">{stats.students.toLocaleString()}+</div>
                  <div className="text-xs sm:text-sm font-semibold text-on-surface-variant mt-1">Student Interns</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-4xl font-extrabold text-vibrant-orange">{stats.organizations.toLocaleString()}+</div>
                  <div className="text-xs sm:text-sm font-semibold text-on-surface-variant mt-1">Partner Companies</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-4xl font-extrabold text-vibrant-orange">{stats.jobs.toLocaleString()}+</div>
                  <div className="text-xs sm:text-sm font-semibold text-on-surface-variant mt-1">OJT Opportunities</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-4xl font-extrabold text-vibrant-orange">{stats.institutions.toLocaleString()}+</div>
                  <div className="text-xs sm:text-sm font-semibold text-on-surface-variant mt-1">Universities</div>
                </div>
              </div>
            </div>
          </section>

          {/* FEATURES SECTION */}
          <section className="py-16 sm:py-20 px-4 md:px-8 max-w-5xl mx-auto space-y-12">
            <div className="text-center space-y-3">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-on-surface tracking-tight">Who is this for?</h2>
              <p className="text-sm sm:text-base text-on-surface-variant font-medium">A unified platform for all internship stakeholders.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              <div className="bento-card hover:border-vibrant-orange/50 transition-all rounded-2xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-vibrant-orange/10 text-vibrant-orange flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[24px]">school</span>
                </div>
                <h3 className="text-lg font-bold text-on-surface">For Students</h3>
                <p className="text-on-surface-variant text-xs sm:text-sm leading-relaxed">
                  Find verified OJT placements, track your rendered hours through our automated DTR, and secure your certificate of completion without the manual paperwork hassle.
                </p>
              </div>

              <div className="bento-card hover:border-vibrant-orange/50 transition-all rounded-2xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-vibrant-orange/10 text-vibrant-orange flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[24px]">domain</span>
                </div>
                <h3 className="text-lg font-bold text-on-surface">For Organizations</h3>
                <p className="text-on-surface-variant text-xs sm:text-sm leading-relaxed">
                  Post internship openings, screen candidates, manage interviews, and evaluate intern performance all in one centralized dashboard.
                </p>
              </div>

              <div className="bento-card hover:border-vibrant-orange/50 transition-all rounded-2xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-vibrant-orange/10 text-vibrant-orange flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[24px]">account_balance</span>
                </div>
                <h3 className="text-lg font-bold text-on-surface">For Institutions</h3>
                <p className="text-on-surface-variant text-xs sm:text-sm leading-relaxed">
                  Monitor your students' OJT progress in real-time, manage MOAs with partner companies, and ensure CHED compliance through our secure monitoring portal.
                </p>
              </div>
            </div>
          </section>

          {/* POLICIES SECTION */}
          <section className="py-16 sm:py-20 bg-surface-container-lowest border-t border-outline-variant px-4 md:px-8">
            <div className="max-w-5xl mx-auto space-y-12 text-center">
              <div className="space-y-3">
                <h2 className="text-2xl sm:text-4xl font-extrabold text-on-surface tracking-tight">Trust & Compliance</h2>
                <p className="text-sm sm:text-base text-on-surface-variant max-w-2xl mx-auto font-medium">
                  InternConPH strictly implements the guidelines of CHED, DOLE, and the NPC to safeguard students, universities, and industry partners.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div className="bento-card rounded-2xl p-6">
                  <h4 className="font-bold text-on-surface mb-2 text-sm sm:text-base">Data Privacy & Security</h4>
                  <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">End-to-end encryption for student records, automated data purging post-graduation, and strict adherence to the Data Privacy Act of 2012.</p>
                </div>
                <div className="bento-card rounded-2xl p-6">
                  <h4 className="font-bold text-on-surface mb-2 text-sm sm:text-base">Verified Partnerships</h4>
                  <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">All Host Training Establishments undergo business permit and SEC verification to ensure student safety against exploitative labor practices.</p>
                </div>
                <div className="bento-card rounded-2xl p-6">
                  <h4 className="font-bold text-on-surface mb-2 text-sm sm:text-base">Automated Audit Trails</h4>
                  <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">Cryptographically audited time-in/out records and mentor evaluations preventing falsification of rendered hours.</p>
                </div>
              </div>
            </div>
          </section>

        </main>
        <Footer />
      </div>
    </PageTransition>
  );
}
