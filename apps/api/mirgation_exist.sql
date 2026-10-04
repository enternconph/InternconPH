-- ============================================================
-- MIGRATION for an EXISTING database (keeps your data)
-- Use schema_updated.sql only for a brand-new, empty database.
--
-- BEFORE RUNNING:  take a full backup (mysqldump).
-- STEP 1: run PART A. Every row must show bad_rows = 0.
--         If not, fix or delete those rows first, or PART B will fail.
-- STEP 2: run PART B.
-- ============================================================

-- ============================================================
-- PART A: pre-flight checks (read-only)
-- ============================================================
SELECT 'organization_staff.user_id -> users' AS problem, COUNT(*) AS bad_rows
  FROM organization_staff t LEFT JOIN users r ON r.user_id = t.user_id WHERE r.user_id IS NULL
UNION ALL SELECT 'organization_staff.organization_id -> hiring_organizations', COUNT(*)
  FROM organization_staff t LEFT JOIN hiring_organizations r ON r.organization_id = t.organization_id WHERE r.organization_id IS NULL
UNION ALL SELECT 'job_postings.mentor_id -> organization_staff', COUNT(*)
  FROM job_postings t LEFT JOIN organization_staff r ON r.org_staff_id = t.mentor_id WHERE t.mentor_id IS NOT NULL AND r.org_staff_id IS NULL
UNION ALL SELECT 'institution_staff.program_id -> programs', COUNT(*)
  FROM institution_staff t LEFT JOIN programs r ON r.program_id = t.program_id WHERE t.program_id IS NOT NULL AND r.program_id IS NULL
UNION ALL SELECT 'institution_job_approvals.job_id -> job_postings', COUNT(*)
  FROM institution_job_approvals t LEFT JOIN job_postings r ON r.job_id = t.job_id WHERE r.job_id IS NULL
UNION ALL SELECT 'institution_job_approvals.institution_id -> institutions', COUNT(*)
  FROM institution_job_approvals t LEFT JOIN institutions r ON r.institution_id = t.institution_id WHERE r.institution_id IS NULL
UNION ALL SELECT 'institution_job_approvals.reviewed_by -> users', COUNT(*)
  FROM institution_job_approvals t LEFT JOIN users r ON r.user_id = t.reviewed_by WHERE t.reviewed_by IS NOT NULL AND r.user_id IS NULL
UNION ALL SELECT 'portfolio_items.associated_org_id -> hiring_organizations', COUNT(*)
  FROM portfolio_items t LEFT JOIN hiring_organizations r ON r.organization_id = t.associated_org_id WHERE t.associated_org_id IS NOT NULL AND r.organization_id IS NULL
UNION ALL SELECT 'portfolio_items.associated_job_id -> job_postings', COUNT(*)
  FROM portfolio_items t LEFT JOIN job_postings r ON r.job_id = t.associated_job_id WHERE t.associated_job_id IS NOT NULL AND r.job_id IS NULL
UNION ALL SELECT 'access_codes.institution_id -> institutions', COUNT(*)
  FROM access_codes t LEFT JOIN institutions r ON r.institution_id = t.institution_id WHERE t.institution_id IS NOT NULL AND r.institution_id IS NULL
UNION ALL SELECT 'access_codes.organization_id -> hiring_organizations', COUNT(*)
  FROM access_codes t LEFT JOIN hiring_organizations r ON r.organization_id = t.organization_id WHERE t.organization_id IS NOT NULL AND r.organization_id IS NULL
UNION ALL SELECT 'access_codes.program_id -> programs', COUNT(*)
  FROM access_codes t LEFT JOIN programs r ON r.program_id = t.program_id WHERE t.program_id IS NOT NULL AND r.program_id IS NULL
UNION ALL SELECT 'access_codes.assigned_staff_id -> institution_staff', COUNT(*)
  FROM access_codes t LEFT JOIN institution_staff r ON r.staff_id = t.assigned_staff_id WHERE t.assigned_staff_id IS NOT NULL AND r.staff_id IS NULL
UNION ALL SELECT 'access_codes.created_by -> users', COUNT(*)
  FROM access_codes t LEFT JOIN users r ON r.user_id = t.created_by WHERE r.user_id IS NULL
UNION ALL SELECT 'access_codes.used_by_user_id -> users', COUNT(*)
  FROM access_codes t LEFT JOIN users r ON r.user_id = t.used_by_user_id WHERE t.used_by_user_id IS NOT NULL AND r.user_id IS NULL
UNION ALL SELECT 'entity_registrations.user_id -> users', COUNT(*)
  FROM entity_registrations t LEFT JOIN users r ON r.user_id = t.user_id WHERE r.user_id IS NULL
UNION ALL SELECT 'entity_registrations.reviewer_user_id -> users', COUNT(*)
  FROM entity_registrations t LEFT JOIN users r ON r.user_id = t.reviewer_user_id WHERE t.reviewer_user_id IS NOT NULL AND r.user_id IS NULL
UNION ALL SELECT 'students whose program belongs to a different institution', COUNT(*)
  FROM students s LEFT JOIN programs p ON p.program_id = s.program_id AND p.institution_id = s.institution_id WHERE p.program_id IS NULL
UNION ALL SELECT 'duplicate student_staff_assignments (student_id, staff_id)', COUNT(*)
  FROM (SELECT student_id, staff_id FROM student_staff_assignments GROUP BY student_id, staff_id HAVING COUNT(*) > 1) d;

-- ============================================================
-- PART B: the migration
-- ============================================================

-- 1. master_programs -> unsigned (so programs.master_program_id can reference it)
ALTER TABLE master_programs MODIFY master_program_id int unsigned NOT NULL AUTO_INCREMENT;

