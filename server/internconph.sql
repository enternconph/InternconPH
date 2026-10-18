-- Table: access_codes
CREATE TABLE `access_codes` (
  `code_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `code_hash` varchar(64) NOT NULL,
  `recipient_type` enum('institution_staff','student','workplace_mentor') NOT NULL,
  `institution_id` bigint unsigned DEFAULT NULL,
  `organization_id` bigint unsigned DEFAULT NULL,
  `program_id` bigint unsigned DEFAULT NULL,
  `assigned_staff_id` bigint unsigned DEFAULT NULL,
  `target_identifier` varchar(100) NOT NULL,
  `intended_position` varchar(50) DEFAULT NULL,
  `intended_classification` varchar(50) DEFAULT NULL,
  `intended_status` varchar(50) DEFAULT NULL,
  `assigned_permissions` json DEFAULT NULL,
  `created_by` bigint unsigned NOT NULL,
  `is_used` tinyint(1) DEFAULT '0',
  `used_by_user_id` bigint unsigned DEFAULT NULL,
  `used_at` datetime DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`code_id`),
  UNIQUE KEY `code_hash` (`code_hash`),
  KEY `idx_ac_lookup` (`code_hash`,`recipient_type`,`is_used`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: audit_logs
CREATE TABLE `audit_logs` (
  `log_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `table_name` varchar(100) NOT NULL,
  `record_id` bigint unsigned DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `idx_auditlog_user` (`user_id`),
  KEY `idx_auditlog_table` (`table_name`),
  CONSTRAINT `fk_auditlog_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: complaint_categories
CREATE TABLE `complaint_categories` (
  `category_id` int unsigned NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `uq_compcat_name` (`category_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: complaint_evidence
CREATE TABLE `complaint_evidence` (
  `evidence_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `complaint_id` bigint unsigned NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`evidence_id`),
  KEY `idx_compevid_complaint` (`complaint_id`),
  CONSTRAINT `fk_compevid_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`complaint_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: complaint_reviews
CREATE TABLE `complaint_reviews` (
  `review_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `complaint_id` bigint unsigned NOT NULL,
  `reviewed_by` bigint unsigned NOT NULL,
  `reviewer_role` enum('institution','admin') NOT NULL,
  `findings` text,
  `recommendation` text,
  `action_taken` varchar(255) DEFAULT NULL,
  `reviewed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`review_id`),
  KEY `idx_compreview_complaint` (`complaint_id`),
  KEY `fk_compreview_reviewer` (`reviewed_by`),
  CONSTRAINT `fk_compreview_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`complaint_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_compreview_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: complaints
CREATE TABLE `complaints` (
  `complaint_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `category_id` int unsigned NOT NULL,
  `job_id` bigint unsigned DEFAULT NULL,
  `application_id` bigint unsigned DEFAULT NULL,
  `subject` varchar(200) NOT NULL,
  `description` text NOT NULL,
  `status` enum('submitted','institution_review','admin_review','resolved','dismissed') NOT NULL DEFAULT 'submitted',
  `filed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`complaint_id`),
  KEY `idx_complaints_student` (`student_id`),
  KEY `idx_complaints_org` (`organization_id`),
  KEY `idx_complaints_status` (`status`),
  KEY `fk_complaints_category` (`category_id`),
  KEY `fk_complaints_job` (`job_id`),
  KEY `fk_complaints_application` (`application_id`),
  CONSTRAINT `fk_complaints_application` FOREIGN KEY (`application_id`) REFERENCES `job_applications` (`application_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_complaints_category` FOREIGN KEY (`category_id`) REFERENCES `complaint_categories` (`category_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_complaints_job` FOREIGN KEY (`job_id`) REFERENCES `job_postings` (`job_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_complaints_org` FOREIGN KEY (`organization_id`) REFERENCES `hiring_organizations` (`organization_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_complaints_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: entity_registrations
CREATE TABLE `entity_registrations` (
  `registration_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `entity_type` enum('institution','hiring_organization','institution_staff','student','workplace_mentor') NOT NULL,
  `entity_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `status` enum('pending','verified','rejected') DEFAULT 'pending',
  `reviewer_user_id` bigint unsigned DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `rejection_reason` text,
  `submitted_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`registration_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: hiring_organizations
CREATE TABLE `hiring_organizations` (
  `organization_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_name` varchar(200) NOT NULL,
  `business_structure` varchar(50) NOT NULL DEFAULT 'corporation',
  `industry` varchar(150) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `sec_dti_number` varchar(100) DEFAULT NULL,
  `bir_tin` varchar(100) DEFAULT NULL,
  `mayors_permit_number` varchar(100) DEFAULT NULL,
  `contact_email` varchar(150) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `status` enum('pending','active','warned','suspended','deactivated') NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`organization_id`),
  KEY `idx_hiringorg_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: institution_documents
CREATE TABLE `institution_documents` (
  `document_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `institution_id` bigint unsigned NOT NULL,
  `document_type` enum('accreditation_certificate','business_permit','moa','other') NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `verified` tinyint(1) NOT NULL DEFAULT '0',
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`document_id`),
  KEY `idx_instdoc_institution` (`institution_id`),
  CONSTRAINT `fk_instdoc_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`institution_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: institution_job_approvals
CREATE TABLE `institution_job_approvals` (
  `approval_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_id` bigint unsigned NOT NULL,
  `institution_id` bigint unsigned NOT NULL,
  `approval_status` enum('pending','approved','rejected') DEFAULT 'pending',
  `reviewed_by` bigint unsigned DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `rejection_reason` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`approval_id`),
  UNIQUE KEY `uq_job_inst_app` (`job_id`,`institution_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: institution_registrations
CREATE TABLE `institution_registrations` (
  `registration_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `institution_id` bigint unsigned NOT NULL,
  `submitted_by` bigint unsigned NOT NULL,
  `status` enum('pending','under_review','approved','rejected') NOT NULL DEFAULT 'pending',
  `reviewed_by` bigint unsigned DEFAULT NULL,
  `review_notes` text,
  `submitted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`registration_id`),
  KEY `idx_instreg_institution` (`institution_id`),
  KEY `idx_instreg_status` (`status`),
  KEY `fk_instreg_submitter` (`submitted_by`),
  KEY `fk_instreg_reviewer` (`reviewed_by`),
  CONSTRAINT `fk_instreg_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`institution_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_instreg_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_instreg_submitter` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: institution_staff
CREATE TABLE `institution_staff` (
  `staff_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `institution_id` bigint unsigned NOT NULL,
  `program_id` bigint unsigned DEFAULT NULL,
  `position` varchar(50) NOT NULL DEFAULT 'ojt_supervisor',
  `employee_id` varchar(30) DEFAULT NULL,
  `staff_number` varchar(50) DEFAULT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `contact_number` varchar(50) DEFAULT NULL,
  `permissions` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_verified` tinyint(1) DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`staff_id`),
  UNIQUE KEY `uq_instaff_user` (`user_id`),
  KEY `idx_instaff_institution` (`institution_id`),
  CONSTRAINT `fk_instaff_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`institution_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_instaff_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: institutions
CREATE TABLE `institutions` (
  `institution_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `institution_name` varchar(200) NOT NULL,
  `institution_code` varchar(30) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `postal_code` varchar(10) DEFAULT NULL,
  `contact_email` varchar(150) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `status` enum('pending','active','suspended','deactivated') NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`institution_id`),
  UNIQUE KEY `uq_institutions_code` (`institution_code`),
  KEY `idx_institutions_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: interviews
CREATE TABLE `interviews` (
  `interview_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `application_id` bigint unsigned NOT NULL,
  `schedule_at` datetime NOT NULL,
  `mode` enum('onsite','online','phone') NOT NULL DEFAULT 'onsite',
  `location_or_link` varchar(255) DEFAULT NULL,
  `status` enum('scheduled','completed','cancelled','no_show') NOT NULL DEFAULT 'scheduled',
  `notes` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`interview_id`),
  KEY `idx_interview_app` (`application_id`),
  CONSTRAINT `fk_interview_app` FOREIGN KEY (`application_id`) REFERENCES `job_applications` (`application_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: job_applications
CREATE TABLE `job_applications` (
  `application_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_id` bigint unsigned NOT NULL,
  `student_id` bigint unsigned NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'submitted',
  `accepted_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `applied_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`application_id`),
  UNIQUE KEY `uq_jobapp` (`job_id`,`student_id`),
  KEY `idx_jobapp_student` (`student_id`),
  KEY `idx_jobapp_status` (`status`),
  CONSTRAINT `fk_jobapp_job` FOREIGN KEY (`job_id`) REFERENCES `job_postings` (`job_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_jobapp_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: job_offers
CREATE TABLE `job_offers` (
  `offer_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `application_id` bigint unsigned NOT NULL,
  `status` enum('offered','accepted','declined','withdrawn') NOT NULL DEFAULT 'offered',
  `offered_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `responded_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`offer_id`),
  UNIQUE KEY `uq_joboffer_app` (`application_id`),
  CONSTRAINT `fk_joboffer_app` FOREIGN KEY (`application_id`) REFERENCES `job_applications` (`application_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: job_posting_reviews
CREATE TABLE `job_posting_reviews` (
  `review_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_id` bigint unsigned NOT NULL,
  `reviewed_by` bigint unsigned NOT NULL,
  `status` enum('approved','rejected') NOT NULL,
  `notes` text,
  `reviewed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`review_id`),
  KEY `idx_jobreview_job` (`job_id`),
  KEY `fk_jobreview_reviewer` (`reviewed_by`),
  CONSTRAINT `fk_jobreview_job` FOREIGN KEY (`job_id`) REFERENCES `job_postings` (`job_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_jobreview_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: job_postings
CREATE TABLE `job_postings` (
  `job_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `mentor_id` bigint unsigned DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `description` text NOT NULL,
  `requirements` text,
  `deliverables` text,
  `posting_type` varchar(50) NOT NULL DEFAULT 'ojt',
  `job_type` varchar(50) NOT NULL DEFAULT 'ojt',
  `location` varchar(255) DEFAULT NULL,
  `workplace_area` varchar(150) DEFAULT NULL,
  `finish_time` varchar(100) DEFAULT NULL,
  `on_call_days` int unsigned DEFAULT NULL,
  `salary_rate` decimal(10,2) DEFAULT NULL,
  `salary_rate_type` varchar(50) DEFAULT 'daily',
  `target_audience` varchar(50) DEFAULT 'ojt_students',
  `work_setup` varchar(50) NOT NULL DEFAULT 'onsite',
  `slots_available` int unsigned NOT NULL DEFAULT '1',
  `status` enum('draft','pending_review','active','closed','rejected') NOT NULL DEFAULT 'draft',
  `posted_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`job_id`),
  KEY `idx_jobpost_org` (`organization_id`),
  KEY `idx_jobpost_status` (`status`),
  CONSTRAINT `fk_jobpost_org` FOREIGN KEY (`organization_id`) REFERENCES `hiring_organizations` (`organization_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: job_required_programs
CREATE TABLE `job_required_programs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_id` bigint unsigned NOT NULL,
  `program_id` bigint unsigned NOT NULL,
  `is_mandatory` tinyint(1) DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_jobreqprog` (`job_id`,`program_id`),
  KEY `fk_jobreqprog_program` (`program_id`),
  CONSTRAINT `fk_jobreqprog_job` FOREIGN KEY (`job_id`) REFERENCES `job_postings` (`job_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_jobreqprog_program` FOREIGN KEY (`program_id`) REFERENCES `programs` (`program_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: job_required_skills
CREATE TABLE `job_required_skills` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `job_id` bigint unsigned NOT NULL,
  `skill_id` int unsigned NOT NULL,
  `importance` enum('required','preferred') NOT NULL DEFAULT 'required',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_jobreqskill` (`job_id`,`skill_id`),
  KEY `fk_jobreqskill_skill` (`skill_id`),
  CONSTRAINT `fk_jobreqskill_job` FOREIGN KEY (`job_id`) REFERENCES `job_postings` (`job_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_jobreqskill_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`skill_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: master_programs
CREATE TABLE `master_programs` (
  `master_program_id` int NOT NULL AUTO_INCREMENT,
  `program_name` varchar(150) NOT NULL,
  `program_code` varchar(30) NOT NULL,
  `discipline` varchar(100) NOT NULL,
  `default_ojt_hours` int unsigned NOT NULL DEFAULT '486',
  `description` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`master_program_id`),
  UNIQUE KEY `uq_master_prog` (`program_name`,`program_code`)
) ENGINE=InnoDB AUTO_INCREMENT=258 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: notifications
CREATE TABLE `notifications` (
  `notification_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `title` varchar(150) NOT NULL,
  `message` text NOT NULL,
  `type` enum('registration','verification','ojt','job','complaint','system','other') NOT NULL DEFAULT 'other',
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`),
  KEY `idx_notif_user` (`user_id`),
  KEY `idx_notif_isread` (`is_read`),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: ojt_deployment_offers
CREATE TABLE `ojt_deployment_offers` (
  `offer_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `job_id` bigint unsigned DEFAULT NULL,
  `status` enum('offered','accepted','declined','withdrawn') NOT NULL DEFAULT 'offered',
  `offered_by` bigint unsigned NOT NULL,
  `offered_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `responded_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`offer_id`),
  KEY `idx_deployoffer_student` (`student_id`),
  KEY `idx_deployoffer_org` (`organization_id`),
  KEY `fk_deployoffer_job` (`job_id`),
  KEY `fk_deployoffer_offeredby` (`offered_by`),
  CONSTRAINT `fk_deployoffer_job` FOREIGN KEY (`job_id`) REFERENCES `job_postings` (`job_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_deployoffer_offeredby` FOREIGN KEY (`offered_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_deployoffer_org` FOREIGN KEY (`organization_id`) REFERENCES `hiring_organizations` (`organization_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_deployoffer_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: ojt_performance_records
CREATE TABLE `ojt_performance_records` (
  `record_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ojt_id` bigint unsigned NOT NULL,
  `evaluator_id` bigint unsigned NOT NULL,
  `evaluation_period` enum('midterm','final') NOT NULL,
  `rating` decimal(3,2) NOT NULL,
  `comments` text,
  `evaluated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`record_id`),
  UNIQUE KEY `uq_ojtperf` (`ojt_id`,`evaluation_period`),
  KEY `fk_ojtperf_evaluator` (`evaluator_id`),
  CONSTRAINT `fk_ojtperf_evaluator` FOREIGN KEY (`evaluator_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ojtperf_ojt` FOREIGN KEY (`ojt_id`) REFERENCES `ojt_records` (`ojt_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: ojt_records
CREATE TABLE `ojt_records` (
  `ojt_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `program_id` bigint unsigned DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `required_hours` int unsigned NOT NULL DEFAULT '0',
  `rendered_hours` int unsigned NOT NULL DEFAULT '0',
  `status` enum('ongoing','completed','terminated','withdrawn') NOT NULL DEFAULT 'ongoing',
  `supervisor_name` varchar(150) DEFAULT NULL,
  `supervisor_contact` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`ojt_id`),
  KEY `idx_ojtrec_student` (`student_id`),
  KEY `idx_ojtrec_org` (`organization_id`),
  KEY `idx_ojtrec_status` (`status`),
  KEY `fk_ojtrec_program` (`program_id`),
  CONSTRAINT `fk_ojtrec_org` FOREIGN KEY (`organization_id`) REFERENCES `hiring_organizations` (`organization_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ojtrec_program` FOREIGN KEY (`program_id`) REFERENCES `programs` (`program_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ojtrec_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: ojt_requirements
CREATE TABLE `ojt_requirements` (
  `requirement_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `institution_id` bigint unsigned DEFAULT NULL,
  `requirement_name` varchar(150) NOT NULL,
  `description` text,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`requirement_id`),
  KEY `idx_ojtreq_institution` (`institution_id`),
  CONSTRAINT `fk_ojtreq_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`institution_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: ojt_student_requirements
CREATE TABLE `ojt_student_requirements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ojt_id` bigint unsigned NOT NULL,
  `requirement_id` bigint unsigned NOT NULL,
  `status` enum('pending','submitted','approved','rejected') NOT NULL DEFAULT 'pending',
  `file_path` varchar(500) DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ojtstudreq` (`ojt_id`,`requirement_id`),
  KEY `fk_ojtstudreq_req` (`requirement_id`),
  CONSTRAINT `fk_ojtstudreq_ojt` FOREIGN KEY (`ojt_id`) REFERENCES `ojt_records` (`ojt_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ojtstudreq_req` FOREIGN KEY (`requirement_id`) REFERENCES `ojt_requirements` (`requirement_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: organization_documents
CREATE TABLE `organization_documents` (
  `document_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `document_type` varchar(100) NOT NULL,
  `document_name` varchar(255) DEFAULT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `verified` tinyint(1) NOT NULL DEFAULT '0',
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`document_id`),
  KEY `idx_orgdoc_org` (`organization_id`),
  CONSTRAINT `fk_orgdoc_org` FOREIGN KEY (`organization_id`) REFERENCES `hiring_organizations` (`organization_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: organization_registrations
CREATE TABLE `organization_registrations` (
  `registration_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `submitted_by` bigint unsigned NOT NULL,
  `status` enum('pending','under_review','approved','rejected') NOT NULL DEFAULT 'pending',
  `reviewed_by` bigint unsigned DEFAULT NULL,
  `review_notes` text,
  `submitted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`registration_id`),
  KEY `idx_orgreg_org` (`organization_id`),
  KEY `idx_orgreg_status` (`status`),
  KEY `fk_orgreg_submitter` (`submitted_by`),
  KEY `fk_orgreg_reviewer` (`reviewed_by`),
  CONSTRAINT `fk_orgreg_org` FOREIGN KEY (`organization_id`) REFERENCES `hiring_organizations` (`organization_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_orgreg_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_orgreg_submitter` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: organization_staff
CREATE TABLE `organization_staff` (
  `org_staff_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `organization_id` bigint unsigned NOT NULL,
  `staff_number` varchar(50) DEFAULT NULL,
  `title` varchar(20) DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `suffix` varchar(20) DEFAULT NULL,
  `position` varchar(50) NOT NULL DEFAULT 'workplace_mentor',
  `job_title` varchar(100) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `work_location` varchar(100) DEFAULT NULL,
  `years_of_experience` int unsigned DEFAULT '1',
  `contact_number` varchar(50) DEFAULT NULL,
  `passcode_used` varchar(64) DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT '0',
  `rejection_reason` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`org_staff_id`),
  UNIQUE KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: organization_status_history
CREATE TABLE `organization_status_history` (
  `history_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `old_status` varchar(30) DEFAULT NULL,
  `new_status` varchar(30) NOT NULL,
  `changed_by` bigint unsigned NOT NULL,
  `reason` text,
  `changed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`history_id`),
  KEY `idx_orgstatushist_org` (`organization_id`),
  KEY `fk_orgstatushist_changer` (`changed_by`),
  CONSTRAINT `fk_orgstatushist_changer` FOREIGN KEY (`changed_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_orgstatushist_org` FOREIGN KEY (`organization_id`) REFERENCES `hiring_organizations` (`organization_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: organization_suspensions
CREATE TABLE `organization_suspensions` (
  `suspension_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `complaint_id` bigint unsigned DEFAULT NULL,
  `issued_by` bigint unsigned NOT NULL,
  `reason` text NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`suspension_id`),
  KEY `idx_orgsusp_org` (`organization_id`),
  KEY `fk_orgsusp_issuer` (`issued_by`),
  KEY `fk_orgsusp_complaint` (`complaint_id`),
  CONSTRAINT `fk_orgsusp_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`complaint_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_orgsusp_issuer` FOREIGN KEY (`issued_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_orgsusp_org` FOREIGN KEY (`organization_id`) REFERENCES `hiring_organizations` (`organization_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: organization_warnings
CREATE TABLE `organization_warnings` (
  `warning_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint unsigned NOT NULL,
  `complaint_id` bigint unsigned DEFAULT NULL,
  `issued_by` bigint unsigned NOT NULL,
  `reason` text NOT NULL,
  `issued_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`warning_id`),
  KEY `idx_orgwarn_org` (`organization_id`),
  KEY `fk_orgwarn_issuer` (`issued_by`),
  KEY `fk_orgwarn_complaint` (`complaint_id`),
  CONSTRAINT `fk_orgwarn_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`complaint_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_orgwarn_issuer` FOREIGN KEY (`issued_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_orgwarn_org` FOREIGN KEY (`organization_id`) REFERENCES `hiring_organizations` (`organization_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: portfolio_items
CREATE TABLE `portfolio_items` (
  `item_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `portfolio_id` bigint unsigned NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text,
  `file_path` varchar(500) DEFAULT NULL,
  `item_type` enum('project','certificate','sample_work','other') NOT NULL DEFAULT 'other',
  `is_verified` tinyint(1) DEFAULT '0',
  `associated_org_id` bigint unsigned DEFAULT NULL,
  `associated_job_id` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`item_id`),
  KEY `idx_portitem_portfolio` (`portfolio_id`),
  CONSTRAINT `fk_portitem_portfolio` FOREIGN KEY (`portfolio_id`) REFERENCES `student_portfolios` (`portfolio_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: programs
CREATE TABLE `programs` (
  `program_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `institution_id` bigint unsigned NOT NULL,
  `program_name` varchar(150) NOT NULL,
  `program_code` varchar(30) NOT NULL,
  `department` varchar(150) DEFAULT NULL,
  `required_ojt_hours` int unsigned NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`program_id`),
  UNIQUE KEY `uq_programs_inst_code` (`institution_id`,`program_code`),
  KEY `idx_programs_institution` (`institution_id`),
  CONSTRAINT `fk_programs_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`institution_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: roles
CREATE TABLE `roles` (
  `role_id` int unsigned NOT NULL AUTO_INCREMENT,
  `role_name` enum('system_admin','institution','institution_staff','student','hiring_organization') NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `uq_roles_name` (`role_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: skill_categories
CREATE TABLE `skill_categories` (
  `category_id` int unsigned NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `uq_skillcat_name` (`category_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: skill_demand_statistics
CREATE TABLE `skill_demand_statistics` (
  `stat_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `skill_id` int unsigned NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `demand_count` int unsigned NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`stat_id`),
  UNIQUE KEY `uq_skilldemand` (`skill_id`,`period_start`,`period_end`),
  CONSTRAINT `fk_skilldemand_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`skill_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: skills
CREATE TABLE `skills` (
  `skill_id` int unsigned NOT NULL AUTO_INCREMENT,
  `skill_name` varchar(100) NOT NULL,
  `category_id` int unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`skill_id`),
  UNIQUE KEY `uq_skills_name` (`skill_name`),
  KEY `idx_skills_category` (`category_id`),
  CONSTRAINT `fk_skills_category` FOREIGN KEY (`category_id`) REFERENCES `skill_categories` (`category_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: student_achievements
CREATE TABLE `student_achievements` (
  `achievement_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text,
  `date_achieved` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`achievement_id`),
  KEY `idx_studach_student` (`student_id`),
  CONSTRAINT `fk_studach_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: student_categories
CREATE TABLE `student_categories` (
  `category_id` int unsigned NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `uq_studcat_name` (`category_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `student_categories` (`category_id`, `category_name`, `description`) VALUES
(1, 'Regular Student', 'Standard regular student undergoing OJT'),
(2, 'Returnee (Requires Registrar Verification)', 'Returning student requiring registrar verification'),
(3, 'Transferee (Requires Registrar Verification)', 'Transferee student requiring registrar verification')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);


-- Table: student_documents
CREATE TABLE `student_documents` (
  `document_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `document_type` enum('resume','cor','good_moral','medical_certificate','waiver','other') NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `verified` tinyint(1) NOT NULL DEFAULT '0',
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`document_id`),
  KEY `idx_studdoc_student` (`student_id`),
  CONSTRAINT `fk_studdoc_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: student_portfolios
CREATE TABLE `student_portfolios` (
  `portfolio_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `title` varchar(200) DEFAULT NULL,
  `summary` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`portfolio_id`),
  UNIQUE KEY `uq_portfolio_student` (`student_id`),
  CONSTRAINT `fk_portfolio_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: student_registrations
CREATE TABLE `student_registrations` (
  `registration_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `status` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  `verified_by` bigint unsigned DEFAULT NULL,
  `verification_notes` text,
  `submitted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `verified_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`registration_id`),
  KEY `idx_studreg_student` (`student_id`),
  KEY `idx_studreg_status` (`status`),
  KEY `fk_studreg_verifier` (`verified_by`),
  CONSTRAINT `fk_studreg_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_studreg_verifier` FOREIGN KEY (`verified_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: student_resumes
CREATE TABLE `student_resumes` (
  `resume_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `version` int unsigned NOT NULL DEFAULT '1',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`resume_id`),
  KEY `idx_resume_student` (`student_id`),
  CONSTRAINT `fk_resume_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: student_skill_recommendations
CREATE TABLE `student_skill_recommendations` (
  `recommendation_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `skill_id` int unsigned NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `score` decimal(5,2) DEFAULT NULL,
  `generated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`recommendation_id`),
  KEY `idx_studskillrec_student` (`student_id`),
  KEY `idx_studskillrec_skill` (`skill_id`),
  CONSTRAINT `fk_studskillrec_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`skill_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_studskillrec_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: student_skills
CREATE TABLE `student_skills` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `skill_id` int unsigned NOT NULL,
  `proficiency_level` enum('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_studskill` (`student_id`,`skill_id`),
  KEY `idx_studskill_skill` (`skill_id`),
  CONSTRAINT `fk_studskill_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`skill_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_studskill_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: student_staff_assignments
CREATE TABLE `student_staff_assignments` (
  `assignment_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `student_id` bigint unsigned NOT NULL,
  `staff_id` bigint unsigned NOT NULL,
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`assignment_id`),
  KEY `idx_ssa_student` (`student_id`),
  KEY `idx_ssa_staff` (`staff_id`),
  CONSTRAINT `fk_ssa_staff` FOREIGN KEY (`staff_id`) REFERENCES `institution_staff` (`staff_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ssa_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: student_statuses
CREATE TABLE `student_statuses` (
  `status_id` int unsigned NOT NULL AUTO_INCREMENT,
  `status_name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`status_id`),
  UNIQUE KEY `uq_studstatus_name` (`status_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `student_statuses` (`status_id`, `status_name`, `description`) VALUES
(1, 'pending', 'Pending Verification / Approval'),
(2, 'active', 'Active Enrolled Student'),
(3, 'ongoing_ojt', 'Ongoing OJT Placement'),
(4, 'completed_ojt', 'Completed OJT Requirements'),
(5, 'graduated', 'Graduated Student')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);


-- Table: students
CREATE TABLE `students` (
  `student_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `institution_id` bigint unsigned NOT NULL,
  `program_id` bigint unsigned NOT NULL,
  `student_number` varchar(50) NOT NULL,
  `category_id` int unsigned NOT NULL,
  `classification` varchar(50) NOT NULL DEFAULT 'regular',
  `ojt_status` varchar(50) NOT NULL DEFAULT 'starting_ojt',
  `passcode_used` varchar(64) DEFAULT NULL,
  `status_id` int unsigned NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `birthdate` date DEFAULT NULL,
  `gender` enum('male','female','other','prefer_not_to_say') DEFAULT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `year_level` tinyint unsigned DEFAULT NULL,
  `required_ojt_hours` int unsigned NOT NULL DEFAULT '0',
  `completed_ojt_hours` int unsigned NOT NULL DEFAULT '0',
  `is_verified` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`student_id`),
  UNIQUE KEY `uq_students_user` (`user_id`),
  UNIQUE KEY `uq_students_inst_number` (`institution_id`,`student_number`),
  KEY `idx_students_program` (`program_id`),
  KEY `idx_students_category` (`category_id`),
  KEY `idx_students_status` (`status_id`),
  CONSTRAINT `fk_students_category` FOREIGN KEY (`category_id`) REFERENCES `student_categories` (`category_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_students_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`institution_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_students_program` FOREIGN KEY (`program_id`) REFERENCES `programs` (`program_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_students_status` FOREIGN KEY (`status_id`) REFERENCES `student_statuses` (`status_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_students_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: system_settings
CREATE TABLE `system_settings` (
  `setting_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text,
  `description` varchar(255) DEFAULT NULL,
  `updated_by` bigint unsigned DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_id`),
  UNIQUE KEY `uq_sysset_key` (`setting_key`),
  KEY `fk_sysset_updater` (`updated_by`),
  CONSTRAINT `fk_sysset_updater` FOREIGN KEY (`updated_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: users
CREATE TABLE `users` (
  `user_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `role_id` int unsigned NOT NULL,
  `email` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_verified` tinyint(1) NOT NULL DEFAULT '0',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role` (`role_id`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Table: user_sessions
CREATE TABLE `user_sessions` (
  `session_id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `session_token_hash` varchar(64) NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_activity_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime NOT NULL,
  `absolute_expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `revoked_reason` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`session_id`),
  UNIQUE KEY `uq_sessions_token_hash` (`session_token_hash`),
  KEY `idx_session_hash_status` (`session_token_hash`,`revoked_at`,`expires_at`),
  KEY `idx_session_user` (`user_id`),
  KEY `idx_session_last_act` (`last_activity_at`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


