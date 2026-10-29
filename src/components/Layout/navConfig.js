/**
 * Single source of truth for dashboard navigation.
 *
 * Consumed by:
 *  - Sidebar          (all sections, grouped)
 *  - MobileBottomBar  (items flagged `primary`, max 4, + "More" drawer)
 *  - DashboardHeader  (current page title / breadcrumb)
 *
 * The role/position rules below mirror the previous inline logic in Sidebar.jsx exactly;
 * only the structure moved. Routes and permissions are unchanged.
 */

const item = (to, icon, label, opts = {}) => ({ to, icon, label, ...opts });

const STUDENT = [
  {
    title: 'Main',
    items: [item('/dashboard/student', 'dashboard', 'Dashboard', { end: true, primary: true, short: 'Home' })],
  },
  {
    title: 'Opportunities & OJT',
    items: [
      item('/dashboard/student/jobs', 'dynamic_feed', 'Browse Jobs & Feed', { primary: true, short: 'Jobs' }),
      item('/dashboard/student/applications', 'send', 'My Applications'),
      item('/dashboard/student/ojt', 'timelapse', 'OJT Progress & DTR', { primary: true, short: 'OJT' }),
    ],
  },
  {
    title: 'Skills & Career',
    items: [
      item('/dashboard/student/skills', 'psychology', 'Skills & Matches'),
      item('/dashboard/student/portfolio', 'folder_special', 'Career Portfolio', { primary: true, short: 'Portfolio' }),
    ],
  },
  {
    title: 'Account & Support',
    items: [
      item('/dashboard/student/complaints', 'gavel', 'Grievances & Reports'),
      item('/dashboard/student/profile', 'person', 'My Profile'),
    ],
  },
];

const MENTOR = [
  {
    title: 'Overview',
    items: [item('/dashboard/organization', 'dashboard', 'Mentor Dashboard', { end: true, primary: true, short: 'Home' })],
  },
  {
    title: 'Supervision',
    items: [
      item('/dashboard/organization/ojt', 'badge', 'Deployed Interns & DTR', { primary: true, short: 'Interns' }),
      item('/dashboard/organization/evaluations', 'rate_review', 'Student Evaluations', { primary: true, short: 'Evaluate' }),
      item('/dashboard/organization/grievances', 'report_problem', 'Grievance & Incident Reports', { primary: true, short: 'Reports' }),
    ],
  },
];

const HR = [
  {
    title: 'Overview',
    items: [item('/dashboard/organization', 'dashboard', 'Employer Dashboard', { end: true, primary: true, short: 'Home' })],
  },
  {
    title: 'Recruitment Pipeline',
    items: [
      item('/dashboard/organization/jobs', 'post_add', 'Job Postings', { primary: true, short: 'Jobs' }),
      item('/dashboard/organization/applicants', 'group', 'Applicants & Talent', { primary: true, short: 'Applicants' }),
      item('/dashboard/organization/interviews', 'event_available', 'Interviews'),
      item('/dashboard/organization/offers', 'assignment_turned_in', 'Offers & Deployments'),
    ],
  },
  {
    title: 'Interns & Mentorship',
    items: [
      item('/dashboard/organization/ojt', 'badge', 'Deployed Interns & DTR', { primary: true, short: 'Interns' }),
      item('/dashboard/organization/scanner', 'qr_code_scanner', 'HR Desk Scanner', { externalTab: true }),
      item('/dashboard/organization/evaluations', 'rate_review', 'Evaluations'),
      item('/dashboard/organization/grievances', 'report_problem', 'Grievance & Incidents'),
      item('/dashboard/organization/mentors', 'supervisor_account', 'Workplace Mentors'),
    ],
  },
];

const INSTITUTION = [
  {
    title: 'Overview',
    items: [item('/dashboard/institution', 'dashboard', 'OJT Head Overview', { end: true, primary: true, short: 'Home' })],
  },
  {
    title: 'Students & OJT',
    items: [
      item('/dashboard/institution/students', 'verified_user', 'Student Verification & Clearance', { primary: true, short: 'Students' }),
      item('/dashboard/institution/monitoring', 'monitoring', 'OJT Monitoring & DTR', { primary: true, short: 'Monitor' }),
      item('/dashboard/institution/ojt-offers', 'work_outline', 'Dispatched OJT Offers', { primary: true, short: 'Offers' }),
    ],
  },
  {
    title: 'Academic Operations',
    items: [
      item('/dashboard/institution/staff', 'badge', 'OJT Coordinators & Staff'),
      item('/dashboard/institution/programs', 'menu_book', 'Degree Programs'),
      item('/dashboard/institution/requirements', 'assignment_late', 'Clearance Requirements'),
    ],
  },
];