-- 2. programs: link to master list + unique key needed by students' composite FK
ALTER TABLE programs
  ADD COLUMN master_program_id int unsigned DEFAULT NULL AFTER institution_id,
  ADD UNIQUE KEY uq_programs_inst_id (institution_id, program_id),
  ADD KEY idx_programs_master (master_program_id),
  ADD CONSTRAINT fk_programs_master FOREIGN KEY (master_program_id) REFERENCES master_programs (master_program_id) ON DELETE SET NULL;

-- 3. institutions: owner user (for the 'institution' role)
ALTER TABLE institutions
  ADD COLUMN owner_user_id bigint unsigned DEFAULT NULL AFTER status,
  ADD UNIQUE KEY uq_institutions_owner (owner_user_id),
  ADD CONSTRAINT fk_institutions_owner FOREIGN KEY (owner_user_id) REFERENCES users (user_id) ON DELETE SET NULL;

-- 4. institution_staff.program_id
ALTER TABLE institution_staff
  ADD KEY idx_instaff_program (program_id),
  ADD CONSTRAINT fk_instaff_program FOREIGN KEY (program_id) REFERENCES programs (program_id) ON DELETE SET NULL;

-- 5. organization_staff
ALTER TABLE organization_staff
  ADD KEY idx_orgstaff_org (organization_id),
  ADD CONSTRAINT fk_orgstaff_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_orgstaff_org FOREIGN KEY (organization_id) REFERENCES hiring_organizations (organization_id) ON DELETE CASCADE;

-- 6. job_postings.mentor_id
ALTER TABLE job_postings
  ADD KEY idx_jobpost_mentor (mentor_id),
  ADD CONSTRAINT fk_jobpost_mentor FOREIGN KEY (mentor_id) REFERENCES organization_staff (org_staff_id) ON DELETE SET NULL;

-- 7. institution_job_approvals
ALTER TABLE institution_job_approvals
  ADD KEY idx_ija_institution (institution_id),
  ADD KEY idx_ija_reviewer (reviewed_by),
  ADD CONSTRAINT fk_ija_job FOREIGN KEY (job_id) REFERENCES job_postings (job_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_ija_inst FOREIGN KEY (institution_id) REFERENCES institutions (institution_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_ija_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (user_id) ON DELETE SET NULL;

-- 8. students: composite FK (program must belong to the student's institution)
ALTER TABLE students
  ADD KEY idx_students_inst_program (institution_id, program_id),
  ADD CONSTRAINT fk_students_program FOREIGN KEY (institution_id, program_id) REFERENCES programs (institution_id, program_id) ON DELETE RESTRICT;

-- 9. ojt_records: trace placement back to the application
ALTER TABLE ojt_records
  ADD COLUMN application_id bigint unsigned DEFAULT NULL AFTER program_id,
  ADD KEY idx_ojtrec_application (application_id),
  ADD CONSTRAINT fk_ojtrec_app FOREIGN KEY (application_id) REFERENCES job_applications (application_id) ON DELETE SET NULL;

-- 10. ojt_deployment_offers: link accepted offer to the resulting placement
ALTER TABLE ojt_deployment_offers
  ADD COLUMN ojt_id bigint unsigned DEFAULT NULL AFTER job_id,
  ADD KEY idx_deployoffer_ojt (ojt_id),
  ADD CONSTRAINT fk_deployoffer_ojt FOREIGN KEY (ojt_id) REFERENCES ojt_records (ojt_id) ON DELETE SET NULL;

-- 11. portfolio_items
ALTER TABLE portfolio_items
  ADD KEY idx_portitem_org (associated_org_id),
  ADD KEY idx_portitem_job (associated_job_id),
  ADD CONSTRAINT fk_portitem_org FOREIGN KEY (associated_org_id) REFERENCES hiring_organizations (organization_id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_portitem_job FOREIGN KEY (associated_job_id) REFERENCES job_postings (job_id) ON DELETE SET NULL;

-- 12. student_staff_assignments: no duplicate pairs
ALTER TABLE student_staff_assignments
  ADD UNIQUE KEY uq_ssa_student_staff (student_id, staff_id);

-- 13. access_codes
ALTER TABLE access_codes
  ADD KEY idx_ac_institution (institution_id),
  ADD KEY idx_ac_organization (organization_id),
  ADD KEY idx_ac_program (program_id),
  ADD KEY idx_ac_staff (assigned_staff_id),
  ADD KEY idx_ac_creator (created_by),
  ADD KEY idx_ac_usedby (used_by_user_id),
  ADD CONSTRAINT fk_ac_inst FOREIGN KEY (institution_id) REFERENCES institutions (institution_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_ac_org FOREIGN KEY (organization_id) REFERENCES hiring_organizations (organization_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_ac_program FOREIGN KEY (program_id) REFERENCES programs (program_id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_ac_staff FOREIGN KEY (assigned_staff_id) REFERENCES institution_staff (staff_id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_ac_creator FOREIGN KEY (created_by) REFERENCES users (user_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_ac_usedby FOREIGN KEY (used_by_user_id) REFERENCES users (user_id) ON DELETE SET NULL;

-- 14. entity_registrations (entity_id stays polymorphic, so it gets an index but no FK)
ALTER TABLE entity_registrations
  ADD KEY idx_entreg_entity (entity_type, entity_id),
  ADD KEY idx_entreg_user (user_id),
  ADD KEY idx_entreg_reviewer (reviewer_user_id),
  ADD KEY idx_entreg_status (status),
  ADD CONSTRAINT fk_entreg_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_entreg_reviewer FOREIGN KEY (reviewer_user_id) REFERENCES users (user_id) ON DELETE SET NULL;