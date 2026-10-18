/**
 * Skill Synergy & Match Explanation Engine
 * Dynamically computes how any recommended skill pairs with, complements,
 * or builds upon the student's verified skills from "My Verified Skills".
 */

// Bidirectional or paired skill synergies across disciplines
const SYNERGY_PAIRS = [
  // ─── Healthcare & Clinical Nursing (BSN) ───────────────────────────
  {
    skills: ['patient care & assessment', 'patient care', 'clinical assessment', 'patient care & clinical assessment'],
    pairsWith: ['basic life support (bls / cpr)', 'bls', 'cpr', 'basic life support'],
    reason: 'provides immediate emergency resuscitation and life-support algorithms required during bedside patient care'
  },
  {
    skills: ['patient care & assessment', 'patient care', 'clinical assessment', 'patient care & clinical assessment'],
    pairsWith: ['clinical documentation & ehr', 'clinical documentation & ehr systems', 'electronic health records (ehr)', 'medical records'],
    reason: 'ensures patient vitals, care plans, and clinical observations are accurately and legally recorded in hospital EHR systems'
  },
  {
    skills: ['patient care & assessment', 'patient care', 'clinical assessment'],
    pairsWith: ['pharmacology & medication administration', 'pharmacology & safe medication administration', 'pharmacology'],
    reason: 'ensures prescribed medications are safely calculated and administered according to patient condition'
  },
  {
    skills: ['patient care & assessment', 'patient care', 'clinical assessment'],
    pairsWith: ['infection control & prevention', 'infection control & sterile techniques', 'infection control'],
    reason: 'maintains sterile techniques and aseptic environments to prevent hospital-acquired infections'
  },
  {
    skills: ['basic life support (bls / cpr)', 'bls', 'cpr', 'basic life support'],
    pairsWith: ['clinical documentation & ehr', 'clinical documentation & ehr systems'],
    reason: 'documents precise CPR cycles, defibrillation timestamps, and post-resuscitation patient vital responses'
  },
  {
    skills: ['basic life support (bls / cpr)', 'bls', 'cpr'],
    pairsWith: ['vital signs monitoring', 'vital signs'],
    reason: 'monitors blood pressure, pulse, and oxygen saturation before and after emergency interventions'
  },
  {
    skills: ['pharmacology & medication administration', 'pharmacology'],
    pairsWith: ['clinical documentation & ehr', 'clinical documentation & ehr systems'],
    reason: 'ensures the 10 rights of medication administration and dosages are logged in electronic charts'
  },

  // ─── Information Technology & Software (BSIT / BSCS / BSIS) ────────
  {
    skills: ['javascript', 'js'],
    pairsWith: ['react.js', 'react'],
    reason: 'provides the reactive component framework to build modern, interactive web interfaces'
  },
  {
    skills: ['javascript', 'js', 'react.js', 'react'],
    pairsWith: ['node.js', 'node'],
    reason: 'extends your frontend JavaScript skills to backend servers and full-stack REST API development'
  },
  {
    skills: ['javascript', 'react.js', 'react'],
    pairsWith: ['typescript', 'ts'],
    reason: 'adds static type-safety, preventing runtime bugs in enterprise-scale codebases'
  },
  {
    skills: ['html/css', 'html', 'css'],
    pairsWith: ['tailwind css', 'tailwind'],
    reason: 'accelerates responsive UI development using modern utility-first CSS classes'
  },
  {
    skills: ['html/css', 'javascript', 'react.js'],
    pairsWith: ['ui/ux design', 'figma'],
    reason: 'translates design wireframes and component design tokens into production-ready web interfaces'
  },
  {
    skills: ['python'],
    pairsWith: ['sql', 'database design'],
    reason: 'enables end-to-end data extraction, database queries, and pipeline automation'
  },
  {
    skills: ['python'],
    pairsWith: ['data analysis', 'pandas', 'machine learning'],
    reason: 'powers statistical modeling, exploratory data analysis, and predictive AI workflows'
  },
  {
    skills: ['sql'],
    pairsWith: ['database design', 'database administration'],
    reason: 'connects relational query writing with optimal table normalization and schema indexing'
  },
  {
    skills: ['sql', 'database design'],
    pairsWith: ['restful api development', 'api development'],
    reason: 'structures backend database queries and models to serve clean JSON API endpoints'
  },
  {
    skills: ['git/version control', 'git'],
    pairsWith: ['docker', 'ci/cd pipeline automation'],
    reason: 'automates testing, container packaging, and deployment from code repository commits'
  },

  // ─── Accountancy & Finance (BSA / BSBA) ─────────────────────────────
  {
    skills: ['financial accounting', 'accounting', 'bookkeeping'],
    pairsWith: ['quickbooks', 'quickbooks online'],
    reason: 'applies fundamental accounting debit/credit standards into the most widely used SME cloud accounting software'
  },
  {
    skills: ['financial accounting', 'accounting'],
    pairsWith: ['xero accounting', 'xero'],
    reason: 'expands your software capability to international and remote accounting firms'
  },
  {
    skills: ['financial accounting', 'accounting'],
    pairsWith: ['taxation & tax compliance', 'taxation', 'bir tax compliance'],
    reason: 'ensures financial statements and journal entries strictly adhere to BIR withholding and VAT rules'
  },
  {
    skills: ['financial accounting', 'accounting'],
    pairsWith: ['excel/spreadsheets', 'excel', 'financial modeling'],
    reason: 'enables advanced workbook financial modeling, pivot table analysis, and budget forecasting'
  },
  {
    skills: ['quickbooks', 'xero accounting'],
    pairsWith: ['auditing & assurance', 'internal audit'],
    reason: 'verifies transactional integrity and reconciles ledger balances against bank statements'
  },

  // ─── Engineering & Architecture (BSCE / BSEE / BSCpE) ──────────────
  {
    skills: ['autocad', 'autocad drafting'],
    pairsWith: ['bim / revit architecture', 'revit'],
    reason: 'elevates 2D architectural CAD drawings into 3D parametric Building Information Modeling'
  },
  {
    skills: ['autocad', 'bim / revit architecture'],
    pairsWith: ['structural analysis & design', 'structural analysis & design (staad/etabs)'],
    reason: 'allows structural calculations and load stress simulations directly from CAD geometry'
  },
  {
    skills: ['autocad'],
    pairsWith: ['construction management & costing', 'quantity surveying'],
    reason: 'translates technical drawings into accurate bills of materials, cost estimates, and schedules'
  },

  // ─── Hospitality & Tourism (BSHM / BSTM) ───────────────────────────
  {
    skills: ['food & beverage service', 'f&b service'],
    pairsWith: ['haccp & food safety', 'haccp & food safety protocols', 'food safety'],
    reason: 'ensures banquet and restaurant table operations maintain international sanitary compliance'
  },
  {
    skills: ['front office operations (opera pms)', 'front office'],
    pairsWith: ['customer service', 'customer relationship management'],
    reason: 'combines technical property management software proficiency with high-touch guest relations'
  },
  {
    skills: ['tourism tour guiding & itinerary planning', 'tour guiding'],
    pairsWith: ['amadeus / sabre gds flight booking', 'amadeus', 'gds booking'],
    reason: 'delivers full-service tour operations from itinerary design to international airline reservations'
  },

  // ─── Psychology & Human Resources (BSPSY / HR) ──────────────────────
  {
    skills: ['psychological assessment & testing', 'psychological assessment'],
    pairsWith: ['talent acquisition & recruitment', 'recruitment'],
    reason: 'applies psychometric evaluation and behavioral screening to select qualified job candidates'
  },
  {
    skills: ['talent acquisition & recruitment'],
    pairsWith: ['employee relations & labor code', 'labor code'],
    reason: 'ensures onboarding and employment contracts strictly comply with DOLE labor regulations'
  }
];