const ADMIN = [
  {
    title: 'System',
    items: [item('/dashboard/admin', 'admin_panel_settings', 'System Overview', { end: true, primary: true, short: 'Home' })],
  },
  {
    title: 'Platform Entities',
    items: [
      item('/dashboard/admin/institutions', 'school', 'Institutions', { primary: true, short: 'Schools' }),
      item('/dashboard/admin/organizations', 'business', 'Organizations', { primary: true, short: 'Orgs' }),
      item('/dashboard/admin/jobs', 'work', 'Job Moderation'),
      item('/dashboard/admin/users', 'manage_accounts', 'User Accounts', { primary: true, short: 'Users' }),
    ],
  },
  {
    title: 'Governance & Intelligence',
    items: [
      item('/dashboard/admin/complaints', 'gavel', 'Grievance Oversight'),
      item('/dashboard/admin/analytics', 'trending_up', 'Skill Analytics'),
      item('/dashboard/admin/audit-logs', 'receipt_long', 'Audit Trail'),
    ],
  },
];

function institutionStaffSections() {
  return [
    {
      title: 'Overview',
      items: [item('/dashboard/institution', 'dashboard', 'Coordinator Overview', { end: true, primary: true, short: 'Home' })],
    },
    {
      title: 'Academic & OJT Operations',
      items: [
        item('/dashboard/institution/students', 'verified_user', 'Student Verification & Clearance', { primary: true, short: 'Students' }),
        item('/dashboard/institution/monitoring', 'monitoring', 'OJT Monitoring & DTR', { primary: true, short: 'Monitor' }),
        item('/dashboard/institution/ojt-offers', 'work_outline', 'Dispatched OJT Offers', { primary: true, short: 'Offers' }),
        item('/dashboard/institution/programs', 'menu_book', 'Degree Programs'),
        item('/dashboard/institution/requirements', 'assignment_late', 'Clearance Requirements'),
      ],
    },
  ];
}

/** Grouped navigation for a given role/position. */
export function getNavSections(role, position) {
  switch (role) {
    case 'student':
      return STUDENT;
    case 'workplace_mentor':
    case 'mentor':
      return MENTOR;
    case 'hiring_organization':
    case 'hr_staff':
      return HR;
    case 'institution':
      return INSTITUTION;
    case 'institution_staff':
      return institutionStaffSections(position);
    case 'system_admin':
      return ADMIN;
    default:
      return [];
  }
}

/** Flat list of every nav item for the role. */
export function getNavItems(role, position) {
  return getNavSections(role, position).flatMap((section) => section.items);
}

/** Up to 4 items for the mobile bottom bar (the rest live behind "More"). */
export function getPrimaryNavItems(role, position, max = 4) {
  const all = getNavItems(role, position);
  const primary = all.filter((entry) => entry.primary);
  return (primary.length ? primary : all).slice(0, max);
}

/** Finds the nav item (and its section) matching the current pathname. Longest match wins. */
export function findActiveNav(role, position, pathname) {
  const sections = getNavSections(role, position);
  let best = null;

  sections.forEach((section) => {
    section.items.forEach((entry) => {
      const isMatch = entry.end
        ? pathname === entry.to || pathname === `${entry.to}/`
        : pathname === entry.to || pathname.startsWith(`${entry.to}/`);

      if (isMatch && (!best || entry.to.length > best.item.to.length)) {
        best = { section: section.title, item: entry };
      }
    });
  });

  if (!best && pathname.includes('/settings')) {
    return { section: 'Account', item: item('/dashboard/settings', 'settings', 'Settings & Profile') };
  }

  return best;
}

/** Friendly label for the role/position shown under the brand. */
export function getRoleLabel(role, position) {
  if (position) return position.replace(/_/g, ' ');
  if (role === 'institution') return 'Institution Director';
  if (role === 'hiring_organization') return 'HR Administrator';
  if (role === 'system_admin') return 'System Administrator';
  if (role === 'workplace_mentor' || role === 'mentor') return 'Workplace Mentor';
  return (role || '').replace(/_/g, ' ');
}
