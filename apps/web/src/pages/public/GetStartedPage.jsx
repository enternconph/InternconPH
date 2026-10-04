import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import PageTransition from '../../components/Layout/PageTransition';

export default function GetStartedPage() {
  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen bg-surface-container-low text-on-surface transition-colors">
        <Header />

        <main className="flex-grow py-12 px-4 sm:px-6 md:px-8 max-w-6xl mx-auto flex flex-col justify-center w-full">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-on-surface tracking-tight mb-3">
              Create an Account
            </h1>
            <p className="text-sm sm:text-base text-on-surface-variant max-w-lg mx-auto font-medium">
              Select your role to register and access the InternConPH platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            
            {/* STUDENT */}
            <div className="flex flex-col bento-card hover:border-vibrant-orange/50 transition-all rounded-2xl p-6 sm:p-8 shadow-md">
              <div className="w-12 h-12 rounded-xl bg-vibrant-orange/10 text-vibrant-orange flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[28px]">school</span>
              </div>
              <h2 className="text-xl font-extrabold text-on-surface mb-2">College Student</h2>
              <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-8 flex-grow">
                Register using your university-issued access code. Apply to verified OJT openings, log attendance, and earn accredited hours.
              </p>
              <Link
                to="/register/student"
                className="w-full py-3.5 px-4 bg-vibrant-orange hover:bg-deep-orange text-white text-center rounded-xl text-sm font-bold shadow-xs hover:shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Register as Student</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>

            {/* ORGANIZATION */}
            <div className="flex flex-col bento-card hover:border-vibrant-orange/50 transition-all rounded-2xl p-6 sm:p-8 shadow-md">
              <div className="w-12 h-12 rounded-xl bg-vibrant-orange/10 text-vibrant-orange flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[28px]">domain</span>
              </div>
              <h2 className="text-xl font-extrabold text-on-surface mb-2">Hiring Organization</h2>
              <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-8 flex-grow">
                Create your organization account, deploy OJT offers, and manage job posts. Or register as a Mentor under an existing organization.
              </p>
              <div className="space-y-3 mt-auto">
                <Link
                  to="/register/organization"
                  className="block w-full py-3.5 px-4 bg-vibrant-orange hover:bg-deep-orange text-white text-center rounded-xl text-sm font-bold shadow-xs hover:shadow-md transition-all active:scale-95"
                >
                  Create Organization Account
                </Link>
                <Link
                  to="/register/mentor"
                  className="block w-full py-3.5 px-4 bg-surface-container-lowest text-vibrant-orange border border-vibrant-orange text-center rounded-xl text-sm font-bold hover:bg-orange-tint/40 transition-all active:scale-95"
                >
                  Register as Mentor
                </Link>
              </div>
            </div>

            {/* INSTITUTION */}
            <div className="flex flex-col bento-card hover:border-vibrant-orange/50 transition-all rounded-2xl p-6 sm:p-8 shadow-md">
              <div className="w-12 h-12 rounded-xl bg-vibrant-orange/10 text-vibrant-orange flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[28px]">account_balance</span>
              </div>
              <h2 className="text-xl font-extrabold text-on-surface mb-2">Academic Institution</h2>
              <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-8 flex-grow">
                Create the university account, manage programs, and issue access codes. Or register as a Coordinator under an existing institution.
              </p>
              <div className="space-y-3 mt-auto">
                <Link
                  to="/register/institution"
                  className="block w-full py-3.5 px-4 bg-vibrant-orange hover:bg-deep-orange text-white text-center rounded-xl text-sm font-bold shadow-xs hover:shadow-md transition-all active:scale-95"
                >
                  Create Institution Account
                </Link>
                <Link
                  to="/register/staff"
                  className="block w-full py-3.5 px-4 bg-surface-container-lowest text-vibrant-orange border border-vibrant-orange text-center rounded-xl text-sm font-bold hover:bg-orange-tint/40 transition-all active:scale-95"
                >
                  Register as Staff
                </Link>
              </div>
            </div>

          </div>
        </main>

        <Footer />
      </div>
    </PageTransition>
  );
}