function normalizeSkill(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Find direct synergy rule between target skill and student's verified skills
 */
function findSynergyRule(recName, verifiedSkills) {
  const normRec = normalizeSkill(recName);

  for (const item of verifiedSkills) {
    const normVer = normalizeSkill(item.skill_name || item.name);

    for (const rule of SYNERGY_PAIRS) {
      const matchRecA = rule.skills.some(s => normRec.includes(normalizeSkill(s)) || normalizeSkill(s).includes(normRec));
      const matchVerA = rule.pairsWith.some(p => normVer.includes(normalizeSkill(p)) || normalizeSkill(p).includes(normVer));

      if (matchRecA && matchVerA) {
        return {
          verifiedSkillName: item.skill_name || item.name,
          reason: rule.reason
        };
      }

      const matchRecB = rule.pairsWith.some(p => normRec.includes(normalizeSkill(p)) || normalizeSkill(p).includes(normRec));
      const matchVerB = rule.skills.some(s => normVer.includes(normalizeSkill(s)) || normalizeSkill(s).includes(normVer));

      if (matchRecB && matchVerB) {
        return {
          verifiedSkillName: item.skill_name || item.name,
          reason: rule.reason
        };
      }
    }
  }

  return null;
}

/**
 * Returns an accurate, conversational match explanation connecting the
 * recommended skill to the student's actual verified skills.
 *
 * @param {Object} rec The recommended skill object
 * @param {Array} studentSkills Array of verified skill objects from data.studentSkills
 * @param {Object} program Student academic program info
 * @returns {Object} { matchedSkillNames, badgeLabel, explanation }
 */
export function getSkillMatchExplanation(rec, studentSkills = [], program = null) {
  const verifiedList = Array.isArray(studentSkills) ? studentSkills : [];
  const recName = (rec.skill_name || '').trim();
  const recCat = (rec.category_name || '').trim().toLowerCase();
  const progCode = program?.program_code || program?.program_name || 'your program';

  // 1. If student has NO verified skills in their profile yet
  if (verifiedList.length === 0) {
    return {
      matchedSkillNames: [],
      badgeLabel: 'Foundational Competency',
      explanation: `You haven't added any skills to My Verified Skills yet. Adding ${recName} establishes your foundational profile and unlocks automated synergy matching for ${progCode} OJT roles.`
    };
  }

  // 2. Direct synergy source match from backend if it matches a verified skill
  if (rec.synergy_source) {
    const directMatch = verifiedList.find(
      s => (s.skill_name || '').toLowerCase().trim() === rec.synergy_source.toLowerCase().trim()
    );
    if (directMatch) {
      let detail = rec.reason || '';
      const parenMatch = detail.match(/\(([^)]+)\)/);
      if (parenMatch) {
        detail = parenMatch[1];
      } else {
        detail = detail.replace(/^[^:]+:\s*/, '');
      }

      return {
        matchedSkillNames: [directMatch.skill_name],
        badgeLabel: 'Direct Skill Synergy',
        explanation: `Directly pairs with your verified skill "${directMatch.skill_name}"${detail ? ` (${detail})` : ''}. Together, they reinforce your practical competency for OJT placements.`
      };
    }
  }

  // 3. Look up knowledge graph companion rules
  const synergyRule = findSynergyRule(recName, verifiedList);
  if (synergyRule) {
    return {
      matchedSkillNames: [synergyRule.verifiedSkillName],
      badgeLabel: 'Skill Pair Synergy',
      explanation: `Matches your verified skill "${synergyRule.verifiedSkillName}" — ${synergyRule.reason}. Having both competencies gives you a distinct advantage in internship evaluations.`
    };
  }

  // 4. Same Category / Professional Domain Match with verified skills
  const sameCategorySkills = verifiedList.filter(s => {
    const sCat = (s.category_name || '').toLowerCase().trim();
    return sCat && (sCat === recCat || sCat.includes(recCat) || recCat.includes(sCat));
  });

  if (sameCategorySkills.length > 0) {
    const names = sameCategorySkills.slice(0, 2).map(s => `"${s.skill_name}"`).join(' and ');
    return {
      matchedSkillNames: sameCategorySkills.slice(0, 2).map(s => s.skill_name),
      badgeLabel: 'Domain Synergy',
      explanation: `Complements your verified ${names} by broadening your specialized ${rec.category_name || 'practice'} toolkit, rounding out the core practical abilities expected during internships.`
    };
  }

  // 5. Cross-Skill Curriculum Integration Match
  const topVerified = verifiedList.slice(0, 2).map(s => `"${s.skill_name}"`).join(' and ');
  return {
    matchedSkillNames: verifiedList.slice(0, 2).map(s => s.skill_name),
    badgeLabel: 'Profile Match',
    explanation: `Builds on your verified ${topVerified} to meet key professional benchmarks in ${progCode}, bridging your current skills with industry workplace expectations.`
  };
}

export default getSkillMatchExplanation;
