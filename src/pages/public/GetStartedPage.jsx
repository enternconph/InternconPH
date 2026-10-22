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

        <main className="flex-grow py-4 sm:py-6 lg:py-8 px-4 sm:px-6 max-w-5xl mx-auto flex flex-col justify-center my-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-4 sm:mb-6 items-stretch w-full">
            {/* STUDENT CARD */}
            <div className="group flex flex-col bg-surface rounded-2xl sm:rounded-3xl border border-outline-variant/80 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1.5 overflow-hidden">
              {/* Top Edge-to-Edge Image */}
              <div className="w-full h-36 sm:h-40 md:h-44 bg-surface-container-low overflow-hidden relative">
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
              <div className="p-4 sm:p-5 flex flex-col flex-grow">
                <span className="text-[10px] font-extrabold tracking-widest text-vibrant-orange uppercase mb-1">
                  Student Portal
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-on-surface mb-2 leading-tight">
                  College Student
                </h2>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-4 flex-grow">
                  Register using your university-issued access code. Apply to verified OJT openings, log attendance, and earn accredited hours.
                </p>

                <div className="mt-auto pt-1">
                  <Link
                    to="/register/student"
                    className="w-full py-2.5 px-3 bg-vibrant-orange text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-deep-orange transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-98"
                  >
                    <span>Register with Access Code</span>
                    <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* ORGANIZATION CARD */}
            <div className="group flex flex-col bg-surface rounded-2xl sm:rounded-3xl border border-outline-variant/80 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1.5 overflow-hidden">
              {/* Top Edge-to-Edge Image */}
              <div className="w-full h-36 sm:h-40 md:h-44 bg-surface-container-low overflow-hidden relative">
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
              <div className="p-4 sm:p-5 flex flex-col flex-grow">
                <span className="text-[10px] font-extrabold tracking-widest text-pinoy-green uppercase mb-1">
                  Organization Portal
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-on-surface mb-2 leading-tight">
                  Hiring Organization (HR)
                </h2>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-4 flex-grow">
                  Create your organization main account (SEC/DTI verified), deploy OJT offers to partner institutions, and manage job posts.
                </p>

                <div className="mt-auto pt-1 space-y-2">
                  <Link
                    to="/register/organization"
                    className="w-full py-2.5 px-3 bg-pinoy-green text-white rounded-xl text-xs sm:text-sm font-bold hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-98"
                  >
                    <span>Create Organization Account</span>
                    <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
                  </Link>

                  <Link
                    to="/register/mentor"
                    className="w-full py-2 px-3 bg-surface-container text-pinoy-green border border-pinoy-green/30 hover:bg-pinoy-green/10 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[17px]">supervised_user_circle</span>
                    <span>Register as Mentor</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* INSTITUTION CARD */}
            <div className="group flex flex-col bg-surface rounded-2xl sm:rounded-3xl border border-outline-variant/80 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1.5 overflow-hidden">
              {/* Top Edge-to-Edge Image */}
              <div className="w-full h-36 sm:h-40 md:h-44 bg-surface-container-low overflow-hidden relative">
                <img
                  src="/photo/school.jpg"
                  alt="Institution OJT Head"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    e.target.src = '/photo/institutionreg.jpg';
                  }}
                />
              </div>

              {/* Card Body */}
              <div className="p-4 sm:p-5 flex flex-col flex-grow">
                <span className="text-[10px] font-extrabold tracking-widest text-vibrant-orange uppercase mb-1">
                  Institution Portal
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-on-surface mb-2 leading-tight">
                  Institution OJT Head
                </h2>
                <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed mb-4 flex-grow">
                  Create the university's main account (CHED/TESDA accredited), manage programs, and issue passcodes for OJT coordinators.
                </p>

                <div className="mt-auto pt-1 space-y-2">
                  <Link
                    to="/register/institution"
                    className="w-full py-2.5 px-3 bg-vibrant-orange text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-deep-orange transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-98"
                  >
                    <span>Create Institution Account</span>
                    <span className="material-symbols-outlined text-[17px]">arrow_forward</span>
                  </Link>

                  <Link
                    to="/register/staff"
                    className="w-full py-2 px-3 bg-surface-container text-vibrant-orange border border-vibrant-orange/30 hover:bg-vibrant-orange/10 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[17px]">badge</span>
                    <span>Register as OJT Coordinator</span>
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
