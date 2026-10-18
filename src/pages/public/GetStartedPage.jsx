import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Layout/Header';
import Footer from '../../components/Layout/Footer';
import PageTransition from '../../components/Layout/PageTransition';

export default function GetStartedPage() {
  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen">
        <Header />

        <main className="flex-grow py-8 sm:py-12 px-4 sm:px-6 md:px-8 max-w-6xl mx-auto flex flex-col justify-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-8 items-stretch">
            {/* STUDENT CARD */}
            <div className="group flex flex-col bg-surface rounded-[28px] border border-outline-variant/80 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1.5 overflow-hidden">
              {/* Top Edge-to-Edge Image */}
              <div className="w-full h-52 sm:h-56 bg-surface-container-low overflow-hidden relative">
                <img
                  src="/photo/stud.jpg"
                  alt="College Student"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    e.target.src = '/photo/StudentReg.jpg';
                  }}
                />
              </div>

              {/* Card Body */}
              <div className="p-6 sm:p-7 flex flex-col flex-grow">
                <span className="text-[11px] font-extrabold tracking-widest text-vibrant-orange uppercase mb-1">
                  Student Portal
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-on-surface mb-3 leading-tight">
                  College Student
                </h2>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-6 flex-grow">
                  Register using your university-issued access code. Apply to verified OJT openings, log attendance, and earn accredited hours.
                </p>

                <div className="mt-auto pt-2">
                  <Link
                    to="/register/student"
                    className="w-full py-3 px-4 bg-vibrant-orange text-white rounded-2xl text-xs sm:text-sm font-bold hover:bg-deep-orange transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-98"
                  >
                    <span>Register with Access Code</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* ORGANIZATION CARD */}
            <div className="group flex flex-col bg-surface rounded-[28px] border border-outline-variant/80 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1.5 overflow-hidden">
              {/* Top Edge-to-Edge Image */}
              <div className="w-full h-52 sm:h-56 bg-surface-container-low overflow-hidden relative">
                <img
                  src="/photo/org.jpg"
                  alt="Hiring Organization"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    e.target.src = '/photo/organization.jpg';
                  }}
                />
              </div>

              {/* Card Body */}
              <div className="p-6 sm:p-7 flex flex-col flex-grow">
                <span className="text-[11px] font-extrabold tracking-widest text-pinoy-green uppercase mb-1">
                  Organization Portal
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-on-surface mb-3 leading-tight">
                  Hiring Organization (HR)
                </h2>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-6 flex-grow">
                  Create your organization main account (SEC/DTI verified), deploy OJT offers to partner institutions, and manage job posts.
                </p>

                <div className="mt-auto pt-2 space-y-2.5">
                  <Link
                    to="/register/organization"
                    className="w-full py-3 px-4 bg-pinoy-green text-white rounded-2xl text-xs sm:text-sm font-bold hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-98"
                  >
                    <span>Create Organization Account</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </Link>

                  <Link
                    to="/register/mentor"
                    className="w-full py-2.5 px-4 bg-surface-container text-pinoy-green border border-pinoy-green/30 hover:bg-pinoy-green/10 rounded-2xl text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">supervised_user_circle</span>
                    <span>Register as Mentor</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* INSTITUTION CARD */}
            <div className="group flex flex-col bg-surface rounded-[28px] border border-outline-variant/80 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1.5 overflow-hidden">
              {/* Top Edge-to-Edge Image */}
              <div className="w-full h-52 sm:h-56 bg-surface-container-low overflow-hidden relative">
                <img
                  src="/photo/school.jpg"
                  alt="Institution Director"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    e.target.src = '/photo/institutionreg.jpg';
                  }}
                />
              </div>

              {/* Card Body */}
              <div className="p-6 sm:p-7 flex flex-col flex-grow">
                <span className="text-[11px] font-extrabold tracking-widest text-vibrant-orange uppercase mb-1">
                  Institution Portal
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-on-surface mb-3 leading-tight">
                  Institution Director
                </h2>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-6 flex-grow">
                  Create the university's main account (CHED/TESDA accredited), manage programs, and issue access codes for coordinators and deans.
                </p>

                <div className="mt-auto pt-2 space-y-2.5">
                  <Link
                    to="/register/institution"
                    className="w-full py-3 px-4 bg-vibrant-orange text-white rounded-2xl text-xs sm:text-sm font-bold hover:bg-deep-orange transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-98"
                  >
                    <span>Create Institution Account</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </Link>

                  <Link
                    to="/register/staff"
                    className="w-full py-2.5 px-4 bg-surface-container text-vibrant-orange border border-vibrant-orange/30 hover:bg-vibrant-orange/10 rounded-2xl text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">badge</span>
                    <span>Register as Staff</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </PageTransition>
  );
}
