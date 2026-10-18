import React, { useState, useMemo } from 'react';

export const DEMO_PROGRAM_ACCOUNTS = [
  // ─── 1. COMPUTING & TECHNOLOGY ───
  {
    category: 'Computing & Tech',
    code: 'BSIT',
    name: 'Denmark Catolico',
    email: 'student.it@interncon.ph',
    program: 'BS Information Technology',
    institution: 'Notre Dame of Marbel University (NDMU)',
    color: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800/40 dark:text-blue-400',
    icon: 'terminal'
  },
  {
    category: 'Computing & Tech',
    code: 'BSCS',
    name: 'Carlo Miguel Dizon',
    email: 'student.cs@interncon.ph',
    program: 'BS Computer Science',
    institution: 'SEAIT',
    color: 'bg-cyan-500/10 text-cyan-600 border-cyan-200 dark:border-cyan-800/40 dark:text-cyan-400',
    icon: 'code'
  },
  {
    category: 'Computing & Tech',
    code: 'BSCPE',
    name: 'Raphael John Villanueva',
    email: 'student.cpe@interncon.ph',
    program: 'BS Computer Engineering',
    institution: 'University of the Philippines Diliman',
    color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-800/40 dark:text-indigo-400',
    icon: 'memory'
  },
  {
    category: 'Computing & Tech',
    code: 'BSDSA',
    name: 'Patricia Mae Gomez',
    email: 'student.data@interncon.ph',
    program: 'BS Data Science & Analytics',
    institution: 'University of Santo Tomas',
    color: 'bg-sky-500/10 text-sky-600 border-sky-200 dark:border-sky-800/40 dark:text-sky-400',
    icon: 'analytics'
  },
  {
    category: 'Computing & Tech',
    code: 'BSCSB',
    name: 'Christian Paul Cruz',
    email: 'student.cyber@interncon.ph',
    program: 'BS Cybersecurity',
    institution: 'De La Salle University',
    color: 'bg-teal-500/10 text-teal-600 border-teal-200 dark:border-teal-800/40 dark:text-teal-400',
    icon: 'security'
  },

  // ─── 2. BUSINESS & ACCOUNTANCY ───
  {
    category: 'Business & Accountancy',
    code: 'BSA',
    name: 'Alyssa Marie Santos',
    email: 'student.bsa@interncon.ph',
    program: 'BS Accountancy',
    institution: 'De La Salle University',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800/40 dark:text-emerald-400',
    icon: 'account_balance'
  },
  {
    category: 'Business & Accountancy',
    code: 'BSAIS',
    name: 'John Vincent Alcantara',
    email: 'student.ais@interncon.ph',
    program: 'BS Accounting Information Systems',
    institution: 'University of Santo Tomas',
    color: 'bg-green-500/10 text-green-600 border-green-200 dark:border-green-800/40 dark:text-green-400',
    icon: 'receipt_long'
  },
  {
    category: 'Business & Accountancy',
    code: 'BSBA-FM',
    name: 'Bea Bianca Alonzo',
    email: 'student.finance@interncon.ph',
    program: 'BSBA Financial Management',
    institution: 'Ateneo de Manila University',
    color: 'bg-lime-500/10 text-lime-700 border-lime-200 dark:border-lime-800/40 dark:text-lime-400',
    icon: 'payments'
  },
  {
    category: 'Business & Accountancy',
    code: 'BSBA-MM',
    name: 'Gabriel Vance Lim',
    email: 'student.marketing@interncon.ph',
    program: 'BSBA Marketing Management',
    institution: 'Polytechnic University of the Philippines',
    color: 'bg-amber-500/10 text-amber-700 border-amber-200 dark:border-amber-800/40 dark:text-amber-400',
    icon: 'campaign'
  },
  {
    category: 'Business & Accountancy',
    code: 'BSBA-HRM',
    name: 'Camille Joy Flores',
    email: 'student.hr@interncon.ph',
    program: 'BSBA Human Resource Management',
    institution: 'Notre Dame of Marbel University',
    color: 'bg-teal-500/10 text-teal-700 border-teal-200 dark:border-teal-800/40 dark:text-teal-400',
    icon: 'groups'
  },

  // ─── 3. ENGINEERING & ARCHITECTURE ───
  {
    category: 'Engineering & Architecture',
    code: 'BSCE',
    name: 'Joshua Ramos',
    email: 'student.civil@interncon.ph',
    program: 'BS Civil Engineering',
    institution: 'University of the Philippines Diliman',
    color: 'bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800/40 dark:text-orange-400',
    icon: 'architecture'
  },
  {
    category: 'Engineering & Architecture',
    code: 'BSME',
    name: 'Marco Antonio Perez',
    email: 'student.mechanical@interncon.ph',
    program: 'BS Mechanical Engineering',
    institution: 'De La Salle University',
    color: 'bg-zinc-500/10 text-zinc-700 border-zinc-200 dark:border-zinc-700 dark:text-zinc-300',
    icon: 'precision_manufacturing'
  },
  {
    category: 'Engineering & Architecture',
    code: 'BSEE',
    name: 'Angelo Gabriel Reyes',
    email: 'student.electrical@interncon.ph',
    program: 'BS Electrical Engineering',
    institution: 'Technological University of the Philippines',
    color: 'bg-yellow-500/10 text-yellow-700 border-yellow-200 dark:border-yellow-800/40 dark:text-yellow-400',
    icon: 'bolt'
  },
  {
    category: 'Engineering & Architecture',
    code: 'BSARCH',
    name: 'Janine Louise Tolentino',
    email: 'student.architecture@interncon.ph',
    program: 'BS Architecture',
    institution: 'University of Santo Tomas',
    color: 'bg-stone-500/10 text-stone-700 border-stone-200 dark:border-stone-700 dark:text-stone-300',
    icon: 'domain'
  },
  {
    category: 'Engineering & Architecture',
    code: 'BSCHE',
    name: 'Leah Joy Hernandez',
    email: 'student.chemical@interncon.ph',
    program: 'BS Chemical Engineering',
    institution: 'University of the Philippines Diliman',
    color: 'bg-violet-500/10 text-violet-600 border-violet-200 dark:border-violet-800/40 dark:text-violet-400',
    icon: 'science'
  },

  // ─── 4. HEALTH & ALLIED MEDICAL SCIENCES ───
  {
    category: 'Healthcare & Medical',
    code: 'BSN',
    name: 'Angela Nicole Soriano',
    email: 'student.nursing@interncon.ph',
    program: 'BS Nursing',
    institution: 'University of Santo Tomas',
    color: 'bg-rose-500/10 text-rose-600 border-rose-200 dark:border-rose-800/40 dark:text-rose-400',
    icon: 'medical_services'
  },
  {
    category: 'Healthcare & Medical',
    code: 'BSPHARM',
    name: 'Samantha Faith Dela Rosa',
    email: 'student.pharmacy@interncon.ph',
    program: 'BS Pharmacy',
    institution: 'University of San Carlos',
    color: 'bg-pink-500/10 text-pink-600 border-pink-200 dark:border-pink-800/40 dark:text-pink-400',
    icon: 'medication'
  },
  {
    category: 'Healthcare & Medical',
    code: 'BSMLS',
    name: 'Kevin Dave Villanueva',
    email: 'student.medtech@interncon.ph',
    program: 'BS Medical Laboratory Science',
    institution: 'Xavier University - Ateneo de Cagayan',
    color: 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800/40 dark:text-red-400',
    icon: 'biotech'
  },

  // ─── 5. HOSPITALITY & TOURISM ───
  {
    category: 'Hospitality & Tourism',
    code: 'BSHM',
    name: 'Kimberly Anne Bautista',
    email: 'student.hospitality@interncon.ph',
    program: 'BS Hospitality Management',
    institution: 'General Ver Reyes Memorial Colleges (GVCFI)',
    color: 'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800/40 dark:text-purple-400',
    icon: 'hotel'
  },
  {
    category: 'Hospitality & Tourism',
    code: 'BSTM',
    name: 'Francesca Mae Del Rosario',
    email: 'student.tourism@interncon.ph',
    program: 'BS Tourism Management',
    institution: 'Polytechnic University of the Philippines',
    color: 'bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-200 dark:border-fuchsia-800/40 dark:text-fuchsia-400',
    icon: 'flight_takeoff'
  },
  {
    category: 'Hospitality & Tourism',
    code: 'BSCM',
    name: 'Lorenzo Mendoza',
    email: 'student.culinary@interncon.ph',
    program: 'BS Culinary Management',
    institution: 'SEAIT',
    color: 'bg-amber-600/10 text-amber-800 border-amber-300 dark:border-amber-800/40 dark:text-amber-400',
    icon: 'restaurant_menu'
  },

  // ─── 6. EDUCATION & TEACHING ───
  {
    category: 'Education',
    code: 'BSED-ENG',
    name: 'Kristine Joy Ocampo',
    email: 'student.education@interncon.ph',
    program: 'BSED Major in English',
    institution: 'Polytechnic University of the Philippines',
    color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200 dark:border-indigo-800/40 dark:text-indigo-400',
    icon: 'history_edu'
  },
  {
    category: 'Education',
    code: 'BSED-MATH',
    name: 'Renz Marion Estrada',
    email: 'student.math.ed@interncon.ph',
    program: 'BSED Major in Mathematics',
    institution: 'Notre Dame of Marbel University',
    color: 'bg-blue-600/10 text-blue-700 border-blue-200 dark:border-blue-800/40 dark:text-blue-400',
    icon: 'calculate'
  },
  {
    category: 'Education',
    code: 'BEED',
    name: 'Grace Elena Salazar',
    email: 'student.elementary@interncon.ph',
    program: 'Bachelor of Elementary Education',
    institution: 'GVCFI',
    color: 'bg-cyan-600/10 text-cyan-700 border-cyan-200 dark:border-cyan-800/40 dark:text-cyan-400',
    icon: 'school'
  },

  // ─── 7. ARTS, MEDIA & DESIGN ───
  {
    category: 'Arts & Media',
    code: 'BMMA',
    name: 'Dominic Xavier Pascual',
    email: 'student.multimedia@interncon.ph',
    program: 'Bachelor of Multimedia Arts',
    institution: 'De La Salle-College of Saint Benilde',
    color: 'bg-pink-500/10 text-pink-600 border-pink-200 dark:border-pink-800/40 dark:text-pink-400',
    icon: 'palette'
  },
  {
    category: 'Arts & Media',
    code: 'BFA',
    name: 'Clarisse Marie Valenzuela',
    email: 'student.finearts@interncon.ph',
    program: 'Bachelor of Fine Arts',
    institution: 'UP College of Fine Arts',
    color: 'bg-rose-600/10 text-rose-700 border-rose-200 dark:border-rose-800/40 dark:text-rose-400',
    icon: 'brush'
  },

  // ─── 8. CRIMINOLOGY & SOCIAL SCIENCES ───
  {
    category: 'Criminology & Social',
    code: 'BSCRIM',
    name: 'Cadet Rodolfo Macaraeg',
    email: 'student.criminology@interncon.ph',
    program: 'BS Criminology',
    institution: 'Pamantasan ng Lungsod ng Maynila',
    color: 'bg-slate-500/10 text-slate-700 border-slate-300 dark:border-slate-700 dark:text-slate-300',
    icon: 'local_police'
  },
  {
    category: 'Criminology & Social',
    code: 'BSPSY',
    name: 'Hannah Danielle Castillo',
    email: 'student.psychology@interncon.ph',
    program: 'BS Psychology',
    institution: 'Ateneo de Manila University',
    color: 'bg-violet-600/10 text-violet-700 border-violet-200 dark:border-violet-800/40 dark:text-violet-400',
    icon: 'psychology'
  },

  // ─── 9. AGRICULTURE & MARITIME ───
  {
    category: 'Agri & Maritime',
    code: 'BSAGRI',
    name: 'Emilio Jose Laurel',
    email: 'student.agriculture@interncon.ph',
    program: 'BS Agriculture',
    institution: 'Central Luzon State University',
    color: 'bg-emerald-600/10 text-emerald-800 border-emerald-300 dark:border-emerald-800/40 dark:text-emerald-400',
    icon: 'potted_plant'
  },
  {
    category: 'Agri & Maritime',
    code: 'BSMT',
    name: 'Deck Cadet Christian Noel Silva',
    email: 'student.maritime@interncon.ph',
    program: 'BS Marine Transportation',
    institution: 'Technological University of the Philippines',
    color: 'bg-blue-700/10 text-blue-800 border-blue-300 dark:border-blue-800/40 dark:text-blue-300',
    icon: 'directions_boat'
  },

  // ─── 10. SYSTEM & PARTNER ROLES ───
  {
    category: 'Admin & Partners',
    code: 'ADMIN',
    name: 'System Administrator',
    email: 'admin@interncon.ph',
    program: 'Platform Super Admin',
    institution: 'InternCon HQ',
    color: 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800/40 dark:text-red-400',
    icon: 'admin_panel_settings'
  },
  {
    category: 'Admin & Partners',
    code: 'INST-NDMU',
    name: 'NDMU School Coordinator',
    email: 'institution@gmail.com',
    program: 'Partner Higher Education Institution',
    institution: 'Notre Dame of Marbel University',
    color: 'bg-amber-500/10 text-amber-700 border-amber-200 dark:border-amber-800/40 dark:text-amber-400',
    icon: 'apartment'
  },
  {
    category: 'Admin & Partners',
    code: 'INST-SEAIT',
    name: 'SEAIT School Coordinator',
    email: 'seait@gmail.com',
    program: 'Partner Higher Education Institution',
    institution: 'South East Asian Institute of Technology',
    color: 'bg-indigo-500/10 text-indigo-700 border-indigo-200 dark:border-indigo-800/40 dark:text-indigo-400',
    icon: 'corporate_fare'
  },
  {
    category: 'Admin & Partners',
    code: 'EMPLOYER',
    name: 'KCC Mall HR Supervisor',
    email: 'kcc123@gmail.com',
    program: 'Host Training Establishment / Industry Partner',
    institution: 'KCC Malls Inc.',
    color: 'bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:border-emerald-800/40 dark:text-emerald-400',
    icon: 'business_center'
  }
];

export default function DemoAccountsDrawer({ isOpen, onClose, onSelectAccount, loggingInEmail }) {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = useMemo(() => {
    const cats = ['All', ...new Set(DEMO_PROGRAM_ACCOUNTS.map((a) => a.category))];
    return cats;
  }, []);

  const filteredAccounts = useMemo(() => {
    return DEMO_PROGRAM_ACCOUNTS.filter((acc) => {
      const matchCat = selectedCategory === 'All' || acc.category === selectedCategory;
      if (!matchCat) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      return (
        acc.code.toLowerCase().includes(q) ||
        acc.program.toLowerCase().includes(q) ||
        acc.name.toLowerCase().includes(q) ||
        acc.email.toLowerCase().includes(q) ||
        acc.institution.toLowerCase().includes(q)
      );
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-4xl bg-surface rounded-3xl shadow-2xl border border-outline-variant/50 overflow-hidden flex flex-col max-h-[85vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-vibrant-orange/10 text-vibrant-orange flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-[24px]">school</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-on-surface">Demo User Accounts Directory</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-vibrant-orange/10 text-vibrant-orange border border-vibrant-orange/20">
                  {DEMO_PROGRAM_ACCOUNTS.length} Accounts
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Select any verified student profile across diverse CHED college programs or institutional roles
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="p-4 sm:p-6 pb-3 space-y-3 bg-surface-container-lowest/50 border-b border-outline-variant/20">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by course code (e.g. BSIT, BSA, BSN), program title, or student name..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-outline-variant bg-surface text-on-surface text-sm focus:ring-2 focus:ring-vibrant-orange outline-none transition-all placeholder:text-on-surface-variant/60"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">cancel</span>
              </button>
            )}
          </div>

          {/* Category Chips Horizontal Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border ${
                    active
                      ? 'bg-vibrant-orange text-white border-vibrant-orange shadow-sm scale-[1.02]'
                      : 'bg-surface border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Account Cards Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-grow space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredAccounts.map((acc) => {
              const isLoggingIn = loggingInEmail === acc.email;
              return (
                <div
                  key={acc.email}
                  className="group relative p-4 rounded-2xl border border-outline-variant/40 bg-surface hover:bg-surface-container-lowest hover:border-vibrant-orange/40 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${acc.color}`}>
                      <span className="material-symbols-outlined text-[20px]">{acc.icon}</span>
                    </div>

                    <div className="min-w-0 flex-grow">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-black tracking-wider uppercase bg-surface-container-high text-on-surface border border-outline-variant/30">
                          {acc.code}
                        </span>
                        <span className="text-xs font-semibold text-on-surface-variant truncate">
                          {acc.institution.split('(')[0].trim()}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-on-surface mt-1 truncate group-hover:text-vibrant-orange transition-colors">
                        {acc.name}
                      </h3>
                      <p className="text-xs text-on-surface-variant line-clamp-1">
                        {acc.program}
                      </p>
                      <p className="text-[11px] text-on-surface-variant/70 font-mono mt-1 truncate">
                        {acc.email}
                      </p>
                    </div>
                  </div>

                  {/* Quick Action Footer */}
                  <div className="mt-3.5 pt-2.5 border-t border-outline-variant/20 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-on-surface-variant/80 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">key</span>
                      Password123!
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectAccount(acc, false)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                        title="Autofill inputs on login form"
                      >
                        Autofill
                      </button>
                      <button
                        type="button"
                        disabled={isLoggingIn}
                        onClick={() => onSelectAccount(acc, true)}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-vibrant-orange text-white hover:bg-deep-orange transition-all shadow-sm active:scale-95 flex items-center gap-1"
                      >
                        {isLoggingIn ? (
                          <>
                            <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
                            Logging In...
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[14px]">bolt</span>
                            1-Click Login
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredAccounts.length === 0 && (
            <div className="p-8 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2 text-on-surface-variant/40">search_off</span>
              <p className="text-sm font-semibold">No demo accounts found for "{searchQuery}"</p>
              <p className="text-xs mt-1">Try another keyword like BSIT, BSA, Civil, Nursing, or Admin.</p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-outline-variant/30 bg-surface-container-low/60 flex flex-wrap items-center justify-between text-xs text-on-surface-variant gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-vibrant-orange text-[16px]">verified</span>
            <span>All accounts pre-seeded with curriculum skills, portfolios, and verified registrations.</span>
          </div>
          <span className="font-mono text-[11px] bg-surface-container-highest px-2 py-0.5 rounded">
            Default Password: Password123!
          </span>
        </div>
      </div>
    </div>
  );
}
