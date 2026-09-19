-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Sep 11, 2026 at 04:19 PM
-- Server version: 8.4.3
-- PHP Version: 8.4.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `interncon_ph`
--

-- --------------------------------------------------------

--
-- Table structure for table `access_codes`
--

CREATE TABLE `access_codes` (
  `code_id` bigint UNSIGNED NOT NULL,
  `code_hash` varchar(64) NOT NULL,
  `recipient_type` enum('institution_staff','student','workplace_mentor') NOT NULL,
  `institution_id` bigint UNSIGNED DEFAULT NULL,
  `organization_id` bigint UNSIGNED DEFAULT NULL,
  `program_id` bigint UNSIGNED DEFAULT NULL,
  `target_identifier` varchar(100) NOT NULL,
  `intended_position` varchar(50) DEFAULT NULL,
  `intended_department` varchar(100) DEFAULT NULL,
  `intended_classification` varchar(50) DEFAULT NULL,
  `intended_status` varchar(50) DEFAULT NULL,
  `intended_email` varchar(150) DEFAULT NULL,
  `assigned_permissions` json DEFAULT NULL,
  `created_by` bigint UNSIGNED NOT NULL,
  `is_used` tinyint(1) DEFAULT '0',
  `used_by_user_id` bigint UNSIGNED DEFAULT NULL,
  `used_at` datetime DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `access_codes`
--

INSERT INTO `access_codes` (`code_id`, `code_hash`, `recipient_type`, `institution_id`, `organization_id`, `program_id`, `target_identifier`, `intended_position`, `intended_department`, `intended_classification`, `intended_status`, `intended_email`, `assigned_permissions`, `created_by`, `is_used`, `used_by_user_id`, `used_at`, `expires_at`, `created_at`) VALUES
(15, 'INST-DEN-2MM64', 'institution_staff', 4, NULL, 23, 'STF-01-DEAN', 'dean', NULL, NULL, NULL, 'dean@ndmu.edu.ph', '{\"can_verify_students\": true, \"can_handle_grievances\": true, \"can_approve_job_offers\": true, \"can_manage_ojt_records\": true}', 21, 1, 22, '2026-09-06 03:14:28', '2026-09-20 03:11:15', '2026-09-06 03:11:15'),
(16, 'INST-STU-6S9PB', 'student', 4, NULL, 37, 'STU-UNAUTH-7835', NULL, 'Education & Teacher Training', 'regular', 'starting_ojt', NULL, NULL, 23, 0, NULL, NULL, '2026-09-20 03:29:27', '2026-09-06 03:29:27'),
(19, 'INST-STU-LVQ4F', 'student', 4, NULL, 23, 'STU-01', NULL, 'Information Technology & Computing', 'regular', 'starting_ojt', NULL, NULL, 22, 1, 27, '2026-09-06 03:38:06', '2026-09-20 03:32:36', '2026-09-06 03:32:36'),
(20, 'INST-STU-8D4T1', 'student', 4, NULL, 23, 'STU-02', NULL, 'Information Technology & Computing', 'regular', 'starting_ojt', NULL, NULL, 22, 1, 28, '2026-09-06 03:39:06', '2026-09-20 03:32:50', '2026-09-06 03:32:50'),
(21, 'INST-STU-ISE9X', 'student', 4, NULL, 23, 'STU-03', NULL, 'Information Technology & Computing', 'regular', 'starting_ojt', NULL, NULL, 22, 1, 29, '2026-09-06 03:40:10', '2026-09-20 03:32:55', '2026-09-06 03:32:55'),
(22, 'INST-STU-TGXIO', 'student', 4, NULL, 23, 'STU-04', NULL, 'Information Technology & Computing', 'regular', 'starting_ojt', NULL, NULL, 22, 1, 30, '2026-09-06 03:40:59', '2026-09-20 03:33:01', '2026-09-06 03:33:01'),
(23, 'INST-STU-D1EBQ', 'student', 4, NULL, 23, 'STU-05', NULL, 'Information Technology & Computing', 'regular', 'starting_ojt', NULL, NULL, 22, 1, 31, '2026-09-06 03:41:47', '2026-09-20 03:33:07', '2026-09-06 03:33:07'),
(24, 'INST-STU-GJAMC', 'student', 4, NULL, 23, 'STU-06', NULL, 'Information Technology & Computing', 'regular', 'starting_ojt', NULL, NULL, 22, 1, 32, '2026-09-06 03:43:11', '2026-09-20 03:33:17', '2026-09-06 03:33:17'),
(25, 'INST-STU-9HQDL', 'student', 4, NULL, 23, 'STU-07', NULL, 'Information Technology & Computing', 'regular', 'starting_ojt', NULL, NULL, 22, 1, 33, '2026-09-06 03:44:42', '2026-09-20 03:33:24', '2026-09-06 03:33:24'),
(26, 'INST-STU-LOQER', 'student', 4, NULL, 23, 'STU-08', NULL, 'Information Technology & Computing', 'regular', 'starting_ojt', NULL, NULL, 22, 1, 40, '2026-09-06 03:59:50', '2026-09-20 03:33:30', '2026-09-06 03:33:30'),
(27, 'INST-STU-0ZLRM', 'student', 4, NULL, 23, 'STU-09', NULL, 'Information Technology & Computing', 'regular', 'starting_ojt', NULL, NULL, 22, 1, 44, '2026-09-06 05:13:29', '2026-09-20 03:33:37', '2026-09-06 03:33:37'),
(28, 'INST-STU-TND6G', 'student', 4, NULL, 23, 'STU-10', NULL, 'Information Technology & Computing', 'regular', 'starting_ojt', NULL, NULL, 22, 1, NULL, '2026-09-11 19:41:53', '2026-09-20 03:33:42', '2026-09-06 03:33:42'),
(29, 'INST-REG-FZ1E2', 'institution_staff', 4, NULL, 23, 'STF-02', 'registrar', NULL, NULL, NULL, 'registrar@ndmu.edu.ph', '{\"can_verify_students\": true, \"can_handle_grievances\": false, \"can_approve_job_offers\": false, \"can_manage_ojt_records\": false}', 22, 1, 35, '2026-09-06 03:53:10', '2026-09-20 03:48:34', '2026-09-06 03:48:34'),
(32, 'WM-SSK03', 'workplace_mentor', NULL, 6, NULL, 'EMP-01', 'workplace_mentor', 'BS Accounting Information Systems', NULL, NULL, NULL, NULL, 46, 0, NULL, NULL, '2026-09-20 13:27:55', '2026-09-06 13:27:55'),
(33, 'WM-7PAEN', 'workplace_mentor', NULL, 6, NULL, 'EMP-02', 'workplace_mentor', 'BS Business Administration - Business Economics', NULL, NULL, NULL, NULL, 46, 0, NULL, NULL, '2026-09-20 13:28:44', '2026-09-06 13:28:44'),
(34, 'WM-I5S0J', 'workplace_mentor', NULL, 6, NULL, 'EMP-03', 'workplace_mentor', 'BS Information Technology', NULL, NULL, NULL, NULL, 46, 1, 55, '2026-09-06 14:07:50', '2026-09-20 13:29:04', '2026-09-06 13:29:04'),
(44, 'INST-BSIT-DTOQ', 'student', 4, NULL, 23, 'BSIT', NULL, 'Information Technology & Computing', 'regular', 'starting_ojt', NULL, NULL, 22, 0, NULL, NULL, '2026-09-18 15:59:59', '2026-09-11 19:42:54'),
(45, 'INST-BSCS-VVCZ', 'student', 5, NULL, 54, 'BSCS', NULL, 'College of Computer Studies', 'regular', 'starting_ojt', NULL, NULL, 58, 0, NULL, NULL, '2026-10-11 11:50:40', '2026-09-11 19:50:40');

-- --------------------------------------------------------

--
-- Table structure for table `accident_reports`
--

CREATE TABLE `accident_reports` (
  `accident_id` bigint UNSIGNED NOT NULL,
  `complaint_id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `student_id` bigint UNSIGNED NOT NULL,
  `incident_datetime` datetime NOT NULL,
  `location` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `severity` enum('minor','moderate','severe','critical','fatal') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'moderate',
  `injury_description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `medical_attention_given` text COLLATE utf8mb4_unicode_ci,
  `witnesses` text COLLATE utf8mb4_unicode_ci,
  `immediate_action_taken` text COLLATE utf8mb4_unicode_ci,
  `preventive_measures` text COLLATE utf8mb4_unicode_ci,
  `reported_by` bigint UNSIGNED NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `accident_reports`
--

INSERT INTO `accident_reports` (`accident_id`, `complaint_id`, `organization_id`, `student_id`, `incident_datetime`, `location`, `severity`, `injury_description`, `medical_attention_given`, `witnesses`, `immediate_action_taken`, `preventive_measures`, `reported_by`, `created_at`, `updated_at`) VALUES
(8, 19, 6, 19, '2026-09-09 17:34:00', 'death has come for him', 'fatal', 'Na buak ang ulo', 'Medical attention was required', 'satanas kay bad person sya', 'Gin dala sa hospital gamit tractor', 'GI first air, gin CPR ang ulo', 55, '2026-09-11 20:05:37', '2026-09-11 20:05:37');

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `log_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `table_name` varchar(100) NOT NULL,
  `record_id` bigint UNSIGNED DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`log_id`, `user_id`, `action`, `table_name`, `record_id`, `old_values`, `new_values`, `ip_address`, `created_at`) VALUES
(1, 27, 'complaint_filed', 'complaints', 2, NULL, NULL, NULL, '2026-09-06 15:13:07'),
(2, 44, 'complaint_filed', 'complaints', 3, NULL, NULL, NULL, '2026-09-06 15:20:12'),
(3, 1, 'complaint_resolved', 'complaints', 1, NULL, NULL, NULL, '2026-09-06 15:23:57'),
(4, 1, 'complaint_resolved', 'complaints', 3, NULL, NULL, NULL, '2026-09-06 15:24:37'),
(5, 44, 'complaint_filed', 'complaints', 4, NULL, NULL, NULL, '2026-09-06 16:30:57'),
(6, 1, 'complaint_resolved', 'complaints', 4, NULL, NULL, NULL, '2026-09-06 16:31:50'),
(7, 46, 'org_complaint_filed', 'complaints', 6, NULL, NULL, NULL, '2026-09-06 18:35:53'),
(8, 55, 'org_complaint_filed', 'complaints', 7, NULL, NULL, NULL, '2026-09-06 18:37:48'),
(9, 45, 'org_complaint_filed', 'complaints', 12, NULL, NULL, NULL, '2026-09-11 20:04:56'),
(10, 45, 'org_complaint_filed', 'complaints', 13, NULL, NULL, NULL, '2026-09-11 20:04:56'),
(11, 45, 'org_complaint_filed', 'complaints', 14, NULL, NULL, NULL, '2026-09-11 20:04:56'),
(12, 45, 'org_complaint_filed', 'complaints', 15, NULL, NULL, NULL, '2026-09-11 20:04:56'),
(13, 45, 'org_complaint_filed', 'complaints', 16, NULL, NULL, NULL, '2026-09-11 20:04:56'),
(14, 45, 'org_complaint_filed', 'complaints', 17, NULL, NULL, NULL, '2026-09-11 20:04:56'),
(15, 45, 'org_complaint_filed', 'complaints', 18, NULL, NULL, NULL, '2026-09-11 20:04:56'),
(16, 55, 'org_complaint_filed', 'complaints', 19, NULL, NULL, NULL, '2026-09-11 20:05:37'),
(17, 55, 'org_complaint_filed', 'complaints', 20, NULL, NULL, NULL, '2026-09-11 20:06:54'),
(18, 44, 'complaint_filed', 'complaints', 21, NULL, NULL, NULL, '2026-09-11 20:17:25');

-- --------------------------------------------------------

--
-- Table structure for table `complaints`
--

CREATE TABLE `complaints` (
  `complaint_id` bigint UNSIGNED NOT NULL,
  `student_id` bigint UNSIGNED NOT NULL,
  `complainant_type` enum('student','organization') DEFAULT 'student',
  `student_status` enum('ojt','graduated') DEFAULT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `category_id` int UNSIGNED NOT NULL,
  `job_id` bigint UNSIGNED DEFAULT NULL,
  `application_id` bigint UNSIGNED DEFAULT NULL,
  `subject` varchar(200) NOT NULL,
  `description` text NOT NULL,
  `is_accident` tinyint(1) DEFAULT '0',
  `forwarded_to_org` tinyint(1) DEFAULT '0',
  `forwarded_to_org_at` datetime DEFAULT NULL,
  `org_notice_summary` text,
  `include_student_details` tinyint(1) DEFAULT '0',
  `warning_note_to_student` text,
  `warning_sent_at` datetime DEFAULT NULL,
  `status` enum('submitted','institution_review','admin_review','resolved','dismissed') NOT NULL DEFAULT 'submitted',
  `filed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `complaints`
--

INSERT INTO `complaints` (`complaint_id`, `student_id`, `complainant_type`, `student_status`, `organization_id`, `category_id`, `job_id`, `application_id`, `subject`, `description`, `is_accident`, `forwarded_to_org`, `forwarded_to_org_at`, `org_notice_summary`, `include_student_details`, `warning_note_to_student`, `warning_sent_at`, `status`, `filed_at`, `created_at`, `updated_at`) VALUES
(1, 19, 'student', NULL, 6, 4, NULL, NULL, 'nag search og bold', 'gi gamit ang server search og speringhoy', 0, 0, NULL, NULL, 0, NULL, NULL, 'resolved', '2026-09-06 14:20:15', '2026-09-06 14:20:15', '2026-09-06 15:23:57'),
(3, 19, 'student', 'ojt', 6, 1, NULL, NULL, 'gina buangan ko nila', 'dili ko nila palangga didtoa sa office', 0, 0, NULL, NULL, 0, NULL, NULL, 'resolved', '2026-09-06 15:20:12', '2026-09-06 15:20:12', '2026-09-06 15:24:37'),
(4, 19, 'student', 'ojt', 6, 5, NULL, NULL, 'test', 'test', 0, 0, NULL, NULL, 0, NULL, NULL, 'resolved', '2026-09-06 16:30:57', '2026-09-06 16:30:57', '2026-09-06 16:31:50'),
(5, 19, 'student', NULL, 6, 4, NULL, NULL, 'test', 'test', 0, 1, '2026-09-11 20:16:37', 'aaaa', 1, NULL, NULL, 'submitted', '2026-09-06 17:10:54', '2026-09-06 17:10:54', '2026-09-11 20:16:37'),
(7, 19, 'organization', NULL, 6, 4, NULL, NULL, 'test', 'cdsfgfgg', 0, 0, NULL, NULL, 0, NULL, NULL, 'submitted', '2026-09-06 18:37:48', '2026-09-06 18:37:48', '2026-09-06 18:37:48'),
(8, 19, 'organization', NULL, 6, 4, NULL, NULL, 'Na dusmo', 'Nag tinanga', 1, 0, NULL, NULL, 0, NULL, NULL, 'submitted', '2026-09-11 19:57:48', '2026-09-11 19:57:48', '2026-09-11 19:57:48'),
(9, 19, 'organization', NULL, 6, 4, NULL, NULL, 'Na dusmo', 'Nag tinanga', 1, 0, NULL, NULL, 0, NULL, NULL, 'submitted', '2026-09-11 19:58:32', '2026-09-11 19:58:32', '2026-09-11 19:58:32'),
(10, 19, 'organization', NULL, 6, 4, NULL, NULL, 'Na dusmo', 'Nag tinanga', 1, 0, NULL, NULL, 0, NULL, NULL, 'institution_review', '2026-09-11 19:59:29', '2026-09-11 19:59:29', '2026-09-11 20:16:02'),
(19, 19, 'organization', NULL, 6, 4, NULL, NULL, 'Na dusmo', 'Nag tinanga', 1, 0, NULL, NULL, 0, 'buang', '2026-09-11 20:15:31', 'submitted', '2026-09-11 20:05:37', '2026-09-11 20:05:37', '2026-09-11 20:15:31'),
(20, 19, 'organization', NULL, 6, 4, NULL, NULL, 'wla ga tuman sa gina sugo', 'bayot ko, wah niya ko gin lubot+', 0, 0, NULL, NULL, 0, NULL, NULL, 'submitted', '2026-09-11 20:06:54', '2026-09-11 20:06:54', '2026-09-11 20:13:36'),
(21, 19, 'student', 'ojt', 6, 5, NULL, NULL, 'buang mag pa lubot', '12345678', 0, 0, NULL, NULL, 0, NULL, NULL, 'submitted', '2026-09-11 20:17:25', '2026-09-11 20:17:25', '2026-09-11 20:17:25');

-- --------------------------------------------------------

--
-- Table structure for table `complaint_categories`
--

CREATE TABLE `complaint_categories` (
  `category_id` int UNSIGNED NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `complaint_categories`
--

INSERT INTO `complaint_categories` (`category_id`, `category_name`, `description`, `created_at`, `updated_at`) VALUES
(1, 'Workplace Harassment', 'Unsafe or inappropriate workplace conduct', '2026-08-29 21:39:45', '2026-08-29 21:39:45'),
(2, 'Safety & Working Conditions', 'Substandard health and occupational safety', '2026-08-29 21:39:45', '2026-08-29 21:39:45'),
(3, 'Excessive Hours / Exploitation', 'Hours exceeding CHED or MOA guidelines', '2026-08-29 21:39:45', '2026-08-29 21:39:45'),
(4, 'Allowance / Stipend Issues', 'Delayed or unpaid agreed allowance', '2026-08-29 21:39:45', '2026-08-29 21:39:45'),
(5, 'Other', 'General complaints and grievances', '2026-08-29 21:39:45', '2026-08-29 21:39:45');

-- --------------------------------------------------------

--
-- Table structure for table `complaint_evidence`
--

CREATE TABLE `complaint_evidence` (
  `evidence_id` bigint UNSIGNED NOT NULL,
  `complaint_id` bigint UNSIGNED NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `complaint_reviews`
--

CREATE TABLE `complaint_reviews` (
  `review_id` bigint UNSIGNED NOT NULL,
  `complaint_id` bigint UNSIGNED NOT NULL,
  `reviewed_by` bigint UNSIGNED NOT NULL,
  `reviewer_role` enum('institution','admin') NOT NULL,
  `findings` text,
  `recommendation` text,
  `action_taken` varchar(255) DEFAULT NULL,
  `reviewed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `complaint_reviews`
--

INSERT INTO `complaint_reviews` (`review_id`, `complaint_id`, `reviewed_by`, `reviewer_role`, `findings`, `recommendation`, `action_taken`, `reviewed_at`, `created_at`, `updated_at`) VALUES
(1, 1, 22, 'institution', 'liwata kay puspusan taka', 'bagsak daritso oi', 'lampusan', '2026-09-06 14:21:42', '2026-09-06 14:21:42', '2026-09-06 14:21:42'),
(2, 3, 22, 'institution', 'luya na akogn istudyante', 'pasensyaamanay', 'kugaon na gyud nako ni ', '2026-09-06 15:22:12', '2026-09-06 15:22:12', '2026-09-06 15:22:12'),
(3, 1, 1, 'admin', 'bantay mo liwat pa', 'Resolved with Sanctions/Notes', 'warning', '2026-09-06 15:23:57', '2026-09-06 15:23:57', '2026-09-06 15:23:57'),
(4, 3, 1, 'admin', 'namia kugon oi bata paka', 'Resolved with Sanctions/Notes', 'suspension', '2026-09-06 15:24:37', '2026-09-06 15:24:37', '2026-09-06 15:24:37'),
(5, 4, 1, 'admin', '123', 'Resolved with Sanctions/Notes', 'suspension', '2026-09-06 16:31:50', '2026-09-06 16:31:50', '2026-09-06 16:31:50'),
(6, 10, 22, 'institution', 'sdcdf', 'fddfdf', 'fdfddf', '2026-09-11 20:16:02', '2026-09-11 20:16:02', '2026-09-11 20:16:02');

-- --------------------------------------------------------

--
-- Table structure for table `entity_registrations`
--

CREATE TABLE `entity_registrations` (
  `registration_id` bigint UNSIGNED NOT NULL,
  `entity_type` enum('institution','hiring_organization','institution_staff','student','workplace_mentor') NOT NULL,
  `entity_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `status` enum('pending','verified','rejected') DEFAULT 'pending',
  `reviewer_user_id` bigint UNSIGNED DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `rejection_reason` text,
  `submitted_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `entity_registrations`
--

INSERT INTO `entity_registrations` (`registration_id`, `entity_type`, `entity_id`, `user_id`, `status`, `reviewer_user_id`, `reviewed_at`, `rejection_reason`, `submitted_at`) VALUES
(10, 'institution_staff', 7, 22, 'verified', 21, '2026-09-06 03:15:03', NULL, '2026-09-06 03:14:28'),
(12, 'student', 6, 27, 'verified', 35, '2026-09-06 05:10:00', NULL, '2026-09-06 03:38:06'),
(13, 'student', 7, 28, 'verified', 35, '2026-09-06 05:10:01', NULL, '2026-09-06 03:39:06'),
(14, 'student', 8, 29, 'verified', 35, '2026-09-06 05:10:02', NULL, '2026-09-06 03:40:10'),
(15, 'student', 9, 30, 'verified', 35, '2026-09-06 05:10:03', NULL, '2026-09-06 03:40:59'),
(16, 'student', 10, 31, 'verified', 35, '2026-09-06 05:11:15', NULL, '2026-09-06 03:41:47'),
(17, 'student', 11, 32, 'verified', 35, '2026-09-06 05:11:12', NULL, '2026-09-06 03:43:11'),
(18, 'student', 12, 33, 'verified', 35, '2026-09-06 03:53:53', NULL, '2026-09-06 03:44:42'),
(20, 'institution_staff', 12, 35, 'verified', 22, '2026-09-06 03:53:24', NULL, '2026-09-06 03:53:10'),
(24, 'student', 16, 40, 'verified', 35, '2026-09-06 05:11:11', NULL, '2026-09-06 03:59:50'),
(26, 'student', 19, 44, 'verified', 35, '2026-09-06 05:13:42', NULL, '2026-09-06 05:13:29'),
(30, 'workplace_mentor', 6, 55, 'verified', 46, '2026-09-06 14:08:05', NULL, '2026-09-06 14:07:50'),
(31, 'student', 21, 64, 'pending', NULL, NULL, NULL, '2026-09-11 19:40:45'),
(32, 'student', 22, 65, 'pending', NULL, NULL, NULL, '2026-09-11 19:40:45'),
(33, 'student', 23, 66, 'pending', NULL, NULL, NULL, '2026-09-11 19:40:46'),
(34, 'student', 24, 67, 'pending', NULL, NULL, NULL, '2026-09-11 19:41:09'),
(35, 'student', 25, 68, 'pending', NULL, NULL, NULL, '2026-09-11 19:41:09'),
(36, 'student', 26, 69, 'pending', NULL, NULL, NULL, '2026-09-11 19:41:09'),
(37, 'student', 27, 70, 'pending', NULL, NULL, NULL, '2026-09-11 19:41:23'),
(38, 'student', 28, 71, 'pending', NULL, NULL, NULL, '2026-09-11 19:41:23'),
(39, 'student', 29, 72, 'pending', NULL, NULL, NULL, '2026-09-11 19:41:23'),
(40, 'student', 30, 73, 'pending', NULL, NULL, NULL, '2026-09-11 19:41:53'),
(41, 'student', 31, 74, 'pending', NULL, NULL, NULL, '2026-09-11 19:41:53'),
(42, 'student', 32, 75, 'pending', NULL, NULL, NULL, '2026-09-11 19:41:53'),
(43, 'student', 33, 76, 'pending', NULL, NULL, NULL, '2026-09-11 19:45:05'),
(44, 'student', 34, 77, 'pending', NULL, NULL, NULL, '2026-09-11 19:50:40');

-- --------------------------------------------------------

--
-- Table structure for table `hiring_organizations`
--

CREATE TABLE `hiring_organizations` (
  `organization_id` bigint UNSIGNED NOT NULL,
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
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `hiring_organizations`
--

INSERT INTO `hiring_organizations` (`organization_id`, `organization_name`, `business_structure`, `industry`, `address`, `city`, `province`, `sec_dti_number`, `bir_tin`, `mayors_permit_number`, `contact_email`, `contact_phone`, `website`, `status`, `created_at`, `updated_at`) VALUES
(5, 'Citi Hardware ', 'corporation', 'Engineering', 'General Paulino Santos Drive, Zone III, Koronadal City, South Cotabato', NULL, NULL, 'vdfivdovdf-743049', 'juuuuu-00066', 'fskfherw-88886', 'HR_main@citihardware.com', '0999999999', 'https://citihardware.com/', 'active', '2026-09-06 05:24:34', '2026-09-06 05:30:33'),
(6, 'Marbel Worx', 'partnership', 'Technology', 'Ong Building, Benigno Aquino Street, Zone I, Koronadal City, South Cotabato, Philippines', NULL, NULL, 'fddadfkjgdf-9458656', '456557-08-67776-fdgfh', 'fdfrgrtgtr-56657765', 'HR_main@marbelworx.com', '09876545678', 'https://www.dnb.com/business-directory/company-profiles/marbelworx-computer-store.909aa4836b8a23ea2d156f5280bf2434', 'active', '2026-09-06 05:33:36', '2026-09-06 05:34:01'),
(7, 'The Farm', 'partnership', 'Hospitality', 'National Highway, Barangay Carpenter Hill, Koronadal City, South Cotabato', NULL, NULL, 'vdfbfd-0987654', 'vgfhgf-009068', 'sgffg-87647536', 'thefarmatcarpenterhill@gmail.com', '0917-726-0721', 'https://thefarmatcarpenterhill.ph/', 'active', '2026-09-06 05:45:59', '2026-09-06 05:46:21'),
(8, 'TechCore Solutions Inc.', 'corporation', 'Information Technology', 'J. Catolico Ave, Lagao', 'General Santos City', 'South Cotabato', NULL, NULL, NULL, 'organization@gmail.com', '09987654321', 'https://techcore.ph', 'active', '2026-09-11 19:06:37', '2026-09-11 19:06:37');

-- --------------------------------------------------------

--
-- Table structure for table `institutions`
--

CREATE TABLE `institutions` (
  `institution_id` bigint UNSIGNED NOT NULL,
  `institution_name` varchar(200) NOT NULL,
  `institution_code` varchar(30) NOT NULL,
  `institution_type` varchar(50) NOT NULL DEFAULT 'university',
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `province` varchar(100) DEFAULT NULL,
  `postal_code` varchar(10) DEFAULT NULL,
  `contact_email` varchar(150) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `accreditation_number` varchar(100) DEFAULT NULL,
  `director_name` varchar(150) DEFAULT NULL,
  `director_title` varchar(150) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `status` enum('pending','active','suspended','deactivated') NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `institutions`
--

INSERT INTO `institutions` (`institution_id`, `institution_name`, `institution_code`, `institution_type`, `address`, `city`, `province`, `postal_code`, `contact_email`, `contact_phone`, `accreditation_number`, `director_name`, `director_title`, `website`, `status`, `created_at`, `updated_at`) VALUES
(4, 'Notre Dame of Marbel University', 'NDMU', 'university', 'Alunan Avenue, Barangay Zone 3, City of Koronadal, 9506 South Cotabato, Philippines', NULL, NULL, NULL, 'president@ndmu.edu.ph', '(083) 228-3598', 'PERMIT-TEST-001', 'Brother Paterno S. Corpus, FMS, EdD', 'Institution Director / President', 'https://www.ndmu.edu.ph/', 'active', '2026-09-06 03:04:01', '2026-09-06 03:05:28'),
(5, 'South East Asia Institute of Technology', 'SEAIT', 'university', 'National Highway, Crossing Rubber, Tupi, 9505 South Cotabato, Philippines', NULL, NULL, NULL, 'institution@gmail.com', '09999999999', 'ytjrjh-8767645', 'ngr. Milagros S. Tamayo, MIM', 'Institution Director / President', 'https://seait.edu.ph/', 'active', '2026-09-06 05:36:49', '2026-09-11 19:06:37'),
(6, 'Green Valley College Foundation Inc', 'GVCFI', 'college', 'Km. 2, Barrio 2, General Santos Drive (Gensan Drive), Koronadal City, South Cotabato, Philippines, 9506', NULL, NULL, NULL, 'president@gvcfi.com', '098765434567', 'htrhhyh-000087', 'Atty. Romeo \"RJ\" A. Sustiguer Jr., Ed.D., Ph.D', 'Institution Director / President', 'https://gvcfi.edu.ph', 'active', '2026-09-06 05:41:57', '2026-09-06 05:46:15');

-- --------------------------------------------------------

--
-- Table structure for table `institution_documents`
--

CREATE TABLE `institution_documents` (
  `document_id` bigint UNSIGNED NOT NULL,
  `institution_id` bigint UNSIGNED NOT NULL,
  `document_type` varchar(100) NOT NULL DEFAULT 'accreditation_certificate',
  `document_name` varchar(255) DEFAULT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `verified` tinyint(1) NOT NULL DEFAULT '0',
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `institution_documents`
--

INSERT INTO `institution_documents` (`document_id`, `institution_id`, `document_type`, `document_name`, `file_path`, `file_name`, `verified`, `uploaded_at`, `created_at`, `updated_at`) VALUES
(1, 2, 'accreditation_certificate', NULL, 'Ref: PERMIT-TEST-001 (Self-Declared)', NULL, 0, '2026-09-06 02:42:49', '2026-09-06 02:42:49', '2026-09-06 02:42:49'),
(3, 4, 'accreditation_certificate', 'CHED GR / TESDA CTPR / DepEd Permit (PERMIT-TEST-001)', '/uploads/institutions/accreditation_file-1788635041380-871623933.docx', 'Battery report.docx', 0, '2026-09-06 03:04:01', '2026-09-06 03:04:01', '2026-09-06 03:04:01'),
(4, 5, 'accreditation_certificate', 'CHED GR / TESDA CTPR / DepEd Permit (ytjrjh-8767645)', '/uploads/institutions/accreditation_file-1788644209286-126884637.docx', 'JOB-READINESS - READY FOR PRINT.docx', 0, '2026-09-06 05:36:49', '2026-09-06 05:36:49', '2026-09-06 05:36:49'),
(5, 6, 'accreditation_certificate', 'CHED GR / TESDA CTPR / DepEd Permit (htrhhyh-000087)', '/uploads/institutions/accreditation_file-1788644517436-182370335.docx', 'GAME EXPOSURE - READY TO PRINT.docx', 0, '2026-09-06 05:41:57', '2026-09-06 05:41:57', '2026-09-06 05:41:57');

-- --------------------------------------------------------

--
-- Table structure for table `institution_job_approvals`
--

CREATE TABLE `institution_job_approvals` (
  `approval_id` bigint UNSIGNED NOT NULL,
  `job_id` bigint UNSIGNED NOT NULL,
  `institution_id` bigint UNSIGNED NOT NULL,
  `approval_status` enum('pending','approved','rejected') DEFAULT 'pending',
  `reviewed_by` bigint UNSIGNED DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `rejection_reason` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `institution_job_approvals`
--

INSERT INTO `institution_job_approvals` (`approval_id`, `job_id`, `institution_id`, `approval_status`, `reviewed_by`, `reviewed_at`, `rejection_reason`, `created_at`) VALUES
(1, 1, 1, 'approved', 3, '2026-08-29 22:15:42', NULL, '2026-08-29 22:14:51'),
(2, 2, 1, 'rejected', 5, '2026-09-03 09:22:45', NULL, '2026-09-03 06:34:57'),
(3, 3, 1, 'approved', 3, '2026-09-03 06:50:38', NULL, '2026-09-03 06:36:14'),
(5, 4, 1, 'approved', 3, '2026-09-03 09:33:41', NULL, '2026-09-03 09:33:21'),
(6, 5, 1, 'pending', NULL, NULL, NULL, '2026-09-03 09:40:48'),
(7, 6, 4, 'approved', 21, '2026-09-06 14:14:41', NULL, '2026-09-06 14:12:25'),
(8, 7, 4, 'approved', 21, '2026-09-06 15:28:43', NULL, '2026-09-06 15:28:12'),
(9, 11, 4, 'approved', 22, '2026-09-11 20:26:00', NULL, '2026-09-11 20:25:03');

-- --------------------------------------------------------

--
-- Table structure for table `institution_registrations`
--

CREATE TABLE `institution_registrations` (
  `registration_id` bigint UNSIGNED NOT NULL,
  `institution_id` bigint UNSIGNED NOT NULL,
  `submitted_by` bigint UNSIGNED NOT NULL,
  `status` enum('pending','under_review','approved','rejected') NOT NULL DEFAULT 'pending',
  `reviewed_by` bigint UNSIGNED DEFAULT NULL,
  `review_notes` text,
  `submitted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `institution_registrations`
--

INSERT INTO `institution_registrations` (`registration_id`, `institution_id`, `submitted_by`, `status`, `reviewed_by`, `review_notes`, `submitted_at`, `reviewed_at`, `created_at`, `updated_at`) VALUES
(4, 4, 21, 'approved', NULL, NULL, '2026-09-06 03:04:01', '2026-09-06 03:05:28', '2026-09-06 03:04:01', '2026-09-06 03:05:28'),
(5, 5, 47, 'approved', NULL, NULL, '2026-09-06 05:36:49', '2026-09-06 05:46:16', '2026-09-06 05:36:49', '2026-09-06 05:46:16'),
(6, 6, 49, 'approved', NULL, NULL, '2026-09-06 05:41:57', '2026-09-06 05:46:15', '2026-09-06 05:41:57', '2026-09-06 05:46:15');

-- --------------------------------------------------------

--
-- Table structure for table `institution_reports`
--

CREATE TABLE `institution_reports` (
  `report_id` bigint UNSIGNED NOT NULL,
  `institution_id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `complaint_id` bigint UNSIGNED NOT NULL,
  `category_id` int UNSIGNED NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `findings` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `recommendation` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `action_taken` text COLLATE utf8mb4_unicode_ci,
  `reported_by` bigint UNSIGNED NOT NULL,
  `status` enum('submitted','under_review','action_taken','closed') COLLATE utf8mb4_unicode_ci DEFAULT 'submitted',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `institution_reports`
--

INSERT INTO `institution_reports` (`report_id`, `institution_id`, `organization_id`, `complaint_id`, `category_id`, `title`, `findings`, `recommendation`, `action_taken`, `reported_by`, `status`, `created_at`, `updated_at`) VALUES
(2, 4, 6, 10, 4, 'fdgffdg', 'fdgfdgfgf', 'fdgfdgg', '', 22, 'submitted', '2026-09-11 20:15:43', '2026-09-11 20:15:43');

-- --------------------------------------------------------

--
-- Table structure for table `institution_staff`
--

CREATE TABLE `institution_staff` (
  `staff_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `institution_id` bigint UNSIGNED NOT NULL,
  `program_id` bigint UNSIGNED DEFAULT NULL,
  `department` varchar(150) DEFAULT NULL,
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
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `institution_staff`
--

INSERT INTO `institution_staff` (`staff_id`, `user_id`, `institution_id`, `program_id`, `department`, `position`, `employee_id`, `staff_number`, `first_name`, `last_name`, `contact_number`, `permissions`, `is_active`, `is_verified`, `created_at`, `updated_at`) VALUES
(7, 22, 4, 23, 'Information Technology & Computing', 'dean', 'STF-01-DEAN', 'STF-01-DEAN', 'John', 'Rojas', '0988888888', '{\"suffix\": \"\", \"last_name\": \"Rojas\", \"first_name\": \"John\", \"salutation\": \"Dean\", \"middle_name\": \"Santos\", \"passcode_used\": \"INST-DEN-2MM64\", \"contact_number\": \"0988888888\", \"department_name\": \"Information Technology & Computing\", \"office_location\": \"Alunan Avenue, Barangay Zone 3, City of Koronadal, 9506 South Cotabato, Philippines\", \"passcode_intended_email\": \"dean@ndmu.edu.ph\", \"passcode_intended_position\": \"dean\", \"passcode_target_identifier\": \"STF-01-DEAN\", \"passcode_intended_program_id\": 23, \"director_assigned_permissions\": {\"can_verify_students\": true, \"can_handle_grievances\": true, \"can_approve_job_offers\": true, \"can_manage_ojt_records\": true}}', 1, 1, '2026-09-06 03:14:28', '2026-09-06 03:24:25'),
(8, 23, 4, 46, 'Education & Teacher Training', 'ojt_supervisor', 'EMP-7627', 'STF-7627', 'Maria', 'Santos', '09123456789', '{\"last_name\": \"Santos\", \"first_name\": \"Maria\", \"salutation\": \"Prof.\", \"department_name\": \"Education & Teacher Training\", \"can_verify_students\": true, \"can_manage_ojt_records\": true}', 1, 1, '2026-09-06 03:29:27', '2026-09-06 03:29:27'),
(12, 35, 4, 23, 'Information Technology & Computing', 'registrar', 'STF-02', 'STF-02', 'X', 'X', '099999999', '{\"suffix\": \"\", \"last_name\": \"X\", \"first_name\": \"X\", \"salutation\": \"Ms.\", \"middle_name\": \"X\", \"passcode_used\": \"INST-REG-FZ1E2\", \"contact_number\": \"099999999\", \"department_name\": \"Information Technology & Computing\", \"office_location\": \"X\", \"passcode_intended_email\": \"registrar@ndmu.edu.ph\", \"passcode_intended_position\": \"registrar\", \"passcode_target_identifier\": \"STF-02\", \"passcode_intended_program_id\": 23, \"director_assigned_permissions\": {\"can_verify_students\": true, \"can_handle_grievances\": false, \"can_approve_job_offers\": false, \"can_manage_ojt_records\": false}}', 1, 1, '2026-09-06 03:53:10', '2026-09-06 03:53:24');

-- --------------------------------------------------------

--
-- Table structure for table `interviews`
--

CREATE TABLE `interviews` (
  `interview_id` bigint UNSIGNED NOT NULL,
  `application_id` bigint UNSIGNED NOT NULL,
  `schedule_at` datetime NOT NULL,
  `mode` enum('onsite','online','phone') NOT NULL DEFAULT 'onsite',
  `location_or_link` varchar(255) DEFAULT NULL,
  `status` enum('scheduled','completed','cancelled','no_show') NOT NULL DEFAULT 'scheduled',
  `notes` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `job_applications`
--

CREATE TABLE `job_applications` (
  `application_id` bigint UNSIGNED NOT NULL,
  `job_id` bigint UNSIGNED NOT NULL,
  `student_id` bigint UNSIGNED NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'submitted',
  `accepted_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `applied_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `job_applications`
--

INSERT INTO `job_applications` (`application_id`, `job_id`, `student_id`, `status`, `accepted_at`, `completed_at`, `applied_at`, `created_at`, `updated_at`) VALUES
(2, 3, 3, 'accepted', '2026-09-03 06:53:01', NULL, '2026-09-03 06:51:03', '2026-09-03 06:51:03', '2026-09-03 06:53:01'),
(3, 4, 3, 'rejected', NULL, NULL, '2026-09-03 09:33:57', '2026-09-03 09:33:57', '2026-09-03 09:40:04'),
(4, 1, 4, 'submitted', NULL, NULL, '2026-09-03 09:44:19', '2026-09-03 09:44:19', '2026-09-03 09:44:19'),
(5, 4, 4, 'submitted', NULL, NULL, '2026-09-03 09:44:22', '2026-09-03 09:44:22', '2026-09-03 09:44:22'),
(6, 3, 4, 'submitted', NULL, NULL, '2026-09-03 09:44:24', '2026-09-03 09:44:24', '2026-09-03 09:44:24'),
(7, 6, 19, 'accepted', '2026-09-06 14:17:29', NULL, '2026-09-06 14:16:27', '2026-09-06 14:16:27', '2026-09-06 14:17:29'),
(8, 8, 20, 'shortlisted', NULL, NULL, '2026-09-11 19:06:37', '2026-09-11 19:06:37', '2026-09-11 19:06:37'),
(9, 11, 9, 'interview', NULL, NULL, '2026-09-11 20:26:35', '2026-09-11 20:26:35', '2026-09-11 20:26:57');

-- --------------------------------------------------------

--
-- Table structure for table `job_offers`
--

CREATE TABLE `job_offers` (
  `offer_id` bigint UNSIGNED NOT NULL,
  `application_id` bigint UNSIGNED NOT NULL,
  `status` enum('offered','accepted','declined','withdrawn') NOT NULL DEFAULT 'offered',
  `offered_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `responded_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `job_postings`
--

CREATE TABLE `job_postings` (
  `job_id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `mentor_id` bigint UNSIGNED DEFAULT NULL,
  `title` varchar(200) NOT NULL,
  `description` text NOT NULL,
  `requirements` text,
  `deliverables` text,
  `posting_type` varchar(50) NOT NULL DEFAULT 'ojt',
  `job_type` varchar(50) NOT NULL DEFAULT 'ojt',
  `location` varchar(255) DEFAULT NULL,
  `finish_time` varchar(100) DEFAULT NULL,
  `on_call_days` int UNSIGNED DEFAULT NULL,
  `salary_rate` decimal(10,2) DEFAULT NULL,
  `salary_rate_type` varchar(50) DEFAULT 'daily',
  `target_audience` varchar(50) DEFAULT 'ojt_students',
  `work_setup` varchar(50) NOT NULL DEFAULT 'onsite',
  `slots_available` int UNSIGNED NOT NULL DEFAULT '1',
  `status` enum('draft','pending_review','active','closed','rejected') NOT NULL DEFAULT 'draft',
  `posted_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `job_postings`
--

INSERT INTO `job_postings` (`job_id`, `organization_id`, `mentor_id`, `title`, `description`, `requirements`, `deliverables`, `posting_type`, `job_type`, `location`, `finish_time`, `on_call_days`, `salary_rate`, `salary_rate_type`, `target_audience`, `work_setup`, `slots_available`, `status`, `posted_at`, `expires_at`, `created_at`, `updated_at`) VALUES
(1, 3, 2, 'Mamayot', 'Pangallowance', 'Itom', '', 'ojt', 'internship', 'Octavio Village ', NULL, 3, NULL, 'daily', 'ojt_students', 'hybrid', 1, 'active', '2026-08-29 22:14:51', NULL, '2026-08-29 22:14:51', '2026-09-03 06:50:02'),
(2, 3, 2, 'jjj', 'jjj', 'jjj', NULL, 'on_call', 'on_call', 'jjj', '08:00', 3, 50.00, 'monthly', 'ojt_completers_or_graduates', 'on-site', 1, 'active', '2026-09-03 06:34:57', NULL, '2026-09-03 06:34:57', '2026-09-03 06:34:57'),
(3, 3, 2, 'hhh', 'hhh', 'hhh', NULL, 'ojt', 'internship', 'hhh', '21:00', 3, 800.00, 'monthly', 'ojt_students', 'hybrid', 1, 'active', '2026-09-03 06:36:14', NULL, '2026-09-03 06:36:14', '2026-09-03 06:36:14'),
(4, 3, 2, 'IT', 'kkk', 'kk', NULL, 'ojt', 'internship', 'kk', '21:09', 3, 600.00, 'daily', 'ojt_students', 'on-site', 1, 'active', '2026-09-03 09:33:21', NULL, '2026-09-03 09:33:21', '2026-09-03 09:33:21'),
(5, 3, 2, '123', '123', '123', NULL, 'ojt', 'internship', '123', '00:30', 3, 123.00, 'daily', 'ojt_students', 'hybrid', 123, 'active', '2026-09-03 09:40:48', NULL, '2026-09-03 09:40:48', '2026-09-03 09:40:48'),
(6, 6, 6, 'Computer software/hardware maintenance ', 'Excel and software/hardware knowledge, know how to fix company computer software/hardware', 'coding, electronic tools', NULL, 'ojt', 'internship', 'Security Office', '08:30', 3, NULL, 'daily', 'ojt_students', 'on-site', 1, 'active', '2026-09-06 14:12:25', NULL, '2026-09-06 14:12:25', '2026-09-06 14:12:25'),
(7, 6, 6, 'IT', '300 per computer hardware setup', 'know how to assemble computer parts and program the computer', NULL, 'ojt', 'internship', 'office ', '10:00', 3, 300.00, 'monthly', 'ojt_students', 'on-site', 3, 'active', '2026-09-06 15:28:12', NULL, '2026-09-06 15:28:12', '2026-09-06 15:28:12'),
(8, 8, NULL, 'Frontend React Developer Intern', 'Assist in building modern web interfaces using React, Tailwind CSS, and REST APIs.', NULL, NULL, 'ojt', 'ojt', 'General Santos City / Hybrid', NULL, NULL, NULL, 'daily', 'ojt_students', 'onsite', 3, 'active', '2026-09-11 19:06:37', NULL, '2026-09-11 19:06:37', '2026-09-11 19:06:37'),
(9, 8, NULL, 'Full-Stack Node.js / Python Intern', 'Collaborate with senior developers on database optimization, API design, and backend microservices.', NULL, NULL, 'ojt', 'ojt', 'General Santos City', NULL, NULL, NULL, 'daily', 'ojt_students', 'onsite', 2, 'active', '2026-09-11 19:06:37', NULL, '2026-09-11 19:06:37', '2026-09-11 19:06:37'),
(10, 8, NULL, 'UI/UX Design Intern', 'Design beautiful wireframes, design systems, and responsive prototypes in Figma.', NULL, NULL, 'ojt', 'ojt', 'Remote / WFH', NULL, NULL, NULL, 'daily', 'ojt_students', 'onsite', 2, 'active', '2026-09-11 19:06:37', NULL, '2026-09-11 19:06:37', '2026-09-11 19:06:37'),
(11, 6, 6, 'MIS', '123', '1232', NULL, 'ojt', 'internship', 'balay', '08:30', 3, NULL, 'daily', 'ojt_students', 'on-site', 1, 'active', '2026-09-11 20:25:03', NULL, '2026-09-11 20:25:03', '2026-09-11 20:25:03');

-- --------------------------------------------------------

--
-- Table structure for table `job_posting_reviews`
--

CREATE TABLE `job_posting_reviews` (
  `review_id` bigint UNSIGNED NOT NULL,
  `job_id` bigint UNSIGNED NOT NULL,
  `reviewed_by` bigint UNSIGNED NOT NULL,
  `status` enum('approved','rejected') NOT NULL,
  `notes` text,
  `reviewed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `job_required_programs`
--

CREATE TABLE `job_required_programs` (
  `id` bigint UNSIGNED NOT NULL,
  `job_id` bigint UNSIGNED NOT NULL,
  `program_id` bigint UNSIGNED NOT NULL,
  `is_mandatory` tinyint(1) DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `job_required_programs`
--

INSERT INTO `job_required_programs` (`id`, `job_id`, `program_id`, `is_mandatory`, `created_at`) VALUES
(1, 2, 1, 1, '2026-09-03 06:34:57'),
(2, 2, 3, 1, '2026-09-03 06:34:57'),
(3, 3, 14, 1, '2026-09-03 06:36:14'),
(4, 3, 16, 1, '2026-09-03 06:36:14'),
(5, 1, 1, 1, '2026-09-03 06:50:02'),
(6, 1, 3, 1, '2026-09-03 06:50:02'),
(7, 4, 1, 1, '2026-09-03 09:33:21'),
(8, 4, 3, 1, '2026-09-03 09:33:21'),
(9, 5, 15, 1, '2026-09-03 09:40:48'),
(10, 6, 1, 1, '2026-09-06 14:12:25'),
(11, 6, 4, 1, '2026-09-06 14:12:25'),
(12, 6, 23, 1, '2026-09-06 14:12:25'),
(13, 6, 3, 1, '2026-09-06 14:12:25'),
(14, 7, 1, 1, '2026-09-06 15:28:12'),
(15, 7, 23, 1, '2026-09-06 15:28:12'),
(16, 7, 3, 1, '2026-09-06 15:28:12'),
(17, 11, 1, 1, '2026-09-11 20:25:03'),
(18, 11, 23, 1, '2026-09-11 20:25:03'),
(19, 11, 3, 1, '2026-09-11 20:25:03');

-- --------------------------------------------------------

--
-- Table structure for table `job_required_skills`
--

CREATE TABLE `job_required_skills` (
  `id` bigint UNSIGNED NOT NULL,
  `job_id` bigint UNSIGNED NOT NULL,
  `skill_id` int UNSIGNED NOT NULL,
  `importance` enum('required','preferred') NOT NULL DEFAULT 'required',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `master_programs`
--

CREATE TABLE `master_programs` (
  `master_program_id` int NOT NULL,
  `program_name` varchar(150) NOT NULL,
  `program_code` varchar(30) NOT NULL,
  `discipline` varchar(100) NOT NULL,
  `default_ojt_hours` int UNSIGNED NOT NULL DEFAULT '486',
  `description` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `master_programs`
--

INSERT INTO `master_programs` (`master_program_id`, `program_name`, `program_code`, `discipline`, `default_ojt_hours`, `description`, `created_at`) VALUES
(1, 'BS Information Technology', 'BSIT', 'Information Technology & Computing', 486, 'Software engineering, network administration, database design, web and mobile development.', '2026-08-24 17:34:42'),
(2, 'BS Computer Science', 'BSCS', 'Information Technology & Computing', 300, 'Algorithms, computational theory, artificial intelligence, software architecture, data structures.', '2026-08-24 17:34:42'),
(3, 'BS Information Systems', 'BSIS', 'Information Technology & Computing', 486, 'Enterprise resource planning, IT project management, business process analytics, systems integration.', '2026-08-24 17:34:42'),
(4, 'BS Computer Engineering', 'BSCPE', 'Information Technology & Computing', 480, 'Embedded systems, microcontrollers, digital hardware architecture, firmware development.', '2026-08-24 17:34:42'),
(5, 'BS Software Engineering', 'BSSE', 'Information Technology & Computing', 486, 'Large-scale software design, agile methodologies, QA automation, DevOps pipelines.', '2026-08-24 17:34:42'),
(6, 'BS Entertainment and Multimedia Computing', 'BSEMC', 'Information Technology & Computing', 486, 'Game development, digital animation, multimedia asset production, interactive UI.', '2026-08-24 17:34:42'),
(7, 'BS Data Science and Analytics', 'BSDSA', 'Information Technology & Computing', 300, 'Big data processing, statistical modeling, machine learning, predictive analytics.', '2026-08-24 17:34:42'),
(8, 'BS Cybersecurity', 'BSCSB', 'Information Technology & Computing', 486, 'Network forensics, penetration testing, security architecture, cryptography.', '2026-08-24 17:34:42'),
(9, 'BS Accountancy', 'BSA', 'Business & Accountancy', 600, 'Financial accounting, auditing, taxation, regulatory compliance, corporate reporting.', '2026-08-24 17:34:42'),
(10, 'BS Management Accounting', 'BSMA', 'Business & Accountancy', 600, 'Cost accounting, managerial analysis, strategic planning, budgeting.', '2026-08-24 17:34:42'),
(11, 'BS Accounting Information Systems', 'BSAIS', 'Business & Accountancy', 600, 'Accounting automation, internal control auditing, IT governance in financial systems.', '2026-08-24 17:34:42'),
(12, 'BS Business Administration - Financial Management', 'BSBA-FM', 'Business & Accountancy', 600, 'Corporate finance, investment analysis, banking, capital budgeting.', '2026-08-24 17:34:42'),
(13, 'BS Business Administration - Marketing Management', 'BSBA-MM', 'Business & Accountancy', 600, 'Brand strategy, digital marketing, sales management, consumer behavior.', '2026-08-24 17:34:42'),
(14, 'BS Business Administration - Human Resource Management', 'BSBA-HRM', 'Business & Accountancy', 600, 'Talent acquisition, labor relations, organizational development, payroll administration.', '2026-08-24 17:34:42'),
(15, 'BS Business Administration - Operations Management', 'BSBA-OM', 'Business & Accountancy', 600, 'Supply chain logistics, quality assurance, production optimization, inventory control.', '2026-08-24 17:34:42'),
(16, 'BS Business Administration - Business Economics', 'BSBA-BE', 'Business & Accountancy', 600, 'Economic forecasting, market research, econometric modeling.', '2026-08-24 17:34:42'),
(17, 'BS Entrepreneurship', 'BSENTREP', 'Business & Accountancy', 600, 'Venture creation, business incubation, SME leadership, product innovation.', '2026-08-24 17:34:42'),
(18, 'BS Office Administration', 'BSOA', 'Business & Accountancy', 600, 'Executive office management, document administration, corporate communications.', '2026-08-24 17:34:42'),
(19, 'BS Real Estate Management', 'BSREM', 'Business & Accountancy', 600, 'Property appraisal, brokerage management, real estate development.', '2026-08-24 17:34:42'),
(20, 'BS Customs Administration', 'BSCA', 'Business & Accountancy', 600, 'Tariff laws, customs brokerage, international trade logistics.', '2026-08-24 17:34:42'),
(21, 'BS Internal Auditing', 'BSIA', 'Business & Accountancy', 600, 'Risk management, internal compliance, fraud examination.', '2026-08-24 17:34:42'),
(22, 'BS Civil Engineering', 'BSCE', 'Engineering & Architecture', 240, 'Structural design, construction project management, geotechnical & hydraulic engineering.', '2026-08-24 17:34:42'),
(23, 'BS Mechanical Engineering', 'BSME', 'Engineering & Architecture', 240, 'Thermodynamics, HVAC systems, industrial machinery, manufacturing engineering.', '2026-08-24 17:34:42'),
(24, 'BS Electrical Engineering', 'BSEE', 'Engineering & Architecture', 240, 'Power generation, electrical grid systems, industrial automation, circuit design.', '2026-08-24 17:34:43'),
(25, 'BS Electronics Engineering', 'BSECE', 'Engineering & Architecture', 240, 'Telecommunications, signal processing, RF engineering, microelectronics.', '2026-08-24 17:34:43'),
(26, 'BS Industrial Engineering', 'BSIE', 'Engineering & Architecture', 240, 'Process optimization, ergonomics, lean operations, facilities planning.', '2026-08-24 17:34:43'),
(27, 'BS Chemical Engineering', 'BSCHE', 'Engineering & Architecture', 240, 'Process engineering, industrial chemistry, biochemical processing.', '2026-08-24 17:34:43'),
(28, 'BS Geodetic Engineering', 'BSGE', 'Engineering & Architecture', 240, 'GIS mapping, land surveying, photogrammetry, remote sensing.', '2026-08-24 17:34:43'),
(29, 'BS Architecture', 'BSARCH', 'Engineering & Architecture', 300, 'Architectural design, building codes, BIM modeling, urban planning.', '2026-08-24 17:34:43'),
(30, 'BS Environmental and Sanitary Engineering', 'BSESE', 'Engineering & Architecture', 240, 'Wastewater treatment, environmental impact assessment, public sanitation.', '2026-08-24 17:34:43'),
(31, 'BS Aeronautical Engineering', 'BSAeroE', 'Engineering & Architecture', 300, 'Aerodynamics, aircraft maintenance, propulsion systems, flight mechanics.', '2026-08-24 17:34:43'),
(32, 'BS Mining Engineering', 'BSMinE', 'Engineering & Architecture', 240, 'Mineral exploration, mine safety, excavation engineering.', '2026-08-24 17:34:43'),
(33, 'BS Metallurgical Engineering', 'BSMetE', 'Engineering & Architecture', 240, 'Extractive metallurgy, materials science, mineral processing.', '2026-08-24 17:34:43'),
(34, 'BS Agricultural and Biosystems Engineering', 'BSABE', 'Engineering & Architecture', 240, 'Agricultural mechanization, post-harvest systems, renewable agro-energy.', '2026-08-24 17:34:43'),
(35, 'BS Nursing', 'BSN', 'Health & Allied Sciences', 1000, 'Clinical patient care, surgical nursing, community health, hospital rotations.', '2026-08-24 17:34:43'),
(36, 'BS Medical Technology / Medical Laboratory Science', 'BSMLS', 'Health & Allied Sciences', 1080, 'Clinical chemistry, hematology, microbiology, blood banking, molecular pathology.', '2026-08-24 17:34:43'),
(37, 'BS Pharmacy', 'BSPHARM', 'Health & Allied Sciences', 960, 'Pharmacology, clinical compounding, drug safety, hospital pharmacy.', '2026-08-24 17:34:43'),
(38, 'BS Physical Therapy', 'BSPT', 'Health & Allied Sciences', 1200, 'Rehabilitation medicine, neuromuscular therapy, musculoskeletal treatments.', '2026-08-24 17:34:43'),
(39, 'BS Occupational Therapy', 'BSOT', 'Health & Allied Sciences', 1200, 'Therapeutic intervention, pediatric & psychiatric rehabilitation.', '2026-08-24 17:34:43'),
(40, 'BS Radiologic Technology', 'BSRT', 'Health & Allied Sciences', 1000, 'Medical imaging, X-ray radiography, CT/MRI operation, radiation safety.', '2026-08-24 17:34:43'),
(41, 'BS Nutrition and Dietetics', 'BSND', 'Health & Allied Sciences', 900, 'Clinical nutrition, meal management, diet therapy, community nutrition.', '2026-08-24 17:34:43'),
(42, 'BS Midwifery', 'BSM', 'Health & Allied Sciences', 800, 'Maternal and child care, obstetrics, reproductive health.', '2026-08-24 17:34:43'),
(43, 'BS Biology', 'BSBIO', 'Health & Allied Sciences', 300, 'Cellular biology, ecology, microbiology, biological laboratory research.', '2026-08-24 17:34:43'),
(44, 'BS Psychology', 'BSPSY', 'Health & Allied Sciences', 400, 'Psychological assessment, clinical counseling, cognitive neuroscience.', '2026-08-24 17:34:43'),
(45, 'BA Psychology', 'ABPSY', 'Health & Allied Sciences', 300, 'Developmental psychology, industrial organizational psychology, counseling.', '2026-08-24 17:34:43'),
(46, 'BS Hospitality Management', 'BSHM', 'Hospitality & Tourism', 600, 'Hotel operations, front office management, food & beverage services, event management.', '2026-08-24 17:34:43'),
(47, 'BS Tourism Management', 'BSTM', 'Hospitality & Tourism', 600, 'Tourism planning, airline operations, tour guiding, travel agency management.', '2026-08-24 17:34:43'),
(48, 'BS Culinary Management', 'BSCM', 'Hospitality & Tourism', 600, 'Kitchen management, culinary arts, pastry production, food cost control.', '2026-08-24 17:34:43'),
(49, 'BS Hotel and Restaurant Management', 'BSHRM', 'Hospitality & Tourism', 600, 'Hospitality leadership, banqueting, lodging operations.', '2026-08-24 17:34:43'),
(50, 'Bachelor of Elementary Education', 'BEED', 'Education & Teacher Training', 500, 'Primary pedagogy, child development, foundational literacy & numeracy.', '2026-08-24 17:34:43'),
(51, 'Bachelor of Secondary Education - Major in English', 'BSED-ENG', 'Education & Teacher Training', 500, 'High school English language teaching, literature pedagogy.', '2026-08-24 17:34:43'),
(52, 'Bachelor of Secondary Education - Major in Mathematics', 'BSED-MATH', 'Education & Teacher Training', 500, 'Algebra, geometry, calculus, high school mathematics instruction.', '2026-08-24 17:34:43'),
(53, 'Bachelor of Secondary Education - Major in Science', 'BSED-SCI', 'Education & Teacher Training', 500, 'Physics, chemistry, biology, general science teaching.', '2026-08-24 17:34:43'),
(54, 'Bachelor of Secondary Education - Major in Filipino', 'BSED-FIL', 'Education & Teacher Training', 500, 'Wika at panitikang Filipino, pagtuturo ng Filipino.', '2026-08-24 17:34:43'),
(55, 'Bachelor of Secondary Education - Major in Social Studies', 'BSED-SOCSCI', 'Education & Teacher Training', 500, 'World history, Philippine history, political geography pedagogy.', '2026-08-24 17:34:43'),
(56, 'Bachelor of Secondary Education - Major in Values Education', 'BSED-VALED', 'Education & Teacher Training', 500, 'Ethics, moral philosophy, character formation teaching.', '2026-08-24 17:34:43'),
(57, 'Bachelor of Physical Education', 'BPED', 'Education & Teacher Training', 500, 'Sports coaching, fitness education, movement pedagogy.', '2026-08-24 17:34:43'),
(58, 'Bachelor of Special Needs Education', 'BSNED', 'Education & Teacher Training', 500, 'Inclusive education, adaptive curricula for diverse learners.', '2026-08-24 17:34:43'),
(59, 'Bachelor of Early Childhood Education', 'BECED', 'Education & Teacher Training', 500, 'Preschool pedagogy, kindergarten teaching, early child development.', '2026-08-24 17:34:43'),
(60, 'Bachelor of Technical-Vocational Teacher Education', 'BTVTED', 'Education & Teacher Training', 500, 'Tech-voc instruction, industrial arts, skills training certification.', '2026-08-24 17:34:43'),
(61, 'Bachelor of Technology and Livelihood Education', 'BTLEd', 'Education & Teacher Training', 500, 'Home economics, agri-fishery arts, industrial education.', '2026-08-24 17:34:43'),
(62, 'BA Communication', 'BACOMM', 'Humanities & Social Sciences', 300, 'Broadcasting, public relations, digital journalism, corporate media.', '2026-08-24 17:34:43'),
(63, 'BA Journalism', 'BAJOURN', 'Humanities & Social Sciences', 300, 'Investigative reporting, news editing, media ethics, photojournalism.', '2026-08-24 17:34:43'),
(64, 'BA Political Science', 'BAPOLS', 'Humanities & Social Sciences', 300, 'Public policy, international relations, constitutional law, governance.', '2026-08-24 17:34:43'),
(65, 'BA English Language Studies', 'BAELS', 'Humanities & Social Sciences', 300, 'Applied linguistics, ESL instruction, discourse analysis.', '2026-08-24 17:34:43'),
(66, 'BA Literature', 'BALIT', 'Humanities & Social Sciences', 300, 'Literary theory, creative writing, world literature.', '2026-08-24 17:34:43'),
(67, 'BA History', 'BAHIST', 'Humanities & Social Sciences', 300, 'Archival research, historical analysis, heritage preservation.', '2026-08-24 17:34:43'),
(68, 'BA Philosophy', 'BAPHILO', 'Humanities & Social Sciences', 300, 'Epistemology, bioethics, symbolic logic, political philosophy.', '2026-08-24 17:34:43'),
(69, 'BS Development Communication', 'BSDevCom', 'Humanities & Social Sciences', 300, 'Community broadcasting, development advocacy, rural communication.', '2026-08-24 17:34:43'),
(70, 'BS Social Work', 'BSSW', 'Humanities & Social Sciences', 1000, 'Case management, community organizing, social welfare administration.', '2026-08-24 17:34:43'),
(71, 'BS Community Development', 'BSCD', 'Humanities & Social Sciences', 350, 'Participatory planning, grassroots organizing, poverty alleviation programs.', '2026-08-24 17:34:43'),
(72, 'Bachelor of Public Administration', 'BPA', 'Humanities & Social Sciences', 300, 'Government administration, public finance, civil service management.', '2026-08-24 17:34:43'),
(73, 'BS Criminology', 'BSCRIM', 'Criminology & Public Safety', 540, 'Criminal jurisprudence, police administration, crime scene investigation.', '2026-08-24 17:34:43'),
(74, 'BS Forensic Science', 'BSFS', 'Criminology & Public Safety', 540, 'Dactyloscopy, forensic ballistics, DNA analysis, questioned document examination.', '2026-08-24 17:34:43'),
(75, 'BS Industrial Security Management', 'BSISM', 'Criminology & Public Safety', 540, 'Asset protection, crisis management, corporate security operations.', '2026-08-24 17:34:43'),
(76, 'BS Agriculture', 'BSAGRI', 'Agriculture & Environment', 300, 'Agronomy, crop science, animal science, sustainable farming technologies.', '2026-08-24 17:34:43'),
(77, 'BS Forestry', 'BSF', 'Agriculture & Environment', 300, 'Forest management, watershed conservation, silviculture.', '2026-08-24 17:34:43'),
(78, 'BS Fisheries', 'BSFI', 'Agriculture & Environment', 300, 'Aquaculture, post-harvest fish processing, marine resource management.', '2026-08-24 17:34:43'),
(79, 'BS Environmental Science', 'BSES', 'Agriculture & Environment', 300, 'Environmental monitoring, climate science, ecological management.', '2026-08-24 17:34:43'),
(80, 'BS Agribusiness', 'BSAB', 'Agriculture & Environment', 300, 'Agricultural marketing, farm business management, food supply chains.', '2026-08-24 17:34:43'),
(81, 'BS Marine Transportation', 'BSMT', 'Maritime Studies', 1200, 'Deck officer training, celestial navigation, maritime safety, STCW compliant shipboard training.', '2026-08-24 17:34:43'),
(82, 'BS Marine Engineering', 'BSMarE', 'Maritime Studies', 1200, 'Marine propulsion, auxiliary machinery, naval electrical systems shipboard training.', '2026-08-24 17:34:43'),
(83, 'Bachelor of Fine Arts', 'BFA', 'Arts, Design & Media', 300, 'Painting, sculpture, visual arts exhibition, studio practice.', '2026-08-24 17:34:43'),
(84, 'Bachelor of Multimedia Arts', 'BMMA', 'Arts, Design & Media', 300, '3D animation, visual effects, UI/UX design, digital cinematography.', '2026-08-24 17:34:43'),
(85, 'Bachelor of Music', 'BMUS', 'Arts, Design & Media', 300, 'Music performance, composition, sound engineering.', '2026-08-24 17:34:43'),
(171, 'BS Interior Design', 'BSID', 'Arts, Design & Media', 300, 'Space planning, interior detailing, furniture design, building materials.', '2026-08-24 17:35:13');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `notification_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `sender_id` bigint UNSIGNED DEFAULT NULL,
  `sender_name` varchar(150) DEFAULT NULL,
  `title` varchar(150) NOT NULL,
  `message` text NOT NULL,
  `link` varchar(255) DEFAULT NULL,
  `related_type` varchar(50) DEFAULT NULL,
  `related_id` bigint UNSIGNED DEFAULT NULL,
  `type` enum('registration','verification','ojt','job','complaint','system','other') NOT NULL DEFAULT 'other',
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`notification_id`, `user_id`, `sender_id`, `sender_name`, `title`, `message`, `link`, `related_type`, `related_id`, `type`, `is_read`, `created_at`, `updated_at`) VALUES
(19, 33, NULL, NULL, 'Registration Approved & Activated', 'Your student account has been approved and verified by your institution registrar. You can now access all portal features and apply for OJT opportunities.', NULL, NULL, NULL, 'system', 0, '2026-09-06 03:53:53', '2026-09-06 03:53:53'),
(20, 27, NULL, NULL, 'Registration Approved & Activated', 'Your student account has been approved and verified by your institution registrar. You can now access all portal features and apply for OJT opportunities.', NULL, NULL, NULL, 'system', 0, '2026-09-06 05:10:00', '2026-09-06 05:10:00'),
(21, 28, NULL, NULL, 'Registration Approved & Activated', 'Your student account has been approved and verified by your institution registrar. You can now access all portal features and apply for OJT opportunities.', NULL, NULL, NULL, 'system', 0, '2026-09-06 05:10:01', '2026-09-06 05:10:01'),
(22, 29, NULL, NULL, 'Registration Approved & Activated', 'Your student account has been approved and verified by your institution registrar. You can now access all portal features and apply for OJT opportunities.', NULL, NULL, NULL, 'system', 0, '2026-09-06 05:10:02', '2026-09-06 05:10:02'),
(23, 30, NULL, NULL, 'Registration Approved & Activated', 'Your student account has been approved and verified by your institution registrar. You can now access all portal features and apply for OJT opportunities.', NULL, NULL, NULL, 'system', 0, '2026-09-06 05:10:03', '2026-09-06 05:10:03'),
(24, 40, NULL, NULL, 'Registration Approved & Activated', 'Your student account has been approved and verified by your institution registrar. You can now access all portal features and apply for OJT opportunities.', NULL, NULL, NULL, 'system', 0, '2026-09-06 05:11:11', '2026-09-06 05:11:11'),
(25, 32, NULL, NULL, 'Registration Approved & Activated', 'Your student account has been approved and verified by your institution registrar. You can now access all portal features and apply for OJT opportunities.', NULL, NULL, NULL, 'system', 0, '2026-09-06 05:11:12', '2026-09-06 05:11:12'),
(26, 31, NULL, NULL, 'Registration Approved & Activated', 'Your student account has been approved and verified by your institution registrar. You can now access all portal features and apply for OJT opportunities.', NULL, NULL, NULL, 'system', 1, '2026-09-06 05:11:15', '2026-09-11 23:35:16'),
(27, 44, NULL, NULL, 'Registration Approved & Activated', 'Your student account has been approved and verified by your institution registrar. You can now access all portal features and apply for OJT opportunities.', NULL, NULL, NULL, 'system', 1, '2026-09-06 05:13:42', '2026-09-06 18:41:32'),
(28, 44, NULL, NULL, 'Security Alert: Password Changed', 'Your account password was successfully updated.', NULL, NULL, NULL, 'system', 1, '2026-09-06 05:16:12', '2026-09-06 18:41:32'),
(29, 46, NULL, NULL, 'New Applicant Received', 'I I (STU-09) applied for \"Computer software/hardware maintenance \".', NULL, NULL, NULL, 'job', 1, '2026-09-06 14:16:27', '2026-09-11 20:28:57'),
(30, 55, NULL, NULL, 'New Applicant Received', 'I I (STU-09) applied for \"Computer software/hardware maintenance \".', NULL, NULL, NULL, 'job', 1, '2026-09-06 14:16:27', '2026-09-06 18:30:44'),
(31, 44, NULL, NULL, 'Application Shortlisted!', 'Your application for \"Computer software/hardware maintenance \" at Marbel Worx has been updated to \"shortlisted\".', NULL, NULL, NULL, 'job', 1, '2026-09-06 14:16:53', '2026-09-06 18:41:32'),
(32, 44, NULL, NULL, 'Application Status Update', 'Your application for \"Computer software/hardware maintenance \" at Marbel Worx has been updated to \"interview\".', NULL, NULL, NULL, 'job', 1, '2026-09-06 14:16:59', '2026-09-06 18:41:32'),
(33, 44, NULL, NULL, 'Application Status Update', 'Your application for \"Computer software/hardware maintenance \" at Marbel Worx has been updated to \"offered\".', NULL, NULL, NULL, 'job', 1, '2026-09-06 14:17:25', '2026-09-06 18:41:32'),
(34, 46, NULL, NULL, 'OJT Offer Accepted', 'I I has accepted your offer for \"Computer software/hardware maintenance \".', NULL, NULL, NULL, 'ojt', 1, '2026-09-06 14:17:29', '2026-09-11 20:28:57'),
(35, 44, NULL, NULL, 'Mentor Recorded Time-In', 'Your workplace mentor timed you in today at 14:18:08. Have a productive training shift!', NULL, NULL, NULL, 'ojt', 1, '2026-09-06 14:18:08', '2026-09-06 18:41:32'),
(36, 22, NULL, NULL, 'Clearance Requirement Submitted', 'I I (STU-09) submitted an OJT clearance requirement.', NULL, NULL, NULL, 'ojt', 1, '2026-09-06 14:18:41', '2026-09-11 19:53:45'),
(37, 23, NULL, NULL, 'Clearance Requirement Submitted', 'I I (STU-09) submitted an OJT clearance requirement.', NULL, NULL, NULL, 'ojt', 0, '2026-09-06 14:18:41', '2026-09-06 14:18:41'),
(38, 35, NULL, NULL, 'Clearance Requirement Submitted', 'I I (STU-09) submitted an OJT clearance requirement.', NULL, NULL, NULL, 'ojt', 0, '2026-09-06 14:18:41', '2026-09-06 14:18:41'),
(39, 44, NULL, NULL, 'Mentor Recorded Time-Out & Hours Credited', 'Your mentor timed you out at 17:30. 3.5 training hours have been officially credited to your DTR!', NULL, NULL, NULL, 'ojt', 1, '2026-09-06 14:19:37', '2026-09-06 18:41:32'),
(40, 1, NULL, NULL, 'Student Grievance Filed', 'A A (OJT Student) filed a grievance: \"Test Grievance with OJT Status\".', NULL, NULL, NULL, 'complaint', 0, '2026-09-06 15:13:07', '2026-09-06 15:13:07'),
(41, 22, NULL, NULL, 'Student Grievance Filed', 'A A (OJT Student) filed a grievance: \"Test Grievance with OJT Status\".', NULL, NULL, NULL, 'complaint', 1, '2026-09-06 15:13:07', '2026-09-11 19:43:24'),
(42, 23, NULL, NULL, 'Student Grievance Filed', 'A A (OJT Student) filed a grievance: \"Test Grievance with OJT Status\".', NULL, NULL, NULL, 'complaint', 0, '2026-09-06 15:13:07', '2026-09-06 15:13:07'),
(43, 35, NULL, NULL, 'Student Grievance Filed', 'A A (OJT Student) filed a grievance: \"Test Grievance with OJT Status\".', NULL, NULL, NULL, 'complaint', 0, '2026-09-06 15:13:07', '2026-09-06 15:13:07'),
(44, 1, NULL, NULL, 'Student Grievance Filed', 'I I (OJT Student) filed a grievance: \"gina buangan ko nila\".', NULL, NULL, NULL, 'complaint', 0, '2026-09-06 15:20:12', '2026-09-06 15:20:12'),
(45, 22, NULL, NULL, 'Student Grievance Filed', 'I I (OJT Student) filed a grievance: \"gina buangan ko nila\".', NULL, NULL, NULL, 'complaint', 1, '2026-09-06 15:20:12', '2026-09-06 18:38:17'),
(46, 23, NULL, NULL, 'Student Grievance Filed', 'I I (OJT Student) filed a grievance: \"gina buangan ko nila\".', NULL, NULL, NULL, 'complaint', 0, '2026-09-06 15:20:12', '2026-09-06 15:20:12'),
(47, 35, NULL, NULL, 'Student Grievance Filed', 'I I (OJT Student) filed a grievance: \"gina buangan ko nila\".', NULL, NULL, NULL, 'complaint', 0, '2026-09-06 15:20:12', '2026-09-06 15:20:12'),
(48, 1, NULL, NULL, 'Student Grievance Filed', 'I I (OJT Student) filed a grievance: \"test\".', NULL, NULL, NULL, 'complaint', 0, '2026-09-06 16:30:57', '2026-09-06 16:30:57'),
(49, 22, NULL, NULL, 'Student Grievance Filed', 'I I (OJT Student) filed a grievance: \"test\".', NULL, NULL, NULL, 'complaint', 1, '2026-09-06 16:30:57', '2026-09-06 18:30:05'),
(50, 23, NULL, NULL, 'Student Grievance Filed', 'I I (OJT Student) filed a grievance: \"test\".', NULL, NULL, NULL, 'complaint', 0, '2026-09-06 16:30:57', '2026-09-06 16:30:57'),
(51, 35, NULL, NULL, 'Student Grievance Filed', 'I I (OJT Student) filed a grievance: \"test\".', NULL, NULL, NULL, 'complaint', 0, '2026-09-06 16:30:57', '2026-09-06 16:30:57'),
(52, 22, 46, 'Marbel Worx', 'Intern Concern / Misconduct Report Filed', 'Marbel Worx reported an incident concerning I I: \"Test Incident Verification\".', '/dashboard/institution/monitoring', 'complaint', 6, 'complaint', 1, '2026-09-06 18:35:53', '2026-09-06 18:38:14'),
(53, 23, 46, 'Marbel Worx', 'Intern Concern / Misconduct Report Filed', 'Marbel Worx reported an incident concerning I I: \"Test Incident Verification\".', '/dashboard/institution/monitoring', 'complaint', 6, 'complaint', 0, '2026-09-06 18:35:53', '2026-09-06 18:35:53'),
(54, 35, 46, 'Marbel Worx', 'Intern Concern / Misconduct Report Filed', 'Marbel Worx reported an incident concerning I I: \"Test Incident Verification\".', '/dashboard/institution/monitoring', 'complaint', 6, 'complaint', 0, '2026-09-06 18:35:53', '2026-09-06 18:35:53'),
(55, 22, 55, 'Marbel Worx', 'Intern Concern / Misconduct Report Filed', 'Marbel Worx reported an incident concerning I I: \"test\".', '/dashboard/institution/monitoring', 'complaint', 7, 'complaint', 1, '2026-09-06 18:37:48', '2026-09-06 18:38:07'),
(56, 23, 55, 'Marbel Worx', 'Intern Concern / Misconduct Report Filed', 'Marbel Worx reported an incident concerning I I: \"test\".', '/dashboard/institution/monitoring', 'complaint', 7, 'complaint', 0, '2026-09-06 18:37:48', '2026-09-06 18:37:48'),
(57, 35, 55, 'Marbel Worx', 'Intern Concern / Misconduct Report Filed', 'Marbel Worx reported an incident concerning I I: \"test\".', '/dashboard/institution/monitoring', 'complaint', 7, 'complaint', 0, '2026-09-06 18:37:48', '2026-09-06 18:37:48'),
(58, 22, 45, 'Citi Hardware ', 'Urgent Accident Report Filed', 'Citi Hardware  reported an incident concerning A A: \"Test Incident Report - Severity fatal\".', '/dashboard/institution/monitoring', 'accident_report', 12, 'complaint', 0, '2026-09-11 20:04:56', '2026-09-11 20:04:56'),
(59, 23, 45, 'Citi Hardware ', 'Urgent Accident Report Filed', 'Citi Hardware  reported an incident concerning A A: \"Test Incident Report - Severity fatal\".', '/dashboard/institution/monitoring', 'accident_report', 12, 'complaint', 0, '2026-09-11 20:04:56', '2026-09-11 20:04:56'),
(60, 35, 45, 'Citi Hardware ', 'Urgent Accident Report Filed', 'Citi Hardware  reported an incident concerning A A: \"Test Incident Report - Severity fatal\".', '/dashboard/institution/monitoring', 'accident_report', 12, 'complaint', 0, '2026-09-11 20:04:56', '2026-09-11 20:04:56'),
(61, 22, 45, 'Citi Hardware ', 'Urgent Accident Report Filed', 'Citi Hardware  reported an incident concerning A A: \"Test Incident Report - Severity critical\".', '/dashboard/institution/monitoring', 'accident_report', 13, 'complaint', 0, '2026-09-11 20:04:56', '2026-09-11 20:04:56'),
(62, 23, 45, 'Citi Hardware ', 'Urgent Accident Report Filed', 'Citi Hardware  reported an incident concerning A A: \"Test Incident Report - Severity critical\".', '/dashboard/institution/monitoring', 'accident_report', 13, 'complaint', 0, '2026-09-11 20:04:56', '2026-09-11 20:04:56'),
(63, 35, 45, 'Citi Hardware ', 'Urgent Accident Report Filed', 'Citi Hardware  reported an incident concerning A A: \"Test Incident Report - Severity critical\".', '/dashboard/institution/monitoring', 'accident_report', 13, 'complaint', 0, '2026-09-11 20:04:56', '2026-09-11 20:04:56'),
(64, 22, 45, 'Citi Hardware ', 'Urgent Accident Report Filed', 'Citi Hardware  reported an incident concerning A A: \"Test Incident Report - Severity severe\".', '/dashboard/institution/monitoring', 'accident_report', 14, 'complaint', 0, '2026-09-11 20:04:56', '2026-09-11 20:04:56'),
(65, 23, 45, 'Citi Hardware ', 'Urgent Accident Report Filed', 'Citi Hardware  reported an incident concerning A A: \"Test Incident Report - Severity severe\".', '/dashboard/institution/monitoring', 'accident_report', 14, 'complaint', 0, '2026-09-11 20:04:56', '2026-09-11 20:04:56'),
(66, 35, 45, 'Citi Hardware ', 'Urgent Accident Report Filed', 'Citi Hardware  reported an incident concerning A A: \"Test Incident Report - Severity severe\".', '/dashboard/institution/monitoring', 'accident_report', 14, 'complaint', 0, '2026-09-11 20:04:56', '2026-09-11 20:04:56'),
(67, 22, 45, 'Citi Hardware ', 'Urgent Accident Report Filed', 'Citi Hardware  reported an incident concerning A A: \"Test Incident Report - Severity moderate\".', '/dashboard/institution/monitoring', 'accident_report', 15, 'complaint', 0, '2026-09-11 20:04:56', '2026-09-11 20:04:56'),
(68, 23, 45, 'Citi Hardware ', 'Urgent Accident Report Filed', 'Citi Hardware  reported an incident concerning A A: \"Test Incident Report - Severity moderate\".', '/dashboard/institution/monitoring', 'accident_report', 15, 'complaint', 0, '2026-09-11 20:04:56', '2026-09-11 20:04:56'),
(69, 35, 45, 'Citi Hardware ', 'Urgent Accident Report Filed', 'Citi Hardware  reported an incident concerning A A: \"Test Incident Report - Severity moderate\".', '/dashboard/institution/monitoring', 'accident_report', 15, 'complaint', 0, '2026-09-11 20:04:56', '2026-09-11 20:04:56'),
(70, 22, 45, 'Citi Hardware ', 'Urgent Accident Report Filed', 'Citi Hardware  reported an incident concerning A A: \"Test Incident Report - Severity minor\".', '/dashboard/institution/monitoring', 'accident_report', 16, 'complaint', 0, '2026-09-11 20:04:56', '2026-09-11 20:04:56'),
(71, 23, 45, 'Citi Hardware ', 'Urgent Accident Report Filed', 'Citi Hardware  reported an incident concerning A A: \"Test Incident Report - Severity minor\".', '/dashboard/institution/monitoring', 'accident_report', 16, 'complaint', 0, '2026-09-11 20:04:56', '2026-09-11 20:04:56'),
(72, 35, 45, 'Citi Hardware ', 'Urgent Accident Report Filed', 'Citi Hardware  reported an incident concerning A A: \"Test Incident Report - Severity minor\".', '/dashboard/institution/monitoring', 'accident_report', 16, 'complaint', 0, '2026-09-11 20:04:56', '2026-09-11 20:04:56'),
(73, 22, 45, 'Citi Hardware ', 'Urgent Accident Report Filed', 'Citi Hardware  reported an incident concerning A A: \"Test Incident Report - Severity catastrophic\".', '/dashboard/institution/monitoring', 'accident_report', 17, 'complaint', 0, '2026-09-11 20:04:56', '2026-09-11 20:04:56'),
(74, 23, 45, 'Citi Hardware ', 'Urgent Accident Report Filed', 'Citi Hardware  reported an incident concerning A A: \"Test Incident Report - Severity catastrophic\".', '/dashboard/institution/monitoring', 'accident_report', 17, 'complaint', 0, '2026-09-11 20:04:56', '2026-09-11 20:04:56'),
(75, 35, 45, 'Citi Hardware ', 'Urgent Accident Report Filed', 'Citi Hardware  reported an incident concerning A A: \"Test Incident Report - Severity catastrophic\".', '/dashboard/institution/monitoring', 'accident_report', 17, 'complaint', 0, '2026-09-11 20:04:56', '2026-09-11 20:04:56'),
(76, 22, 45, 'Citi Hardware ', 'Urgent Accident Report Filed', 'Citi Hardware  reported an incident concerning A A: \"Test Incident Report - Severity DEFAULT\".', '/dashboard/institution/monitoring', 'accident_report', 18, 'complaint', 0, '2026-09-11 20:04:56', '2026-09-11 20:04:56'),
(77, 23, 45, 'Citi Hardware ', 'Urgent Accident Report Filed', 'Citi Hardware  reported an incident concerning A A: \"Test Incident Report - Severity DEFAULT\".', '/dashboard/institution/monitoring', 'accident_report', 18, 'complaint', 0, '2026-09-11 20:04:56', '2026-09-11 20:04:56'),
(78, 35, 45, 'Citi Hardware ', 'Urgent Accident Report Filed', 'Citi Hardware  reported an incident concerning A A: \"Test Incident Report - Severity DEFAULT\".', '/dashboard/institution/monitoring', 'accident_report', 18, 'complaint', 0, '2026-09-11 20:04:56', '2026-09-11 20:04:56'),
(79, 22, 55, 'Marbel Worx', 'Urgent Accident Report Filed', 'Marbel Worx reported an incident concerning I I: \"Na dusmo\".', '/dashboard/institution/monitoring', 'accident_report', 19, 'complaint', 1, '2026-09-11 20:05:37', '2026-09-11 20:07:38'),
(80, 23, 55, 'Marbel Worx', 'Urgent Accident Report Filed', 'Marbel Worx reported an incident concerning I I: \"Na dusmo\".', '/dashboard/institution/monitoring', 'accident_report', 19, 'complaint', 0, '2026-09-11 20:05:37', '2026-09-11 20:05:37'),
(81, 35, 55, 'Marbel Worx', 'Urgent Accident Report Filed', 'Marbel Worx reported an incident concerning I I: \"Na dusmo\".', '/dashboard/institution/monitoring', 'accident_report', 19, 'complaint', 0, '2026-09-11 20:05:37', '2026-09-11 20:05:37'),
(82, 22, 55, 'Marbel Worx', 'Intern Concern / Misconduct Report Filed', 'Marbel Worx reported an incident concerning I I: \"wla ga tuman sa gina sugo\".', '/dashboard/institution/monitoring', 'complaint', 20, 'complaint', 1, '2026-09-11 20:06:54', '2026-09-11 20:07:31'),
(83, 23, 55, 'Marbel Worx', 'Intern Concern / Misconduct Report Filed', 'Marbel Worx reported an incident concerning I I: \"wla ga tuman sa gina sugo\".', '/dashboard/institution/monitoring', 'complaint', 20, 'complaint', 0, '2026-09-11 20:06:54', '2026-09-11 20:06:54'),
(84, 35, 55, 'Marbel Worx', 'Intern Concern / Misconduct Report Filed', 'Marbel Worx reported an incident concerning I I: \"wla ga tuman sa gina sugo\".', '/dashboard/institution/monitoring', 'complaint', 20, 'complaint', 0, '2026-09-11 20:06:54', '2026-09-11 20:06:54'),
(85, 44, 21, 'Notre Dame of Marbel University', 'Official Institution Warning Note Issued', 'Your institution has issued an official warning note regarding incident: \"wla ga tuman sa gina sugo\".', '/dashboard/student/complaints', 'warning', 20, 'complaint', 1, '2026-09-11 20:13:36', '2026-09-11 23:30:19'),
(86, 1, 21, 'Notre Dame of Marbel University', 'Formal Institution Report Filed Against Organization', 'Notre Dame of Marbel University filed a formal escalation report regarding Marbel Worx: \"undefined\".', '/dashboard/admin/complaints', 'institution_report', 1, 'complaint', 0, '2026-09-11 20:13:36', '2026-09-11 20:13:36'),
(87, 56, 21, 'Notre Dame of Marbel University', 'Formal Institution Report Filed Against Organization', 'Notre Dame of Marbel University filed a formal escalation report regarding Marbel Worx: \"undefined\".', '/dashboard/admin/complaints', 'institution_report', 1, 'complaint', 0, '2026-09-11 20:13:36', '2026-09-11 20:13:36'),
(88, 57, 21, 'Notre Dame of Marbel University', 'Formal Institution Report Filed Against Organization', 'Notre Dame of Marbel University filed a formal escalation report regarding Marbel Worx: \"undefined\".', '/dashboard/admin/complaints', 'institution_report', 1, 'complaint', 0, '2026-09-11 20:13:36', '2026-09-11 20:13:36'),
(89, 44, 22, 'Notre Dame of Marbel University', 'Official Institution Warning Note Issued', 'Your institution has issued an official warning note regarding incident: \"Na dusmo\".', '/dashboard/student/complaints', 'warning', 19, 'complaint', 1, '2026-09-11 20:15:31', '2026-09-11 23:29:54'),
(90, 1, 22, 'Notre Dame of Marbel University', 'Formal Institution Report Filed Against Organization', 'Notre Dame of Marbel University filed a formal escalation report regarding Marbel Worx: \"fdgffdg\".', '/dashboard/admin/complaints', 'institution_report', 2, 'complaint', 1, '2026-09-11 20:15:43', '2026-09-11 22:38:22'),
(91, 56, 22, 'Notre Dame of Marbel University', 'Formal Institution Report Filed Against Organization', 'Notre Dame of Marbel University filed a formal escalation report regarding Marbel Worx: \"fdgffdg\".', '/dashboard/admin/complaints', 'institution_report', 2, 'complaint', 0, '2026-09-11 20:15:43', '2026-09-11 20:15:43'),
(92, 57, 22, 'Notre Dame of Marbel University', 'Formal Institution Report Filed Against Organization', 'Notre Dame of Marbel University filed a formal escalation report regarding Marbel Worx: \"fdgffdg\".', '/dashboard/admin/complaints', 'institution_report', 2, 'complaint', 0, '2026-09-11 20:15:43', '2026-09-11 20:15:43'),
(93, 46, 22, 'Notre Dame of Marbel University', 'Official Grievance Notice from Partner Institution', 'Notre Dame of Marbel University has issued an inquiry regarding a student grievance: \"test\".', '/dashboard/organization/grievances', 'grievance', 5, 'complaint', 1, '2026-09-11 20:16:37', '2026-09-11 20:28:57'),
(94, 55, 22, 'Notre Dame of Marbel University', 'Official Grievance Notice from Partner Institution', 'Notre Dame of Marbel University has issued an inquiry regarding a student grievance: \"test\".', '/dashboard/organization/grievances', 'grievance', 5, 'complaint', 1, '2026-09-11 20:16:37', '2026-09-11 20:17:49'),
(95, 22, 44, 'I I', 'Student Grievance Filed', 'I I (OJT Student) filed a formal grievance: \"buang mag pa lubot\".', '/dashboard/institution/monitoring', 'grievance', 21, 'complaint', 1, '2026-09-11 20:17:25', '2026-09-11 20:25:50'),
(96, 23, 44, 'I I', 'Student Grievance Filed', 'I I (OJT Student) filed a formal grievance: \"buang mag pa lubot\".', '/dashboard/institution/monitoring', 'grievance', 21, 'complaint', 0, '2026-09-11 20:17:25', '2026-09-11 20:17:25'),
(97, 35, 44, 'I I', 'Student Grievance Filed', 'I I (OJT Student) filed a formal grievance: \"buang mag pa lubot\".', '/dashboard/institution/monitoring', 'grievance', 21, 'complaint', 0, '2026-09-11 20:17:25', '2026-09-11 20:17:25'),
(98, 46, NULL, NULL, 'New Applicant Received', 'D D (STU-04) applied for \"MIS\".', NULL, NULL, NULL, 'job', 1, '2026-09-11 20:26:35', '2026-09-11 20:28:54'),
(99, 55, NULL, NULL, 'New Applicant Received', 'D D (STU-04) applied for \"MIS\".', NULL, NULL, NULL, 'job', 1, '2026-09-11 20:26:35', '2026-09-11 23:21:56'),
(100, 30, NULL, NULL, 'Application Status Update', 'Your application for \"MIS\" at Marbel Worx has been updated to \"interview\".', NULL, NULL, NULL, 'job', 0, '2026-09-11 20:26:57', '2026-09-11 20:26:57'),
(101, 44, NULL, NULL, 'Mentor Recorded Time-In', 'Your workplace mentor timed you in today at 23:22:13. Have a productive training shift!', NULL, NULL, NULL, 'ojt', 1, '2026-09-11 23:22:13', '2026-09-11 23:28:31');

-- --------------------------------------------------------

--
-- Table structure for table `ojt_attendance_logs`
--

CREATE TABLE `ojt_attendance_logs` (
  `attendance_id` bigint UNSIGNED NOT NULL,
  `ojt_id` bigint UNSIGNED NOT NULL,
  `student_id` bigint UNSIGNED NOT NULL,
  `mentor_id` bigint UNSIGNED DEFAULT NULL,
  `log_date` date NOT NULL,
  `time_in` time NOT NULL,
  `time_out` time DEFAULT NULL,
  `hours_rendered` decimal(5,2) DEFAULT '0.00',
  `tasks_accomplished` text,
  `status` enum('pending','verified','rejected') DEFAULT 'pending',
  `verified_by` bigint UNSIGNED DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `rejection_notes` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `ojt_attendance_logs`
--

INSERT INTO `ojt_attendance_logs` (`attendance_id`, `ojt_id`, `student_id`, `mentor_id`, `log_date`, `time_in`, `time_out`, `hours_rendered`, `tasks_accomplished`, `status`, `verified_by`, `verified_at`, `rejection_notes`, `created_at`, `updated_at`) VALUES
(1, 1, 3, NULL, '2026-09-03', '06:54:32', '06:54:45', 0.00, 'laba', 'pending', NULL, NULL, NULL, '2026-09-03 06:54:32', '2026-09-03 06:54:45'),
(2, 2, 19, NULL, '2026-09-06', '20:20:00', '17:30:00', 8.00, 'Workplace training shift completed.', 'verified', 46, '2026-09-06 16:35:16', NULL, '2026-09-06 14:18:08', '2026-09-06 16:35:16'),
(3, 2, 19, NULL, '2026-09-11', '23:22:13', NULL, 0.00, NULL, 'verified', 55, '2026-09-11 23:22:13', NULL, '2026-09-11 23:22:13', '2026-09-11 23:22:13');

-- --------------------------------------------------------

--
-- Table structure for table `ojt_deployment_offers`
--

CREATE TABLE `ojt_deployment_offers` (
  `offer_id` bigint UNSIGNED NOT NULL,
  `student_id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `job_id` bigint UNSIGNED DEFAULT NULL,
  `status` enum('offered','accepted','declined','withdrawn') NOT NULL DEFAULT 'offered',
  `offered_by` bigint UNSIGNED NOT NULL,
  `offered_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `responded_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ojt_performance_records`
--

CREATE TABLE `ojt_performance_records` (
  `record_id` bigint UNSIGNED NOT NULL,
  `ojt_id` bigint UNSIGNED NOT NULL,
  `evaluator_id` bigint UNSIGNED NOT NULL,
  `evaluation_period` enum('midterm','final') NOT NULL,
  `rating` decimal(3,2) NOT NULL,
  `comments` text,
  `score_details` json DEFAULT NULL,
  `evaluated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `ojt_performance_records`
--

INSERT INTO `ojt_performance_records` (`record_id`, `ojt_id`, `evaluator_id`, `evaluation_period`, `rating`, `comments`, `score_details`, `evaluated_at`, `created_at`, `updated_at`) VALUES
(1, 3, 60, 'midterm', 4.85, 'Outstanding performance in React UI components and backend integration.', NULL, '2026-09-11 19:06:37', '2026-09-11 19:06:37', '2026-09-11 19:06:37'),
(2, 3, 60, 'final', 4.70, 'Excellent performance and diligence in all assigned tasks.', '{\"score_quality\": 5, \"score_attitude\": 5, \"score_learning\": 5, \"score_appearance\": 4, \"score_motivation\": 5, \"score_instructions\": 5, \"score_interpersonal\": 4}', '2026-09-11 20:40:31', '2026-09-11 20:40:31', '2026-09-11 20:40:31');

-- --------------------------------------------------------

--
-- Table structure for table `ojt_records`
--

CREATE TABLE `ojt_records` (
  `ojt_id` bigint UNSIGNED NOT NULL,
  `student_id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `program_id` bigint UNSIGNED DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `required_hours` int UNSIGNED NOT NULL DEFAULT '0',
  `rendered_hours` int UNSIGNED NOT NULL DEFAULT '0',
  `status` enum('ongoing','completed','terminated','withdrawn') NOT NULL DEFAULT 'ongoing',
  `supervisor_name` varchar(150) DEFAULT NULL,
  `supervisor_contact` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `ojt_records`
--

INSERT INTO `ojt_records` (`ojt_id`, `student_id`, `organization_id`, `program_id`, `start_date`, `end_date`, `required_hours`, `rendered_hours`, `status`, `supervisor_name`, `supervisor_contact`, `created_at`, `updated_at`) VALUES
(1, 3, 3, 3, '2026-09-03', NULL, 600, 0, 'ongoing', NULL, NULL, '2026-09-03 06:53:01', '2026-09-03 06:53:01'),
(2, 19, 6, 23, '2026-09-06', NULL, 600, 9, 'ongoing', NULL, NULL, '2026-09-06 14:17:29', '2026-09-06 16:35:16'),
(3, 20, 8, 53, '2026-02-01', NULL, 600, 240, 'ongoing', 'Engr. Alex Santos', 'alex@techcore.ph', '2026-09-11 19:06:37', '2026-09-11 19:06:37');

-- --------------------------------------------------------

--
-- Table structure for table `ojt_requirements`
--

CREATE TABLE `ojt_requirements` (
  `requirement_id` bigint UNSIGNED NOT NULL,
  `institution_id` bigint UNSIGNED DEFAULT NULL,
  `requirement_name` varchar(150) NOT NULL,
  `description` text,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `ojt_requirements`
--

INSERT INTO `ojt_requirements` (`requirement_id`, `institution_id`, `requirement_name`, `description`, `is_mandatory`, `created_at`, `updated_at`) VALUES
(1, 1, 'vfvv', 'vvxv', 1, '2026-09-03 06:04:45', '2026-09-03 06:04:45'),
(2, 4, 'certification ', 'OJT certification from the establishment ', 1, '2026-09-06 05:18:32', '2026-09-06 05:18:32'),
(3, 4, 'test notif', '123', 1, '2026-09-11 23:27:51', '2026-09-11 23:27:51'),
(4, 4, '11323 test 123', 'dsvfdfdgf', 1, '2026-09-11 23:31:47', '2026-09-11 23:31:47'),
(5, 4, 'clearance mga kupal', 'asikasuha', 1, '2026-09-11 23:32:42', '2026-09-11 23:32:42'),
(6, 4, 'certificate na tuli na', '123456789', 1, '2026-09-11 23:34:38', '2026-09-11 23:34:38');

-- --------------------------------------------------------

--
-- Table structure for table `ojt_student_requirements`
--

CREATE TABLE `ojt_student_requirements` (
  `id` bigint UNSIGNED NOT NULL,
  `ojt_id` bigint UNSIGNED NOT NULL,
  `requirement_id` bigint UNSIGNED NOT NULL,
  `status` enum('pending','submitted','approved','rejected') NOT NULL DEFAULT 'pending',
  `file_path` varchar(500) DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `ojt_student_requirements`
--

INSERT INTO `ojt_student_requirements` (`id`, `ojt_id`, `requirement_id`, `status`, `file_path`, `submitted_at`, `created_at`, `updated_at`) VALUES
(1, 2, 2, 'approved', 'done', '2026-09-06 14:18:41', '2026-09-06 14:18:41', '2026-09-11 23:34:18');

-- --------------------------------------------------------

--
-- Table structure for table `organization_documents`
--

CREATE TABLE `organization_documents` (
  `document_id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `document_type` varchar(100) NOT NULL,
  `document_name` varchar(255) DEFAULT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `verified` tinyint(1) NOT NULL DEFAULT '0',
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `organization_documents`
--

INSERT INTO `organization_documents` (`document_id`, `organization_id`, `document_type`, `document_name`, `file_path`, `file_name`, `verified`, `uploaded_at`, `created_at`, `updated_at`) VALUES
(1, 1, 'sec_registration', 'SEC Certificate of Registration', '/uploads/orgs/sec_dti_file-1787565796022-976644311.docx', 'LIKHA-GAME-RPGL-IT-323.docx', 1, '2026-08-24 18:03:16', '2026-08-24 18:03:16', '2026-08-24 18:03:54'),
(2, 1, 'business_permit', 'Mayor\'s / Business Operating Permit', '/uploads/orgs/mayors_permit_file-1787565796088-671540454.docx', 'TindahanniSSIYAv2.docx', 1, '2026-08-24 18:03:16', '2026-08-24 18:03:16', '2026-08-24 18:03:54'),
(3, 1, 'bir_registration', 'BIR Form 2303 Certificate of Registration (TIN Proof)', '/uploads/orgs/bir_tin_file-1787565796161-305108801.docx', 'Sqlqueries.docx', 1, '2026-08-24 18:03:16', '2026-08-24 18:03:16', '2026-08-24 18:03:54'),
(4, 1, 'dole_registration', 'DOLE Registration / Internship Clearance', '/uploads/orgs/dole_file-1787565796161-936894779.docx', 'OJTConnect PH TITLE PROPOSAL.docx', 1, '2026-08-24 18:03:16', '2026-08-24 18:03:16', '2026-08-24 18:03:54'),
(5, 2, 'sec_registration', 'SEC Certificate of Registration', '/uploads/orgs/sec_dti_file-1787583140706-627520652.docx', 'Blood Map PH.docx', 1, '2026-08-24 22:52:21', '2026-08-24 22:52:21', '2026-08-24 22:52:46'),
(6, 2, 'business_permit', 'Mayor\'s / Business Operating Permit', '/uploads/orgs/mayors_permit_file-1787583140708-710707222.docx', 'database_project final.docx', 1, '2026-08-24 22:52:21', '2026-08-24 22:52:21', '2026-08-24 22:52:46'),
(7, 2, 'bir_registration', 'BIR Form 2303 Certificate of Registration (TIN Proof)', '/uploads/orgs/bir_tin_file-1787583140709-591089190.docx', 'database_project final.docx', 1, '2026-08-24 22:52:21', '2026-08-24 22:52:21', '2026-08-24 22:52:46'),
(8, 2, 'dole_registration', 'DOLE Registration / Internship Clearance', '/uploads/orgs/dole_file-1787583140713-621744483.docx', 'AI_TITLE_PROPOSAL_-_IT_323.docx', 1, '2026-08-24 22:52:21', '2026-08-24 22:52:21', '2026-08-24 22:52:46'),
(9, 3, 'sec_registration', 'SEC Certificate of Registration', '/uploads/orgs/sec_dti_file-1787583263597-263969218.docx', 'diagram_arch.docx', 1, '2026-08-24 22:54:23', '2026-08-24 22:54:23', '2026-08-24 22:55:07'),
(10, 3, 'business_permit', 'Mayor\'s / Business Operating Permit', '/uploads/orgs/mayors_permit_file-1787583263598-423068129.docx', 'database_project final.docx', 1, '2026-08-24 22:54:23', '2026-08-24 22:54:23', '2026-08-24 22:55:07'),
(11, 3, 'bir_registration', 'BIR Form 2303 Certificate of Registration (TIN Proof)', '/uploads/orgs/bir_tin_file-1787583263599-319902002.docx', 'ojt123.docx', 1, '2026-08-24 22:54:23', '2026-08-24 22:54:23', '2026-08-24 22:55:07'),
(15, 5, 'sec_registration', 'SEC Certificate of Registration', '/uploads/orgs/sec_dti_file-1788643474429-707460880.docx', 'chapter1.docx', 1, '2026-09-06 05:24:34', '2026-09-06 05:24:34', '2026-09-06 05:30:33'),
(16, 5, 'business_permit', 'Mayor\'s / Business Operating Permit', '/uploads/orgs/mayors_permit_file-1788643474433-792143349.docx', 'chapter2.docx', 1, '2026-09-06 05:24:34', '2026-09-06 05:24:34', '2026-09-06 05:30:33'),
(17, 5, 'bir_registration', 'BIR Form 2303 Certificate of Registration (TIN Proof)', '/uploads/orgs/bir_tin_file-1788643474434-359009998.docx', 'chapter3.docx', 1, '2026-09-06 05:24:34', '2026-09-06 05:24:34', '2026-09-06 05:30:33'),
(18, 5, 'dole_registration', 'DOLE Registration / Internship Clearance', '/uploads/orgs/dole_file-1788643474439-49281790.docx', 'InternConPH_Chapters_1_to_3_Complete.docx', 1, '2026-09-06 05:24:34', '2026-09-06 05:24:34', '2026-09-06 05:30:33'),
(19, 6, 'sec_registration', 'SEC Certificate of Registration', '/uploads/orgs/sec_dti_file-1788644015991-937170353.docx', 'guide_chaper1.docx', 1, '2026-09-06 05:33:36', '2026-09-06 05:33:36', '2026-09-06 05:34:01'),
(20, 6, 'business_permit', 'Mayor\'s / Business Operating Permit', '/uploads/orgs/mayors_permit_file-1788644015994-197879770.docx', 'guide_chaper2.docx', 1, '2026-09-06 05:33:36', '2026-09-06 05:33:36', '2026-09-06 05:34:01'),
(21, 6, 'bir_registration', 'BIR Form 2303 Certificate of Registration (TIN Proof)', '/uploads/orgs/bir_tin_file-1788644015995-93713616.docx', 'guide_chaper3.docx', 1, '2026-09-06 05:33:36', '2026-09-06 05:33:36', '2026-09-06 05:34:01'),
(22, 6, 'dole_registration', 'DOLE Registration / Internship Clearance', '/uploads/orgs/dole_file-1788644016051-304075051.docx', 'Chap 2 (checking).docx', 1, '2026-09-06 05:33:36', '2026-09-06 05:33:36', '2026-09-06 05:34:01'),
(23, 7, 'sec_registration', 'SEC Certificate of Registration', '/uploads/orgs/sec_dti_file-1788644759566-774886438.docx', 'chapter1.docx', 1, '2026-09-06 05:45:59', '2026-09-06 05:45:59', '2026-09-06 05:46:21'),
(24, 7, 'business_permit', 'Mayor\'s / Business Operating Permit', '/uploads/orgs/mayors_permit_file-1788644759567-341287679.docx', 'JOB-READINESS - READY FOR PRINT.docx', 1, '2026-09-06 05:45:59', '2026-09-06 05:45:59', '2026-09-06 05:46:21'),
(25, 7, 'bir_registration', 'BIR Form 2303 Certificate of Registration (TIN Proof)', '/uploads/orgs/bir_tin_file-1788644759569-160319652.docx', 'OJT_JOB hunt SYSTEM.docx', 1, '2026-09-06 05:45:59', '2026-09-06 05:45:59', '2026-09-06 05:46:21'),
(26, 7, 'dole_registration', 'DOLE Registration / Internship Clearance', '/uploads/orgs/dole_file-1788644759569-304155374.docx', 'Battery report.docx', 1, '2026-09-06 05:45:59', '2026-09-06 05:45:59', '2026-09-06 05:46:21');

-- --------------------------------------------------------

--
-- Table structure for table `organization_registrations`
--

CREATE TABLE `organization_registrations` (
  `registration_id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `submitted_by` bigint UNSIGNED NOT NULL,
  `status` enum('pending','under_review','approved','rejected') NOT NULL DEFAULT 'pending',
  `reviewed_by` bigint UNSIGNED DEFAULT NULL,
  `review_notes` text,
  `submitted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `organization_registrations`
--

INSERT INTO `organization_registrations` (`registration_id`, `organization_id`, `submitted_by`, `status`, `reviewed_by`, `review_notes`, `submitted_at`, `reviewed_at`, `created_at`, `updated_at`) VALUES
(5, 5, 45, 'approved', NULL, NULL, '2026-09-06 05:24:34', '2026-09-06 05:30:33', '2026-09-06 05:24:34', '2026-09-06 05:30:33'),
(6, 6, 46, 'approved', NULL, NULL, '2026-09-06 05:33:36', '2026-09-06 05:34:01', '2026-09-06 05:33:36', '2026-09-06 05:34:01'),
(7, 7, 51, 'approved', NULL, NULL, '2026-09-06 05:45:59', '2026-09-06 05:46:21', '2026-09-06 05:45:59', '2026-09-06 05:46:21');

-- --------------------------------------------------------

--
-- Table structure for table `organization_staff`
--

CREATE TABLE `organization_staff` (
  `org_staff_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `program_id` bigint UNSIGNED DEFAULT NULL,
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
  `years_of_experience` int UNSIGNED DEFAULT '1',
  `contact_number` varchar(50) DEFAULT NULL,
  `passcode_used` varchar(64) DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT '0',
  `rejection_reason` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `organization_staff`
--

INSERT INTO `organization_staff` (`org_staff_id`, `user_id`, `organization_id`, `program_id`, `staff_number`, `title`, `first_name`, `middle_name`, `last_name`, `suffix`, `position`, `job_title`, `department`, `work_location`, `years_of_experience`, `contact_number`, `passcode_used`, `is_verified`, `rejection_reason`, `created_at`, `updated_at`) VALUES
(6, 55, 6, NULL, 'EMP-03', 'Ms.', 'Mycha', 'Maldita', 'Lingco', NULL, 'workplace_mentor', 'MIS', 'BS Information Technology', 'Security Office', 3, '09874156969', 'WM-I5S0J', 1, NULL, '2026-09-06 14:07:50', '2026-09-06 14:08:05');

-- --------------------------------------------------------

--
-- Table structure for table `organization_status_history`
--

CREATE TABLE `organization_status_history` (
  `history_id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `old_status` varchar(30) DEFAULT NULL,
  `new_status` varchar(30) NOT NULL,
  `changed_by` bigint UNSIGNED NOT NULL,
  `reason` text,
  `changed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `organization_suspensions`
--

CREATE TABLE `organization_suspensions` (
  `suspension_id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `complaint_id` bigint UNSIGNED DEFAULT NULL,
  `issued_by` bigint UNSIGNED NOT NULL,
  `reason` text NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `organization_suspensions`
--

INSERT INTO `organization_suspensions` (`suspension_id`, `organization_id`, `complaint_id`, `issued_by`, `reason`, `start_date`, `end_date`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 6, 3, 1, 'namia kugon oi bata paka', '2026-09-06', '2026-09-07', 1, '2026-09-06 15:24:37', '2026-09-06 15:24:37'),
(2, 6, 4, 1, '123', '2026-09-06', '2026-09-07', 1, '2026-09-06 16:31:50', '2026-09-06 16:31:50');

-- --------------------------------------------------------

--
-- Table structure for table `organization_warnings`
--

CREATE TABLE `organization_warnings` (
  `warning_id` bigint UNSIGNED NOT NULL,
  `organization_id` bigint UNSIGNED NOT NULL,
  `complaint_id` bigint UNSIGNED DEFAULT NULL,
  `issued_by` bigint UNSIGNED NOT NULL,
  `reason` text NOT NULL,
  `issued_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `organization_warnings`
--

INSERT INTO `organization_warnings` (`warning_id`, `organization_id`, `complaint_id`, `issued_by`, `reason`, `issued_at`, `created_at`, `updated_at`) VALUES
(1, 6, 1, 1, 'bantay mo liwat pa', '2026-09-06 15:23:57', '2026-09-06 15:23:57', '2026-09-06 15:23:57');

-- --------------------------------------------------------

--
-- Table structure for table `portfolio_items`
--

CREATE TABLE `portfolio_items` (
  `item_id` bigint UNSIGNED NOT NULL,
  `portfolio_id` bigint UNSIGNED NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text,
  `file_path` varchar(500) DEFAULT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_size` int UNSIGNED DEFAULT NULL,
  `item_type` varchar(50) NOT NULL DEFAULT 'academic_portfolio',
  `sub_category` varchar(100) DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT '0',
  `associated_org_id` bigint UNSIGNED DEFAULT NULL,
  `associated_job_id` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `portfolio_items`
--

INSERT INTO `portfolio_items` (`item_id`, `portfolio_id`, `title`, `description`, `file_path`, `file_name`, `file_size`, `item_type`, `sub_category`, `is_verified`, `associated_org_id`, `associated_job_id`, `created_at`, `updated_at`) VALUES
(1, 1, 'ada', 'asd', 'portfolio_upload.pdf', NULL, NULL, 'credential', NULL, 0, NULL, NULL, '2026-08-29 22:10:29', '2026-09-08 07:03:26'),
(70, 4, 'Smart Attendance & OJT Tracking System', 'Comprehensive capstone platform for biometric attendance, GPS geofencing, and real-time mentor logs built with React and Node.js.', '/uploads/portfolio/capstone_smart_ojt_tracking.pdf', 'capstone_smart_ojt_tracking.pdf', 2450000, 'academic_portfolio', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(71, 4, 'Enterprise Inventory & Resource Planner', 'High-performance web dashboard with automated analytics, barcode scanning, and supply tracking.', '/uploads/portfolio/project_ui_preview.png', 'project_ui_preview.png', 850000, 'project', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(72, 4, 'AWS Certified Cloud Practitioner', 'Industry cloud computing certification demonstrating proficiency in cloud infrastructure, security, and deployment.', '/uploads/portfolio/aws_cloud_practitioner_cert.pdf', 'aws_cloud_practitioner_cert.pdf', 1420000, 'certificate', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(73, 4, 'Full-Stack Web Development Specialization', 'Verified diploma certification in modern JavaScript, React ecosystem, and relational database management.', '/uploads/portfolio/fullstack_webdev_cert.pdf', 'fullstack_webdev_cert.pdf', 1150000, 'credential', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(74, 4, 'Official Transcript of Records (TOR)', 'Certified true copy of academic grades from 1st Year to 3rd Year with general weighted average (GWA) of 1.35.', '/uploads/portfolio/official_transcript_of_records.pdf', 'official_transcript_of_records.pdf', 1850000, 'transcript', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(75, 4, 'Certificate of Registration (COR - 2026)', 'Official proof of current collegiate enrollment in Bachelor of Science in Information Technology.', '/uploads/portfolio/certificate_of_registration_cor.pdf', 'certificate_of_registration_cor.pdf', 980000, 'cor', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(76, 3, 'Smart Attendance & OJT Tracking System', 'Comprehensive capstone platform for biometric attendance, GPS geofencing, and real-time mentor logs built with React and Node.js.', '/uploads/portfolio/capstone_smart_ojt_tracking.pdf', 'capstone_smart_ojt_tracking.pdf', 2450000, 'academic_portfolio', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(77, 3, 'Enterprise Inventory & Resource Planner', 'High-performance web dashboard with automated analytics, barcode scanning, and supply tracking.', '/uploads/portfolio/project_ui_preview.png', 'project_ui_preview.png', 850000, 'project', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(78, 3, 'AWS Certified Cloud Practitioner', 'Industry cloud computing certification demonstrating proficiency in cloud infrastructure, security, and deployment.', '/uploads/portfolio/aws_cloud_practitioner_cert.pdf', 'aws_cloud_practitioner_cert.pdf', 1420000, 'certificate', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(79, 3, 'Full-Stack Web Development Specialization', 'Verified diploma certification in modern JavaScript, React ecosystem, and relational database management.', '/uploads/portfolio/fullstack_webdev_cert.pdf', 'fullstack_webdev_cert.pdf', 1150000, 'credential', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(80, 3, 'Official Transcript of Records (TOR)', 'Certified true copy of academic grades from 1st Year to 3rd Year with general weighted average (GWA) of 1.35.', '/uploads/portfolio/official_transcript_of_records.pdf', 'official_transcript_of_records.pdf', 1850000, 'transcript', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(81, 3, 'Certificate of Registration (COR - 2026)', 'Official proof of current collegiate enrollment in Bachelor of Science in Information Technology.', '/uploads/portfolio/certificate_of_registration_cor.pdf', 'certificate_of_registration_cor.pdf', 980000, 'cor', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(82, 5, 'Smart Attendance & OJT Tracking System', 'Comprehensive capstone platform for biometric attendance, GPS geofencing, and real-time mentor logs built with React and Node.js.', '/uploads/portfolio/capstone_smart_ojt_tracking.pdf', 'capstone_smart_ojt_tracking.pdf', 2450000, 'academic_portfolio', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(83, 5, 'Enterprise Inventory & Resource Planner', 'High-performance web dashboard with automated analytics, barcode scanning, and supply tracking.', '/uploads/portfolio/project_ui_preview.png', 'project_ui_preview.png', 850000, 'project', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(84, 5, 'AWS Certified Cloud Practitioner', 'Industry cloud computing certification demonstrating proficiency in cloud infrastructure, security, and deployment.', '/uploads/portfolio/aws_cloud_practitioner_cert.pdf', 'aws_cloud_practitioner_cert.pdf', 1420000, 'certificate', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(85, 5, 'Full-Stack Web Development Specialization', 'Verified diploma certification in modern JavaScript, React ecosystem, and relational database management.', '/uploads/portfolio/fullstack_webdev_cert.pdf', 'fullstack_webdev_cert.pdf', 1150000, 'credential', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(86, 5, 'Official Transcript of Records (TOR)', 'Certified true copy of academic grades from 1st Year to 3rd Year with general weighted average (GWA) of 1.35.', '/uploads/portfolio/official_transcript_of_records.pdf', 'official_transcript_of_records.pdf', 1850000, 'transcript', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(87, 5, 'Certificate of Registration (COR - 2026)', 'Official proof of current collegiate enrollment in Bachelor of Science in Information Technology.', '/uploads/portfolio/certificate_of_registration_cor.pdf', 'certificate_of_registration_cor.pdf', 980000, 'cor', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(88, 6, 'Smart Attendance & OJT Tracking System', 'Comprehensive capstone platform for biometric attendance, GPS geofencing, and real-time mentor logs built with React and Node.js.', '/uploads/portfolio/capstone_smart_ojt_tracking.pdf', 'capstone_smart_ojt_tracking.pdf', 2450000, 'academic_portfolio', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(89, 6, 'Enterprise Inventory & Resource Planner', 'High-performance web dashboard with automated analytics, barcode scanning, and supply tracking.', '/uploads/portfolio/project_ui_preview.png', 'project_ui_preview.png', 850000, 'project', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(90, 6, 'AWS Certified Cloud Practitioner', 'Industry cloud computing certification demonstrating proficiency in cloud infrastructure, security, and deployment.', '/uploads/portfolio/aws_cloud_practitioner_cert.pdf', 'aws_cloud_practitioner_cert.pdf', 1420000, 'certificate', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(91, 6, 'Full-Stack Web Development Specialization', 'Verified diploma certification in modern JavaScript, React ecosystem, and relational database management.', '/uploads/portfolio/fullstack_webdev_cert.pdf', 'fullstack_webdev_cert.pdf', 1150000, 'credential', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(92, 6, 'Official Transcript of Records (TOR)', 'Certified true copy of academic grades from 1st Year to 3rd Year with general weighted average (GWA) of 1.35.', '/uploads/portfolio/official_transcript_of_records.pdf', 'official_transcript_of_records.pdf', 1850000, 'transcript', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(93, 6, 'Certificate of Registration (COR - 2026)', 'Official proof of current collegiate enrollment in Bachelor of Science in Information Technology.', '/uploads/portfolio/certificate_of_registration_cor.pdf', 'certificate_of_registration_cor.pdf', 980000, 'cor', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(94, 7, 'Smart Attendance & OJT Tracking System', 'Comprehensive capstone platform for biometric attendance, GPS geofencing, and real-time mentor logs built with React and Node.js.', '/uploads/portfolio/capstone_smart_ojt_tracking.pdf', 'capstone_smart_ojt_tracking.pdf', 2450000, 'academic_portfolio', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(95, 7, 'Enterprise Inventory & Resource Planner', 'High-performance web dashboard with automated analytics, barcode scanning, and supply tracking.', '/uploads/portfolio/project_ui_preview.png', 'project_ui_preview.png', 850000, 'project', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(96, 7, 'AWS Certified Cloud Practitioner', 'Industry cloud computing certification demonstrating proficiency in cloud infrastructure, security, and deployment.', '/uploads/portfolio/aws_cloud_practitioner_cert.pdf', 'aws_cloud_practitioner_cert.pdf', 1420000, 'certificate', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(97, 7, 'Full-Stack Web Development Specialization', 'Verified diploma certification in modern JavaScript, React ecosystem, and relational database management.', '/uploads/portfolio/fullstack_webdev_cert.pdf', 'fullstack_webdev_cert.pdf', 1150000, 'credential', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(98, 7, 'Official Transcript of Records (TOR)', 'Certified true copy of academic grades from 1st Year to 3rd Year with general weighted average (GWA) of 1.35.', '/uploads/portfolio/official_transcript_of_records.pdf', 'official_transcript_of_records.pdf', 1850000, 'transcript', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(99, 7, 'Certificate of Registration (COR - 2026)', 'Official proof of current collegiate enrollment in Bachelor of Science in Information Technology.', '/uploads/portfolio/certificate_of_registration_cor.pdf', 'certificate_of_registration_cor.pdf', 980000, 'cor', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(100, 8, 'Smart Attendance & OJT Tracking System', 'Comprehensive capstone platform for biometric attendance, GPS geofencing, and real-time mentor logs built with React and Node.js.', '/uploads/portfolio/capstone_smart_ojt_tracking.pdf', 'capstone_smart_ojt_tracking.pdf', 2450000, 'academic_portfolio', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(101, 8, 'Enterprise Inventory & Resource Planner', 'High-performance web dashboard with automated analytics, barcode scanning, and supply tracking.', '/uploads/portfolio/project_ui_preview.png', 'project_ui_preview.png', 850000, 'project', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(102, 8, 'AWS Certified Cloud Practitioner', 'Industry cloud computing certification demonstrating proficiency in cloud infrastructure, security, and deployment.', '/uploads/portfolio/aws_cloud_practitioner_cert.pdf', 'aws_cloud_practitioner_cert.pdf', 1420000, 'certificate', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(103, 8, 'Full-Stack Web Development Specialization', 'Verified diploma certification in modern JavaScript, React ecosystem, and relational database management.', '/uploads/portfolio/fullstack_webdev_cert.pdf', 'fullstack_webdev_cert.pdf', 1150000, 'credential', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(104, 8, 'Official Transcript of Records (TOR)', 'Certified true copy of academic grades from 1st Year to 3rd Year with general weighted average (GWA) of 1.35.', '/uploads/portfolio/official_transcript_of_records.pdf', 'official_transcript_of_records.pdf', 1850000, 'transcript', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(105, 8, 'Certificate of Registration (COR - 2026)', 'Official proof of current collegiate enrollment in Bachelor of Science in Information Technology.', '/uploads/portfolio/certificate_of_registration_cor.pdf', 'certificate_of_registration_cor.pdf', 980000, 'cor', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(106, 9, 'Smart Attendance & OJT Tracking System', 'Comprehensive capstone platform for biometric attendance, GPS geofencing, and real-time mentor logs built with React and Node.js.', '/uploads/portfolio/capstone_smart_ojt_tracking.pdf', 'capstone_smart_ojt_tracking.pdf', 2450000, 'academic_portfolio', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(107, 9, 'Enterprise Inventory & Resource Planner', 'High-performance web dashboard with automated analytics, barcode scanning, and supply tracking.', '/uploads/portfolio/project_ui_preview.png', 'project_ui_preview.png', 850000, 'project', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(108, 9, 'AWS Certified Cloud Practitioner', 'Industry cloud computing certification demonstrating proficiency in cloud infrastructure, security, and deployment.', '/uploads/portfolio/aws_cloud_practitioner_cert.pdf', 'aws_cloud_practitioner_cert.pdf', 1420000, 'certificate', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(109, 9, 'Full-Stack Web Development Specialization', 'Verified diploma certification in modern JavaScript, React ecosystem, and relational database management.', '/uploads/portfolio/fullstack_webdev_cert.pdf', 'fullstack_webdev_cert.pdf', 1150000, 'credential', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(110, 9, 'Official Transcript of Records (TOR)', 'Certified true copy of academic grades from 1st Year to 3rd Year with general weighted average (GWA) of 1.35.', '/uploads/portfolio/official_transcript_of_records.pdf', 'official_transcript_of_records.pdf', 1850000, 'transcript', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(111, 9, 'Certificate of Registration (COR - 2026)', 'Official proof of current collegiate enrollment in Bachelor of Science in Information Technology.', '/uploads/portfolio/certificate_of_registration_cor.pdf', 'certificate_of_registration_cor.pdf', 980000, 'cor', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(112, 10, 'Smart Attendance & OJT Tracking System', 'Comprehensive capstone platform for biometric attendance, GPS geofencing, and real-time mentor logs built with React and Node.js.', '/uploads/portfolio/capstone_smart_ojt_tracking.pdf', 'capstone_smart_ojt_tracking.pdf', 2450000, 'academic_portfolio', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(113, 10, 'Enterprise Inventory & Resource Planner', 'High-performance web dashboard with automated analytics, barcode scanning, and supply tracking.', '/uploads/portfolio/project_ui_preview.png', 'project_ui_preview.png', 850000, 'project', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(114, 10, 'AWS Certified Cloud Practitioner', 'Industry cloud computing certification demonstrating proficiency in cloud infrastructure, security, and deployment.', '/uploads/portfolio/aws_cloud_practitioner_cert.pdf', 'aws_cloud_practitioner_cert.pdf', 1420000, 'certificate', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(115, 10, 'Full-Stack Web Development Specialization', 'Verified diploma certification in modern JavaScript, React ecosystem, and relational database management.', '/uploads/portfolio/fullstack_webdev_cert.pdf', 'fullstack_webdev_cert.pdf', 1150000, 'credential', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(116, 10, 'Official Transcript of Records (TOR)', 'Certified true copy of academic grades from 1st Year to 3rd Year with general weighted average (GWA) of 1.35.', '/uploads/portfolio/official_transcript_of_records.pdf', 'official_transcript_of_records.pdf', 1850000, 'transcript', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(117, 10, 'Certificate of Registration (COR - 2026)', 'Official proof of current collegiate enrollment in Bachelor of Science in Information Technology.', '/uploads/portfolio/certificate_of_registration_cor.pdf', 'certificate_of_registration_cor.pdf', 980000, 'cor', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(118, 11, 'Smart Attendance & OJT Tracking System', 'Comprehensive capstone platform for biometric attendance, GPS geofencing, and real-time mentor logs built with React and Node.js.', '/uploads/portfolio/capstone_smart_ojt_tracking.pdf', 'capstone_smart_ojt_tracking.pdf', 2450000, 'academic_portfolio', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(119, 11, 'Enterprise Inventory & Resource Planner', 'High-performance web dashboard with automated analytics, barcode scanning, and supply tracking.', '/uploads/portfolio/project_ui_preview.png', 'project_ui_preview.png', 850000, 'project', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(120, 11, 'AWS Certified Cloud Practitioner', 'Industry cloud computing certification demonstrating proficiency in cloud infrastructure, security, and deployment.', '/uploads/portfolio/aws_cloud_practitioner_cert.pdf', 'aws_cloud_practitioner_cert.pdf', 1420000, 'certificate', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(121, 11, 'Full-Stack Web Development Specialization', 'Verified diploma certification in modern JavaScript, React ecosystem, and relational database management.', '/uploads/portfolio/fullstack_webdev_cert.pdf', 'fullstack_webdev_cert.pdf', 1150000, 'credential', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(122, 11, 'Official Transcript of Records (TOR)', 'Certified true copy of academic grades from 1st Year to 3rd Year with general weighted average (GWA) of 1.35.', '/uploads/portfolio/official_transcript_of_records.pdf', 'official_transcript_of_records.pdf', 1850000, 'transcript', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(123, 11, 'Certificate of Registration (COR - 2026)', 'Official proof of current collegiate enrollment in Bachelor of Science in Information Technology.', '/uploads/portfolio/certificate_of_registration_cor.pdf', 'certificate_of_registration_cor.pdf', 980000, 'cor', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(124, 2, 'Smart Attendance & OJT Tracking System', 'Comprehensive capstone platform for biometric attendance, GPS geofencing, and real-time mentor logs built with React and Node.js.', '/uploads/portfolio/capstone_smart_ojt_tracking.pdf', 'capstone_smart_ojt_tracking.pdf', 2450000, 'academic_portfolio', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(125, 2, 'Enterprise Inventory & Resource Planner', 'High-performance web dashboard with automated analytics, barcode scanning, and supply tracking.', '/uploads/portfolio/project_ui_preview.png', 'project_ui_preview.png', 850000, 'project', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(126, 2, 'AWS Certified Cloud Practitioner', 'Industry cloud computing certification demonstrating proficiency in cloud infrastructure, security, and deployment.', '/uploads/portfolio/aws_cloud_practitioner_cert.pdf', 'aws_cloud_practitioner_cert.pdf', 1420000, 'certificate', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(127, 2, 'Full-Stack Web Development Specialization', 'Verified diploma certification in modern JavaScript, React ecosystem, and relational database management.', '/uploads/portfolio/fullstack_webdev_cert.pdf', 'fullstack_webdev_cert.pdf', 1150000, 'credential', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(128, 2, 'Official Transcript of Records (TOR)', 'Certified true copy of academic grades from 1st Year to 3rd Year with general weighted average (GWA) of 1.35.', '/uploads/portfolio/official_transcript_of_records.pdf', 'official_transcript_of_records.pdf', 1850000, 'transcript', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(129, 2, 'Certificate of Registration (COR - 2026)', 'Official proof of current collegiate enrollment in Bachelor of Science in Information Technology.', '/uploads/portfolio/certificate_of_registration_cor.pdf', 'certificate_of_registration_cor.pdf', 980000, 'cor', NULL, 0, NULL, NULL, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(130, 8, 'utin', 'buang', '/uploads/portfolio/portfolio-1789141133835-657895720.png', '1307820.png', 15307345, 'project', NULL, 0, NULL, NULL, '2026-09-11 23:38:54', '2026-09-11 23:38:54'),
(131, 8, '4813319a44996bab6862dafac67846bc', '', '/uploads/portfolio/portfolio-1789141209605-351427097.jpg', '4813319a44996bab6862dafac67846bc.jpg', 63606, 'cor', NULL, 0, NULL, NULL, '2026-09-11 23:40:09', '2026-09-11 23:40:09');

-- --------------------------------------------------------

--
-- Table structure for table `programs`
--

CREATE TABLE `programs` (
  `program_id` bigint UNSIGNED NOT NULL,
  `institution_id` bigint UNSIGNED NOT NULL,
  `program_name` varchar(150) NOT NULL,
  `program_code` varchar(30) NOT NULL,
  `department` varchar(150) DEFAULT NULL,
  `required_ojt_hours` int UNSIGNED NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `programs`
--

INSERT INTO `programs` (`program_id`, `institution_id`, `program_name`, `program_code`, `department`, `required_ojt_hours`, `created_at`, `updated_at`) VALUES
(1, 1, 'BS Business Administration - Financial Management', 'BSBA-FM', 'Business & Accountancy', 800, '2026-08-24 18:08:50', '2026-08-24 18:09:15'),
(2, 1, 'BS Criminology', 'BSCRIM', 'Criminology & Public Safety', 540, '2026-08-24 18:09:28', '2026-08-24 18:09:28'),
(3, 1, 'BS Information Technology', 'BSIT', 'Information Technology & Computing', 486, '2026-08-24 18:11:14', '2026-08-24 18:11:14'),
(4, 1, 'BS Civil Engineering', 'BSCE', 'Engineering & Architecture', 240, '2026-08-24 18:11:14', '2026-08-24 18:11:14'),
(5, 1, 'BS Electrical Engineering', 'BSEE', 'Engineering & Architecture', 240, '2026-08-24 18:11:14', '2026-08-24 18:11:14'),
(6, 1, 'BS Midwifery', 'BSM', 'Health & Allied Sciences', 800, '2026-08-24 18:11:14', '2026-08-24 18:11:14'),
(7, 1, 'BS Hospitality Management', 'BSHM', 'Hospitality & Tourism', 600, '2026-08-24 18:11:14', '2026-08-24 18:11:14'),
(8, 1, 'BS Tourism Management', 'BSTM', 'Hospitality & Tourism', 600, '2026-08-24 18:11:14', '2026-08-24 18:11:14'),
(9, 1, 'BS Hotel and Restaurant Management', 'BSHRM', 'Hospitality & Tourism', 600, '2026-08-24 18:11:14', '2026-08-24 18:11:14'),
(10, 1, 'Bachelor of Elementary Education', 'BEED', 'Education & Teacher Training', 500, '2026-08-24 18:11:14', '2026-08-24 18:11:14'),
(11, 1, 'Bachelor of Secondary Education - Major in English', 'BSED-ENG', 'Education & Teacher Training', 500, '2026-08-24 18:11:14', '2026-08-24 18:11:14'),
(12, 1, 'Bachelor of Secondary Education - Major in Mathematics', 'BSED-MATH', 'Education & Teacher Training', 500, '2026-08-24 18:11:14', '2026-08-24 18:11:14'),
(13, 1, 'Bachelor of Secondary Education - Major in Science', 'BSED-SCI', 'Education & Teacher Training', 500, '2026-08-24 18:11:14', '2026-08-24 18:11:14'),
(14, 1, 'Bachelor of Secondary Education - Major in Filipino', 'BSED-FIL', 'Education & Teacher Training', 500, '2026-08-24 18:11:14', '2026-08-24 18:11:14'),
(15, 1, 'Bachelor of Secondary Education - Major in Social Studies', 'BSED-SOCSCI', 'Education & Teacher Training', 500, '2026-08-24 18:11:14', '2026-08-24 18:11:14'),
(16, 1, 'Bachelor of Secondary Education - Major in Values Education', 'BSED-VALED', 'Education & Teacher Training', 500, '2026-08-24 18:11:14', '2026-08-24 18:11:14'),
(17, 1, 'Bachelor of Physical Education', 'BPED', 'Education & Teacher Training', 500, '2026-08-24 18:11:14', '2026-08-24 18:11:14'),
(18, 1, 'Bachelor of Special Needs Education', 'BSNED', 'Education & Teacher Training', 500, '2026-08-24 18:11:14', '2026-08-24 18:11:14'),
(19, 1, 'Bachelor of Early Childhood Education', 'BECED', 'Education & Teacher Training', 500, '2026-08-24 18:11:14', '2026-08-24 18:11:14'),
(20, 1, 'Bachelor of Technical-Vocational Teacher Education', 'BTVTED', 'Education & Teacher Training', 500, '2026-08-24 18:11:14', '2026-08-24 18:11:14'),
(21, 1, 'Bachelor of Technology and Livelihood Education', 'BTLEd', 'Education & Teacher Training', 500, '2026-08-24 18:11:14', '2026-08-24 18:11:14'),
(22, 1, 'BS Social Work', 'BSSW', 'Humanities & Social Sciences', 1000, '2026-08-24 18:11:14', '2026-08-24 18:11:14'),
(23, 4, 'BS Information Technology', 'BSIT', 'Information Technology & Computing', 486, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(24, 4, 'BS Business Administration - Financial Management', 'BSBA-FM', 'Business & Accountancy', 600, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(25, 4, 'BS Business Administration - Marketing Management', 'BSBA-MM', 'Business & Accountancy', 600, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(26, 4, 'BS Business Administration - Human Resource Management', 'BSBA-HRM', 'Business & Accountancy', 600, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(27, 4, 'BS Business Administration - Operations Management', 'BSBA-OM', 'Business & Accountancy', 600, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(28, 4, 'BS Business Administration - Business Economics', 'BSBA-BE', 'Business & Accountancy', 600, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(29, 4, 'BS Civil Engineering', 'BSCE', 'Engineering & Architecture', 240, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(30, 4, 'BS Electrical Engineering', 'BSEE', 'Engineering & Architecture', 240, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(31, 4, 'BS Architecture', 'BSARCH', 'Engineering & Architecture', 300, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(32, 4, 'BS Agricultural and Biosystems Engineering', 'BSABE', 'Engineering & Architecture', 240, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(33, 4, 'BS Nursing', 'BSN', 'Health & Allied Sciences', 1000, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(34, 4, 'BS Hospitality Management', 'BSHM', 'Hospitality & Tourism', 600, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(35, 4, 'BS Tourism Management', 'BSTM', 'Hospitality & Tourism', 600, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(36, 4, 'BS Hotel and Restaurant Management', 'BSHRM', 'Hospitality & Tourism', 600, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(37, 4, 'Bachelor of Elementary Education', 'BEED', 'Education & Teacher Training', 500, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(38, 4, 'Bachelor of Secondary Education - Major in English', 'BSED-ENG', 'Education & Teacher Training', 500, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(39, 4, 'Bachelor of Secondary Education - Major in Mathematics', 'BSED-MATH', 'Education & Teacher Training', 500, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(40, 4, 'Bachelor of Secondary Education - Major in Science', 'BSED-SCI', 'Education & Teacher Training', 500, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(41, 4, 'Bachelor of Secondary Education - Major in Filipino', 'BSED-FIL', 'Education & Teacher Training', 500, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(42, 4, 'Bachelor of Secondary Education - Major in Social Studies', 'BSED-SOCSCI', 'Education & Teacher Training', 500, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(43, 4, 'Bachelor of Secondary Education - Major in Values Education', 'BSED-VALED', 'Education & Teacher Training', 500, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(44, 4, 'Bachelor of Physical Education', 'BPED', 'Education & Teacher Training', 500, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(45, 4, 'Bachelor of Special Needs Education', 'BSNED', 'Education & Teacher Training', 500, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(46, 4, 'Bachelor of Early Childhood Education', 'BECED', 'Education & Teacher Training', 500, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(47, 4, 'Bachelor of Technical-Vocational Teacher Education', 'BTVTED', 'Education & Teacher Training', 500, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(48, 4, 'Bachelor of Technology and Livelihood Education', 'BTLEd', 'Education & Teacher Training', 500, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(49, 4, 'BS Social Work', 'BSSW', 'Humanities & Social Sciences', 1000, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(50, 4, 'BS Criminology', 'BSCRIM', 'Criminology & Public Safety', 540, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(51, 4, 'BS Agriculture', 'BSAGRI', 'Agriculture & Environment', 300, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(52, 4, 'BS Fisheries', 'BSFI', 'Agriculture & Environment', 300, '2026-09-06 03:10:08', '2026-09-06 03:10:08'),
(53, 5, 'BS in Information Technology', 'BSIT', 'College of Computer Studies', 600, '2026-09-11 19:06:37', '2026-09-11 19:06:37'),
(54, 5, 'BS in Computer Science', 'BSCS', 'College of Computer Studies', 600, '2026-09-11 19:06:37', '2026-09-11 19:06:37');

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `role_id` int UNSIGNED NOT NULL,
  `role_name` enum('system_admin','institution','institution_staff','student','hiring_organization') NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`role_id`, `role_name`, `description`, `created_at`, `updated_at`) VALUES
(1, 'system_admin', 'System Administrator', '2026-08-24 17:52:12', '2026-08-24 17:52:12'),
(2, 'institution', 'Institution Director', '2026-08-24 17:52:12', '2026-08-24 17:52:12'),
(3, 'institution_staff', 'Institution Staff', '2026-08-24 17:52:12', '2026-08-24 17:52:12'),
(4, 'student', 'Student', '2026-08-24 17:52:12', '2026-08-24 17:52:12'),
(5, 'hiring_organization', 'Hiring Organization HR', '2026-08-24 17:52:12', '2026-08-24 17:52:12');

-- --------------------------------------------------------

--
-- Table structure for table `skills`
--

CREATE TABLE `skills` (
  `skill_id` int UNSIGNED NOT NULL,
  `skill_name` varchar(100) NOT NULL,
  `category_id` int UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `skills`
--

INSERT INTO `skills` (`skill_id`, `skill_name`, `category_id`, `created_at`, `updated_at`) VALUES
(1, 'JavaScript', 1, '2026-08-29 21:46:52', '2026-08-29 21:46:52'),
(2, 'HTML/CSS', 1, '2026-08-29 21:46:54', '2026-08-29 21:46:54'),
(3, 'React.js', 1, '2026-08-29 21:46:54', '2026-08-29 21:46:54'),
(4, 'TypeScript', 1, '2026-08-29 21:46:55', '2026-08-29 21:46:55'),
(5, 'Tailwind CSS', 1, '2026-08-29 21:46:55', '2026-08-29 21:46:55'),
(6, 'Next.js', 1, '2026-08-29 21:46:56', '2026-08-29 21:46:56'),
(7, 'RESTful API Development', 1, '2026-08-29 21:46:56', '2026-08-29 21:46:56'),
(8, 'Node.js', 1, '2026-08-29 21:46:56', '2026-08-29 21:46:56'),
(9, 'SQL', 1, '2026-08-29 21:46:57', '2026-08-29 21:46:57'),
(10, 'Database Design', 1, '2026-08-29 21:46:57', '2026-08-29 21:46:57'),
(11, 'Python', 1, '2026-08-29 21:46:57', '2026-08-29 21:46:57'),
(12, 'Data Analysis', 1, '2026-08-29 21:46:58', '2026-08-29 21:46:58'),
(13, 'Git/Version Control', 1, '2026-08-29 21:47:00', '2026-08-29 21:47:00'),
(14, 'Communication', 1, '2026-08-29 21:47:01', '2026-08-29 21:47:01'),
(15, 'Project Management', 1, '2026-08-29 21:47:02', '2026-08-29 21:47:02'),
(16, 'Docker', 1, '2026-08-29 21:47:05', '2026-08-29 21:47:05'),
(17, 'Power BI', 1, '2026-08-29 21:47:06', '2026-08-29 21:47:06'),
(18, 'Pandas / NumPy', 1, '2026-08-29 21:47:06', '2026-08-29 21:47:06'),
(19, 'Machine Learning', 1, '2026-08-29 21:47:07', '2026-08-29 21:47:07'),
(20, 'MongoDB', 1, '2026-08-29 21:47:07', '2026-08-29 21:47:07'),
(21, 'AWS Cloud', 1, '2026-08-29 21:47:07', '2026-08-29 21:47:07'),
(22, 'UI/UX Design', 1, '2026-08-29 21:47:08', '2026-08-29 21:47:08'),
(23, 'Figma', 1, '2026-08-29 21:47:08', '2026-08-29 21:47:08'),
(24, 'Design Systems', 1, '2026-08-29 21:47:09', '2026-08-29 21:47:09'),
(25, 'Graphic Design', 1, '2026-08-29 21:47:09', '2026-08-29 21:47:09'),
(26, 'Adobe Photoshop', 1, '2026-08-29 21:47:09', '2026-08-29 21:47:09');

-- --------------------------------------------------------

--
-- Table structure for table `skill_categories`
--

CREATE TABLE `skill_categories` (
  `category_id` int UNSIGNED NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `skill_categories`
--

INSERT INTO `skill_categories` (`category_id`, `category_name`, `created_at`, `updated_at`) VALUES
(1, 'Technical Skills', '2026-08-29 21:39:45', '2026-08-29 21:39:45'),
(2, 'Soft Skills', '2026-08-29 21:39:45', '2026-08-29 21:39:45'),
(3, 'Design & Creative', '2026-08-29 21:39:45', '2026-08-29 21:39:45'),
(4, 'Business & Management', '2026-08-29 21:39:45', '2026-08-29 21:39:45');

-- --------------------------------------------------------

--
-- Table structure for table `skill_demand_statistics`
--

CREATE TABLE `skill_demand_statistics` (
  `stat_id` bigint UNSIGNED NOT NULL,
  `skill_id` int UNSIGNED NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `demand_count` int UNSIGNED NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `student_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `institution_id` bigint UNSIGNED NOT NULL,
  `program_id` bigint UNSIGNED NOT NULL,
  `student_number` varchar(50) NOT NULL,
  `category_id` int UNSIGNED NOT NULL,
  `classification` varchar(50) NOT NULL DEFAULT 'regular',
  `ojt_status` varchar(50) NOT NULL DEFAULT 'starting_ojt',
  `passcode_used` varchar(64) DEFAULT NULL,
  `status_id` int UNSIGNED NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `birthdate` date DEFAULT NULL,
  `gender` enum('male','female','other','prefer_not_to_say') DEFAULT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `year_level` tinyint UNSIGNED DEFAULT NULL,
  `required_ojt_hours` int UNSIGNED NOT NULL DEFAULT '0',
  `completed_ojt_hours` int UNSIGNED NOT NULL DEFAULT '0',
  `is_verified` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`student_id`, `user_id`, `institution_id`, `program_id`, `student_number`, `category_id`, `classification`, `ojt_status`, `passcode_used`, `status_id`, `first_name`, `middle_name`, `last_name`, `birthdate`, `gender`, `contact_number`, `address`, `year_level`, `required_ojt_hours`, `completed_ojt_hours`, `is_verified`, `is_active`, `created_at`, `updated_at`) VALUES
(6, 27, 4, 23, 'STU-01', 1, 'regular', 'starting_ojt', 'INST-STU-LVQ4F', 1, 'A', 'A', 'A', NULL, NULL, '09888888', NULL, NULL, 600, 0, 1, 1, '2026-09-06 03:38:06', '2026-09-06 05:10:00'),
(7, 28, 4, 23, 'STU-02', 1, 'regular', 'starting_ojt', 'INST-STU-8D4T1', 1, 'B', 'B', 'B', NULL, NULL, '098888888', NULL, NULL, 600, 0, 1, 1, '2026-09-06 03:39:06', '2026-09-06 05:10:01'),
(8, 29, 4, 23, 'STU-03', 1, 'regular', 'starting_ojt', 'INST-STU-ISE9X', 1, 'C', 'C', 'C', NULL, NULL, '0988888888', NULL, NULL, 600, 0, 1, 1, '2026-09-06 03:40:10', '2026-09-06 05:10:02'),
(9, 30, 4, 23, 'STU-04', 1, 'regular', 'starting_ojt', 'INST-STU-TGXIO', 1, 'D', 'D', 'D', NULL, NULL, '09999999', NULL, NULL, 600, 0, 1, 1, '2026-09-06 03:40:59', '2026-09-06 05:10:03'),
(10, 31, 4, 23, 'STU-05', 1, 'regular', 'starting_ojt', 'INST-STU-D1EBQ', 1, 'E', 'E', 'E', NULL, NULL, '097777777', NULL, NULL, 600, 0, 1, 1, '2026-09-06 03:41:47', '2026-09-06 05:11:15'),
(11, 32, 4, 23, 'STU-06', 1, 'regular', 'starting_ojt', 'INST-STU-GJAMC', 1, 'F', 'F', 'F', NULL, NULL, '0995678888', NULL, NULL, 600, 0, 1, 1, '2026-09-06 03:43:11', '2026-09-06 05:11:12'),
(12, 33, 4, 23, 'STU-07', 1, 'regular', 'starting_ojt', 'INST-STU-9HQDL', 1, 'G', 'G', 'G', NULL, NULL, '09876543433', NULL, NULL, 600, 0, 1, 1, '2026-09-06 03:44:42', '2026-09-06 03:53:53'),
(16, 40, 4, 23, 'STU-08', 1, 'regular', 'starting_ojt', 'INST-STU-LOQER', 1, 'H', 'H', 'H', NULL, NULL, '0987656789', NULL, NULL, 600, 0, 1, 1, '2026-09-06 03:59:50', '2026-09-06 05:11:11'),
(19, 44, 4, 23, 'STU-09', 1, 'regular', 'starting_ojt', 'INST-STU-0ZLRM', 1, 'I', 'I', 'I', NULL, NULL, '098764835', NULL, NULL, 600, 9, 1, 1, '2026-09-06 05:13:29', '2026-09-06 16:35:16'),
(20, 62, 5, 53, '2024-04197', 1, 'regular', 'starting_ojt', NULL, 2, 'Denmark', 'Nemis', 'Catolico', NULL, NULL, '09309022553', NULL, NULL, 600, 240, 1, 1, '2026-09-11 19:06:37', '2026-09-11 19:06:37'),
(33, 76, 4, 23, 'STU-2024-04179', 1, 'regular', 'starting_ojt', 'INST-BSIT-DTOQ', 1, 'Denmark', 'Nemis', 'Catolico', NULL, NULL, '09854346754', NULL, NULL, 600, 0, 0, 1, '2026-09-11 19:45:05', '2026-09-11 19:45:05'),
(34, 77, 5, 54, '2026-99012', 1, 'regular', 'starting_ojt', 'INST-BSCS-VVCZ', 1, 'Daniel', NULL, 'Padilla', NULL, NULL, NULL, NULL, NULL, 600, 0, 0, 1, '2026-09-11 19:50:40', '2026-09-11 19:50:40');

-- --------------------------------------------------------

--
-- Table structure for table `student_achievements`
--

CREATE TABLE `student_achievements` (
  `achievement_id` bigint UNSIGNED NOT NULL,
  `student_id` bigint UNSIGNED NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text,
  `date_achieved` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `student_achievements`
--

INSERT INTO `student_achievements` (`achievement_id`, `student_id`, `title`, `description`, `date_achieved`, `created_at`, `updated_at`) VALUES
(1, 19, 'test1', '123', '2026-09-09', '2026-09-08 06:37:57', '2026-09-08 06:37:57');

-- --------------------------------------------------------

--
-- Table structure for table `student_categories`
--

CREATE TABLE `student_categories` (
  `category_id` int UNSIGNED NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `student_categories`
--

INSERT INTO `student_categories` (`category_id`, `category_name`, `description`, `created_at`, `updated_at`) VALUES
(1, 'Regular', 'Standard student', '2026-08-29 21:27:51', '2026-08-29 21:27:51'),
(2, 'Regular Student', 'Standard regular student undergoing OJT', '2026-08-29 21:39:45', '2026-08-29 21:39:45'),
(3, 'Returnee (Requires Registrar Verification)', 'Returning student requiring registrar verification', '2026-08-29 21:39:45', '2026-08-29 21:39:45'),
(4, 'Transferee (Requires Registrar Verification)', 'Transferee student requiring registrar verification', '2026-08-29 21:39:45', '2026-08-29 21:39:45');

-- --------------------------------------------------------

--
-- Table structure for table `student_documents`
--

CREATE TABLE `student_documents` (
  `document_id` bigint UNSIGNED NOT NULL,
  `student_id` bigint UNSIGNED NOT NULL,
  `document_type` enum('resume','cor','good_moral','medical_certificate','waiver','other') NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `verified` tinyint(1) NOT NULL DEFAULT '0',
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `student_documents`
--

INSERT INTO `student_documents` (`document_id`, `student_id`, `document_type`, `file_path`, `verified`, `uploaded_at`, `created_at`, `updated_at`) VALUES
(1, 3, 'medical_certificate', 'awdsdcas', 0, '2026-08-29 22:10:38', '2026-08-29 22:10:38', '2026-08-29 22:10:38');

-- --------------------------------------------------------

--
-- Table structure for table `student_portfolios`
--

CREATE TABLE `student_portfolios` (
  `portfolio_id` bigint UNSIGNED NOT NULL,
  `student_id` bigint UNSIGNED NOT NULL,
  `title` varchar(200) DEFAULT NULL,
  `summary` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `student_portfolios`
--

INSERT INTO `student_portfolios` (`portfolio_id`, `student_id`, `title`, `summary`, `created_at`, `updated_at`) VALUES
(1, 3, 'Gwa', 'asda', '2026-08-29 22:09:41', '2026-08-29 22:10:18'),
(2, 19, 'My Career Portfolio', '', '2026-09-08 06:37:35', '2026-09-08 07:05:52'),
(3, 6, 'My Career Portfolio', 'Dedicated BSIT student intern portfolio showcasing capstone projects and technical credentials.', '2026-09-11 19:04:45', '2026-09-11 19:04:45'),
(4, 20, 'Denmark Catolico - Career Portfolio', 'Digital career portfolio of Denmark Catolico, showcasing capstone projects, professional credentials, and academic records.', '2026-09-11 19:06:37', '2026-09-11 19:06:37'),
(5, 7, 'B B - Career Portfolio', 'Digital career portfolio of B B, showcasing capstone projects, professional credentials, and academic records.', '2026-09-11 19:06:37', '2026-09-11 19:06:37'),
(6, 8, 'C C - Career Portfolio', 'Digital career portfolio of C C, showcasing capstone projects, professional credentials, and academic records.', '2026-09-11 19:06:37', '2026-09-11 19:06:37'),
(7, 9, 'D D - Career Portfolio', 'Digital career portfolio of D D, showcasing capstone projects, professional credentials, and academic records.', '2026-09-11 19:06:37', '2026-09-11 19:06:37'),
(8, 10, 'E E - Career Portfolio', 'Digital career portfolio of E E, showcasing capstone projects, professional credentials, and academic records.', '2026-09-11 19:06:37', '2026-09-11 19:06:37'),
(9, 11, 'F F - Career Portfolio', 'Digital career portfolio of F F, showcasing capstone projects, professional credentials, and academic records.', '2026-09-11 19:06:37', '2026-09-11 19:06:37'),
(10, 12, 'G G - Career Portfolio', 'Digital career portfolio of G G, showcasing capstone projects, professional credentials, and academic records.', '2026-09-11 19:06:37', '2026-09-11 19:06:37'),
(11, 16, 'H H - Career Portfolio', 'Digital career portfolio of H H, showcasing capstone projects, professional credentials, and academic records.', '2026-09-11 19:06:37', '2026-09-11 19:06:37');

-- --------------------------------------------------------

--
-- Table structure for table `student_registrations`
--

CREATE TABLE `student_registrations` (
  `registration_id` bigint UNSIGNED NOT NULL,
  `student_id` bigint UNSIGNED NOT NULL,
  `status` enum('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  `verified_by` bigint UNSIGNED DEFAULT NULL,
  `verification_notes` text,
  `submitted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `verified_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `student_registrations`
--

INSERT INTO `student_registrations` (`registration_id`, `student_id`, `status`, `verified_by`, `verification_notes`, `submitted_at`, `verified_at`, `created_at`, `updated_at`) VALUES
(1, 3, 'verified', 3, NULL, '2026-08-29 21:41:13', '2026-08-29 21:41:39', '2026-08-29 21:41:13', '2026-08-29 21:41:39'),
(2, 4, 'pending', NULL, 'Assigned to OJT Supervisor: Starting/Ongoing OJT Placement', '2026-09-03 09:43:15', NULL, '2026-09-03 09:43:15', '2026-09-03 09:43:15'),
(4, 6, 'verified', 35, NULL, '2026-09-06 03:38:06', '2026-09-06 05:10:00', '2026-09-06 03:38:06', '2026-09-06 05:10:00'),
(5, 7, 'verified', 35, NULL, '2026-09-06 03:39:06', '2026-09-06 05:10:01', '2026-09-06 03:39:06', '2026-09-06 05:10:01'),
(6, 8, 'verified', 35, NULL, '2026-09-06 03:40:10', '2026-09-06 05:10:02', '2026-09-06 03:40:10', '2026-09-06 05:10:02'),
(7, 9, 'verified', 35, NULL, '2026-09-06 03:40:59', '2026-09-06 05:10:03', '2026-09-06 03:40:59', '2026-09-06 05:10:03'),
(8, 10, 'verified', 35, NULL, '2026-09-06 03:41:47', '2026-09-06 05:11:15', '2026-09-06 03:41:47', '2026-09-06 05:11:15'),
(9, 11, 'verified', 35, NULL, '2026-09-06 03:43:11', '2026-09-06 05:11:12', '2026-09-06 03:43:11', '2026-09-06 05:11:12'),
(10, 12, 'verified', 35, NULL, '2026-09-06 03:44:42', '2026-09-06 03:53:53', '2026-09-06 03:44:42', '2026-09-06 03:53:53'),
(14, 16, 'verified', 35, NULL, '2026-09-06 03:59:50', '2026-09-06 05:11:11', '2026-09-06 03:59:50', '2026-09-06 05:11:11'),
(17, 19, 'verified', 35, NULL, '2026-09-06 05:13:29', '2026-09-06 05:13:42', '2026-09-06 05:13:29', '2026-09-06 05:13:42'),
(18, 20, 'verified', NULL, NULL, '2026-09-11 19:06:37', '2026-09-11 19:06:37', '2026-09-11 19:06:37', '2026-09-11 19:06:37'),
(31, 33, 'pending', NULL, 'Assigned to OJT Supervisor: Starting/Ongoing OJT Placement', '2026-09-11 19:45:05', NULL, '2026-09-11 19:45:05', '2026-09-11 19:45:05'),
(32, 34, 'pending', NULL, 'Assigned to OJT Supervisor: Starting/Ongoing OJT Placement', '2026-09-11 19:50:40', NULL, '2026-09-11 19:50:40', '2026-09-11 19:50:40');

-- --------------------------------------------------------

--
-- Table structure for table `student_resumes`
--

CREATE TABLE `student_resumes` (
  `resume_id` bigint UNSIGNED NOT NULL,
  `student_id` bigint UNSIGNED NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_size` int UNSIGNED DEFAULT NULL,
  `version` int UNSIGNED NOT NULL DEFAULT '1',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `student_resumes`
--

INSERT INTO `student_resumes` (`resume_id`, `student_id`, `file_path`, `file_name`, `file_size`, `version`, `is_active`, `created_at`, `updated_at`) VALUES
(13, 20, '/uploads/portfolio/denmark_catolico_resume_2026.pdf', 'Denmark_Catolico_Resume_2026.pdf', 450000, 1, 1, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(14, 6, '/uploads/portfolio/denmark_catolico_resume_2026.pdf', 'A_A_Resume_2026.pdf', 450000, 1, 1, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(15, 7, '/uploads/portfolio/denmark_catolico_resume_2026.pdf', 'B_B_Resume_2026.pdf', 450000, 1, 1, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(16, 8, '/uploads/portfolio/denmark_catolico_resume_2026.pdf', 'C_C_Resume_2026.pdf', 450000, 1, 1, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(17, 9, '/uploads/portfolio/denmark_catolico_resume_2026.pdf', 'D_D_Resume_2026.pdf', 450000, 1, 1, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(18, 10, '/uploads/portfolio/denmark_catolico_resume_2026.pdf', 'E_E_Resume_2026.pdf', 450000, 1, 0, '2026-09-11 19:12:48', '2026-09-11 23:39:06'),
(19, 11, '/uploads/portfolio/denmark_catolico_resume_2026.pdf', 'F_F_Resume_2026.pdf', 450000, 1, 1, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(20, 12, '/uploads/portfolio/denmark_catolico_resume_2026.pdf', 'G_G_Resume_2026.pdf', 450000, 1, 1, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(21, 16, '/uploads/portfolio/denmark_catolico_resume_2026.pdf', 'H_H_Resume_2026.pdf', 450000, 1, 1, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(22, 19, '/uploads/portfolio/denmark_catolico_resume_2026.pdf', 'I_I_Resume_2026.pdf', 450000, 1, 1, '2026-09-11 19:12:48', '2026-09-11 19:12:48'),
(23, 10, '/uploads/portfolio/portfolio-1789141146160-839299001.jpg', '4813319a44996bab6862dafac67846bc.jpg', 63606, 2, 1, '2026-09-11 23:39:06', '2026-09-11 23:39:06');

-- --------------------------------------------------------

--
-- Table structure for table `student_skills`
--

CREATE TABLE `student_skills` (
  `id` bigint UNSIGNED NOT NULL,
  `student_id` bigint UNSIGNED NOT NULL,
  `skill_id` int UNSIGNED NOT NULL,
  `proficiency_level` enum('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `student_skills`
--

INSERT INTO `student_skills` (`id`, `student_id`, `skill_id`, `proficiency_level`, `created_at`, `updated_at`) VALUES
(2, 3, 2, 'intermediate', '2026-08-29 21:46:54', '2026-08-29 21:46:54'),
(3, 3, 3, 'intermediate', '2026-08-29 21:46:55', '2026-08-29 21:46:55'),
(4, 3, 4, 'intermediate', '2026-08-29 21:46:55', '2026-08-29 21:46:55'),
(5, 3, 5, 'intermediate', '2026-08-29 21:46:55', '2026-08-29 21:46:55'),
(6, 3, 6, 'intermediate', '2026-08-29 21:46:56', '2026-08-29 21:46:56'),
(7, 3, 7, 'intermediate', '2026-08-29 21:46:56', '2026-08-29 21:46:56'),
(8, 3, 8, 'intermediate', '2026-08-29 21:46:56', '2026-08-29 21:46:56'),
(9, 3, 9, 'intermediate', '2026-08-29 21:46:57', '2026-08-29 21:46:57'),
(10, 3, 10, 'intermediate', '2026-08-29 21:46:57', '2026-08-29 21:46:57'),
(11, 3, 11, 'intermediate', '2026-08-29 21:46:57', '2026-08-29 21:46:57'),
(12, 3, 12, 'intermediate', '2026-08-29 21:46:58', '2026-08-29 21:46:58'),
(13, 3, 13, 'intermediate', '2026-08-29 21:47:00', '2026-08-29 21:47:00'),
(14, 3, 14, 'intermediate', '2026-08-29 21:47:01', '2026-08-29 21:47:01'),
(15, 3, 15, 'intermediate', '2026-08-29 21:47:02', '2026-08-29 21:47:02'),
(16, 3, 16, 'intermediate', '2026-08-29 21:47:05', '2026-08-29 21:47:05'),
(17, 3, 17, 'intermediate', '2026-08-29 21:47:06', '2026-08-29 21:47:06'),
(18, 3, 18, 'intermediate', '2026-08-29 21:47:06', '2026-08-29 21:47:06');

-- --------------------------------------------------------

--
-- Table structure for table `student_skill_recommendations`
--

CREATE TABLE `student_skill_recommendations` (
  `recommendation_id` bigint UNSIGNED NOT NULL,
  `student_id` bigint UNSIGNED NOT NULL,
  `skill_id` int UNSIGNED NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `score` decimal(5,2) DEFAULT NULL,
  `generated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_staff_assignments`
--

CREATE TABLE `student_staff_assignments` (
  `assignment_id` bigint UNSIGNED NOT NULL,
  `student_id` bigint UNSIGNED NOT NULL,
  `staff_id` bigint UNSIGNED NOT NULL,
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `student_statuses`
--

CREATE TABLE `student_statuses` (
  `status_id` int UNSIGNED NOT NULL,
  `status_name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `student_statuses`
--

INSERT INTO `student_statuses` (`status_id`, `status_name`, `description`, `created_at`, `updated_at`) VALUES
(1, 'pending', 'Pending Verification / Approval', '2026-08-29 21:39:45', '2026-08-29 21:39:45'),
(2, 'active', 'Active Enrolled Student', '2026-08-29 21:39:45', '2026-08-29 21:39:45'),
(3, 'ongoing_ojt', 'Ongoing OJT Placement', '2026-08-29 21:39:45', '2026-08-29 21:39:45'),
(4, 'completed_ojt', 'Completed OJT Requirements', '2026-08-29 21:39:45', '2026-08-29 21:39:45'),
(5, 'graduated', 'Graduated Student', '2026-08-29 21:39:45', '2026-08-29 21:39:45');

-- --------------------------------------------------------

--
-- Table structure for table `system_settings`
--

CREATE TABLE `system_settings` (
  `setting_id` bigint UNSIGNED NOT NULL,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text,
  `description` varchar(255) DEFAULT NULL,
  `updated_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` bigint UNSIGNED NOT NULL,
  `role_id` int UNSIGNED NOT NULL,
  `email` varchar(150) NOT NULL,
  `avatar_url` text,
  `display_name` varchar(150) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_verified` tinyint(1) NOT NULL DEFAULT '0',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `role_id`, `email`, `avatar_url`, `display_name`, `password_hash`, `is_active`, `is_verified`, `last_login_at`, `created_at`, `updated_at`) VALUES
(1, 1, 'admin1@g.com', '/uploads/avatars/avatar-1-1789139217358.jpg', NULL, '$2a$10$Hzww6emEOkFM.tV1alza5ezWe/Cjl5tIfubBxBwrB17eVPyIDlldu', 1, 1, '2026-09-11 22:35:46', '2026-08-24 17:52:12', '2026-09-11 23:06:57'),
(21, 2, 'president@ndmu.edu.ph', '/uploads/avatars/avatar-21-1789139836943.jpg', NULL, '$2a$10$QQ9eeOSbo0Wo5xzDmx4BRuvU2rJulHlcO1y9krOv/oTci0Ib4hiKe', 1, 1, '2026-09-11 23:34:11', '2026-09-06 03:04:01', '2026-09-11 23:34:11'),
(22, 3, 'dean@ndmu.edu.ph', NULL, NULL, '$2a$10$W6NUKI.k5Vwz/6CKbVTaQO0cePYsV57.Tj7mTQ3cW.Gbp5nDzM6U.', 1, 1, '2026-09-11 20:25:46', '2026-09-06 03:14:28', '2026-09-11 20:25:46'),
(23, 3, 'test.staff.restricted.1788636567532@testuniv.ph', NULL, NULL, '$2a$10$PhVmi7qQ8fGS.x0EyUmHv.C7beqb3Oq41wrmZ2qNsxmgcT6FPH7my', 0, 1, '2026-09-06 03:29:27', '2026-09-06 03:29:27', '2026-09-10 10:08:35'),
(27, 4, 'stu01@ndmu.edu.ph', NULL, NULL, '$2a$10$RMlaYIqqogGdl6dvo.ZGAuvnL02pFYl/3qOGznFLqL06pvXrrRlba', 1, 1, '2026-09-11 19:12:56', '2026-09-06 03:38:06', '2026-09-11 19:12:56'),
(28, 4, 'stu02@ndmu.edu.ph', NULL, NULL, '$2a$10$Vw9LYvtkwUgfuJRYjv6nDuGep1hdw9ztyKe0.fQbTL0uM6TPlQAWi', 1, 1, '2026-09-11 20:54:19', '2026-09-06 03:39:06', '2026-09-11 20:54:19'),
(29, 4, 'stu03@ndmu.edu.ph', NULL, NULL, '$2a$10$k3svTgleNk./Rcki8GY24eSdrh3HPC40Nh0Ik33BqSUKHxIbRe4Ja', 1, 1, NULL, '2026-09-06 03:40:10', '2026-09-06 05:10:02'),
(30, 4, 'stu04@ndmu.edu.ph', NULL, NULL, '$2a$10$VB0tLHJSoUbPr6NydamOdueHnAOcQci99vIjV.TFT/gpPRxtiu9x2', 1, 1, '2026-09-11 22:23:11', '2026-09-06 03:40:59', '2026-09-11 22:23:11'),
(31, 4, 'stu05@ndmu.edu.ph', '/uploads/avatars/avatar-31-1789141010767.jpg', NULL, '$2a$10$eZ5MCyqYqB.JNdWfm9TopODkiBiVY9pMoK/wPLYqCY41KptY9guye', 1, 1, '2026-09-11 23:36:25', '2026-09-06 03:41:47', '2026-09-11 23:36:50'),
(32, 4, 'stu06@ndmu.edu.ph', NULL, NULL, '$2a$10$KP5PGJuhWiJ8HO4uCe92IuOR4DT3CGZKAUQFtJHgpJs66z91ITD8m', 1, 1, NULL, '2026-09-06 03:43:11', '2026-09-06 05:11:12'),
(33, 4, 'stu07@ndmu.edu.ph', NULL, NULL, '$2a$10$rYNGdaGLJAnhBCS1lRnOaehc6mQiFV3aslkPKfc9ZSNbKzLpgbbDW', 1, 1, '2026-09-06 16:15:14', '2026-09-06 03:44:42', '2026-09-06 16:15:14'),
(35, 3, 'registrar@ndmu.edu.ph', NULL, NULL, '$2a$10$PWoGK0fRF8CzU0xDEwlIjun4lN/.Z9ERT41bAutg910kKbUzuUKIe', 1, 1, '2026-09-11 23:32:24', '2026-09-06 03:53:10', '2026-09-11 23:32:24'),
(40, 4, 'STU-08@ndmu.edu.ph', NULL, NULL, '$2a$10$sk7g9zdf45nLxnqrHrGoJOQyhc8aKlTf7WivuDAcWE4yWwDc5qfrG', 0, 1, '2026-09-06 04:00:46', '2026-09-06 03:59:50', '2026-09-06 17:54:28'),
(41, 4, 'test_pending_student_1788640066672@test.edu.ph', NULL, NULL, '$2a$10$Ankfp0o3n2q/XCyOBW2HAO3BtcWdd4iBs3pKy5yXOQ8osBAGpfpWu', 0, 0, NULL, '2026-09-06 04:27:46', '2026-09-10 10:09:07'),
(44, 4, 'stu09@ndmu.edu.ph', '/uploads/avatars/avatar-44-1789139981091.jpg', NULL, '$2a$10$VfOoAOML9ZSfu4qG.abecuJ1ZX.e5FWv12v4XgTLmlpZhD6Vf.3K6', 1, 1, '2026-09-11 23:34:45', '2026-09-06 05:13:29', '2026-09-11 23:34:45'),
(45, 5, 'HR_main@citihardware.com', NULL, NULL, '$2a$10$ryGU96urCHoQfYK2vMS1o.uZGeK8LE.HhohLRlFnnm89QmXsrgjaO', 1, 1, NULL, '2026-09-06 05:24:34', '2026-09-06 05:30:33'),
(46, 5, 'HR_main@marbelworx.com', NULL, NULL, '$2a$10$qLjR6mmEQ5LGg7g2Hh6BLehS2dtmxqAoyVDXev2Y7PFo9Z0g9FypO', 1, 1, '2026-09-11 20:26:46', '2026-09-06 05:33:36', '2026-09-11 20:26:46'),
(47, 2, 'detector@seait.com', '/uploads/avatars/avatar-47-1789139415267.jpeg', NULL, '$2a$10$D9vUJytFkn6ba4jpbqvtM.yvWgvZlQFsLKSgwnEUNOX4o1CHbCR42', 1, 1, '2026-09-11 23:15:26', '2026-09-06 05:36:49', '2026-09-11 23:15:26'),
(49, 2, 'president@gvcfi.com', NULL, NULL, '$2a$10$ZZawJXYYz2GNlyzXkR9MfuU5FHuCd.iYLgG1LuEjOY5bLOhKSYU16', 1, 1, '2026-09-11 23:19:49', '2026-09-06 05:41:57', '2026-09-11 23:19:49'),
(51, 5, 'thefarmatcarpenterhill@gmail.com', NULL, NULL, '$2a$10$7hFjoiwWxuGGk7oJHKb9jOHGL.WnRhCFfqsDeHFAo5xXPGkc3NN8W', 1, 1, NULL, '2026-09-06 05:45:59', '2026-09-06 05:46:21'),
(55, 5, 'mentor@marbelworx.com', '/uploads/avatars/avatar-55-1789140093436.jpg', NULL, '$2a$10$C7FqRetITwo24pC1Y4pTN.lVqhroWDkl1q/To.PYGVLx8v/HY4REG', 1, 1, '2026-09-11 23:25:45', '2026-09-06 14:07:50', '2026-09-11 23:25:45'),
(56, 1, 'admin@gmail.com', NULL, NULL, '$2a$10$RMlaYIqqogGdl6dvo.ZGAuvnL02pFYl/3qOGznFLqL06pvXrrRlba', 1, 1, NULL, '2026-09-11 19:01:58', '2026-09-11 19:12:48'),
(57, 1, 'admin@interncon.ph', NULL, NULL, '$2a$10$RMlaYIqqogGdl6dvo.ZGAuvnL02pFYl/3qOGznFLqL06pvXrrRlba', 1, 1, NULL, '2026-09-11 19:01:58', '2026-09-11 19:12:48'),
(58, 2, 'institution@gmail.com', NULL, NULL, '$2a$10$RMlaYIqqogGdl6dvo.ZGAuvnL02pFYl/3qOGznFLqL06pvXrrRlba', 1, 1, '2026-09-11 19:50:45', '2026-09-11 19:01:58', '2026-09-11 19:50:45'),
(59, 2, 'seait@gmail.com', NULL, NULL, '$2a$10$RMlaYIqqogGdl6dvo.ZGAuvnL02pFYl/3qOGznFLqL06pvXrrRlba', 1, 1, NULL, '2026-09-11 19:01:58', '2026-09-11 19:12:48'),
(60, 5, 'organization@gmail.com', NULL, 'HR Management Specialist', '$2a$10$t26AtMkFzmo.z76hVYrVr.j.KSec3DPRH2jLX.N3xuijPaukT6xdy', 1, 1, '2026-09-11 21:04:29', '2026-09-11 19:06:37', '2026-09-11 21:04:30'),
(61, 5, 'kcc123@gmail.com', NULL, NULL, '$2a$10$RMlaYIqqogGdl6dvo.ZGAuvnL02pFYl/3qOGznFLqL06pvXrrRlba', 1, 1, NULL, '2026-09-11 19:06:37', '2026-09-11 19:12:48'),
(62, 4, 'student@gmail.com', NULL, NULL, '$2a$10$RMlaYIqqogGdl6dvo.ZGAuvnL02pFYl/3qOGznFLqL06pvXrrRlba', 1, 1, '2026-09-11 19:12:56', '2026-09-11 19:06:37', '2026-09-11 19:12:56'),
(63, 4, 'student@interncon.ph', NULL, NULL, '$2a$10$RMlaYIqqogGdl6dvo.ZGAuvnL02pFYl/3qOGznFLqL06pvXrrRlba', 1, 1, NULL, '2026-09-11 19:06:37', '2026-09-11 19:12:48'),
(76, 4, 'denmark@ndmu.edu.ph', NULL, NULL, '$2a$10$BYo9EGFP51uWmX2oDgoNy.falYQNtSl6ngNbVb/rNI0Qq4JzL40fW', 1, 0, NULL, '2026-09-11 19:45:05', '2026-09-11 19:45:05'),
(77, 4, 'daniel.padilla.test@example.com', NULL, NULL, '$2a$10$x2G36I2qYTq4MG.VPi0OsenK2ruh9YthVt0LTA/gP7HjHXFBwyNKK', 1, 0, NULL, '2026-09-11 19:50:40', '2026-09-11 19:50:40');

-- --------------------------------------------------------

--
-- Table structure for table `user_preferences`
--

CREATE TABLE `user_preferences` (
  `preference_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `theme` varchar(20) DEFAULT 'light',
  `sound_enabled` tinyint(1) DEFAULT '1',
  `email_notifications` tinyint(1) DEFAULT '1',
  `sms_alerts` tinyint(1) DEFAULT '0',
  `ojt_updates` tinyint(1) DEFAULT '1',
  `grievance_alerts` tinyint(1) DEFAULT '1',
  `marketing_emails` tinyint(1) DEFAULT '0',
  `compact_view` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `user_preferences`
--

INSERT INTO `user_preferences` (`preference_id`, `user_id`, `theme`, `sound_enabled`, `email_notifications`, `sms_alerts`, `ojt_updates`, `grievance_alerts`, `marketing_emails`, `compact_view`, `created_at`, `updated_at`) VALUES
(1, 60, 'dark', 1, 1, 1, 1, 1, 0, 0, '2026-09-11 21:00:50', '2026-09-11 21:04:29'),
(4, 28, 'dark', 1, 1, 0, 1, 1, 0, 0, '2026-09-11 21:09:07', '2026-09-11 21:09:07'),
(5, 47, 'dark', 1, 1, 0, 1, 1, 0, 0, '2026-09-11 21:11:54', '2026-09-11 22:22:54'),
(23, 30, 'light', 1, 1, 0, 1, 1, 0, 0, '2026-09-11 22:23:20', '2026-09-11 22:29:14'),
(32, 1, 'dark', 1, 1, 0, 1, 1, 0, 0, '2026-09-11 22:35:50', '2026-09-11 22:48:00'),
(38, 21, 'light', 1, 1, 0, 1, 1, 0, 0, '2026-09-11 23:17:11', '2026-09-11 23:17:11'),
(39, 44, 'light', 1, 1, 0, 1, 1, 0, 0, '2026-09-11 23:19:30', '2026-09-11 23:19:30'),
(40, 55, 'light', 1, 1, 0, 1, 1, 0, 0, '2026-09-11 23:21:11', '2026-09-11 23:21:11'),
(41, 31, 'light', 1, 1, 0, 1, 1, 0, 0, '2026-09-11 23:36:42', '2026-09-11 23:36:42');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `access_codes`
--
ALTER TABLE `access_codes`
  ADD PRIMARY KEY (`code_id`),
  ADD UNIQUE KEY `code_hash` (`code_hash`),
  ADD KEY `idx_ac_lookup` (`code_hash`,`recipient_type`,`is_used`);

--
-- Indexes for table `accident_reports`
--
ALTER TABLE `accident_reports`
  ADD PRIMARY KEY (`accident_id`),
  ADD KEY `idx_complaint` (`complaint_id`),
  ADD KEY `idx_org` (`organization_id`),
  ADD KEY `idx_student` (`student_id`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `idx_auditlog_user` (`user_id`),
  ADD KEY `idx_auditlog_table` (`table_name`);

--
-- Indexes for table `complaints`
--
ALTER TABLE `complaints`
  ADD PRIMARY KEY (`complaint_id`),
  ADD KEY `idx_complaints_student` (`student_id`),
  ADD KEY `idx_complaints_org` (`organization_id`),
  ADD KEY `idx_complaints_status` (`status`),
  ADD KEY `fk_complaints_category` (`category_id`),
  ADD KEY `fk_complaints_job` (`job_id`),
  ADD KEY `fk_complaints_application` (`application_id`);

--
-- Indexes for table `complaint_categories`
--
ALTER TABLE `complaint_categories`
  ADD PRIMARY KEY (`category_id`),
  ADD UNIQUE KEY `uq_compcat_name` (`category_name`);

--
-- Indexes for table `complaint_evidence`
--
ALTER TABLE `complaint_evidence`
  ADD PRIMARY KEY (`evidence_id`),
  ADD KEY `idx_compevid_complaint` (`complaint_id`);

--
-- Indexes for table `complaint_reviews`
--
ALTER TABLE `complaint_reviews`
  ADD PRIMARY KEY (`review_id`),
  ADD KEY `idx_compreview_complaint` (`complaint_id`),
  ADD KEY `fk_compreview_reviewer` (`reviewed_by`);

--
-- Indexes for table `entity_registrations`
--
ALTER TABLE `entity_registrations`
  ADD PRIMARY KEY (`registration_id`);

--
-- Indexes for table `hiring_organizations`
--
ALTER TABLE `hiring_organizations`
  ADD PRIMARY KEY (`organization_id`),
  ADD KEY `idx_hiringorg_status` (`status`);

--
-- Indexes for table `institutions`
--
ALTER TABLE `institutions`
  ADD PRIMARY KEY (`institution_id`),
  ADD UNIQUE KEY `uq_institutions_code` (`institution_code`),
  ADD KEY `idx_institutions_status` (`status`);

--
-- Indexes for table `institution_documents`
--
ALTER TABLE `institution_documents`
  ADD PRIMARY KEY (`document_id`),
  ADD KEY `idx_instdoc_institution` (`institution_id`);

--
-- Indexes for table `institution_job_approvals`
--
ALTER TABLE `institution_job_approvals`
  ADD PRIMARY KEY (`approval_id`),
  ADD UNIQUE KEY `uq_job_inst_app` (`job_id`,`institution_id`);

--
-- Indexes for table `institution_registrations`
--
ALTER TABLE `institution_registrations`
  ADD PRIMARY KEY (`registration_id`),
  ADD KEY `idx_instreg_institution` (`institution_id`),
  ADD KEY `idx_instreg_status` (`status`),
  ADD KEY `fk_instreg_submitter` (`submitted_by`),
  ADD KEY `fk_instreg_reviewer` (`reviewed_by`);

--
-- Indexes for table `institution_reports`
--
ALTER TABLE `institution_reports`
  ADD PRIMARY KEY (`report_id`),
  ADD KEY `idx_inst` (`institution_id`),
  ADD KEY `idx_org` (`organization_id`),
  ADD KEY `idx_complaint` (`complaint_id`);

--
-- Indexes for table `institution_staff`
--
ALTER TABLE `institution_staff`
  ADD PRIMARY KEY (`staff_id`),
  ADD UNIQUE KEY `uq_instaff_user` (`user_id`),
  ADD KEY `idx_instaff_institution` (`institution_id`);

--
-- Indexes for table `interviews`
--
ALTER TABLE `interviews`
  ADD PRIMARY KEY (`interview_id`),
  ADD KEY `idx_interview_app` (`application_id`);

--
-- Indexes for table `job_applications`
--
ALTER TABLE `job_applications`
  ADD PRIMARY KEY (`application_id`),
  ADD UNIQUE KEY `uq_jobapp` (`job_id`,`student_id`),
  ADD KEY `idx_jobapp_student` (`student_id`),
  ADD KEY `idx_jobapp_status` (`status`);

--
-- Indexes for table `job_offers`
--
ALTER TABLE `job_offers`
  ADD PRIMARY KEY (`offer_id`),
  ADD UNIQUE KEY `uq_joboffer_app` (`application_id`);

--
-- Indexes for table `job_postings`
--
ALTER TABLE `job_postings`
  ADD PRIMARY KEY (`job_id`),
  ADD KEY `idx_jobpost_org` (`organization_id`),
  ADD KEY `idx_jobpost_status` (`status`);

--
-- Indexes for table `job_posting_reviews`
--
ALTER TABLE `job_posting_reviews`
  ADD PRIMARY KEY (`review_id`),
  ADD KEY `idx_jobreview_job` (`job_id`),
  ADD KEY `fk_jobreview_reviewer` (`reviewed_by`);

--
-- Indexes for table `job_required_programs`
--
ALTER TABLE `job_required_programs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_jobreqprog` (`job_id`,`program_id`),
  ADD KEY `fk_jobreqprog_program` (`program_id`);

--
-- Indexes for table `job_required_skills`
--
ALTER TABLE `job_required_skills`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_jobreqskill` (`job_id`,`skill_id`),
  ADD KEY `fk_jobreqskill_skill` (`skill_id`);

--
-- Indexes for table `master_programs`
--
ALTER TABLE `master_programs`
  ADD PRIMARY KEY (`master_program_id`),
  ADD UNIQUE KEY `uq_master_prog` (`program_name`,`program_code`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `idx_notif_user` (`user_id`),
  ADD KEY `idx_notif_isread` (`is_read`);

--
-- Indexes for table `ojt_attendance_logs`
--
ALTER TABLE `ojt_attendance_logs`
  ADD PRIMARY KEY (`attendance_id`),
  ADD KEY `idx_att_ojt` (`ojt_id`),
  ADD KEY `idx_att_student` (`student_id`),
  ADD KEY `idx_att_date` (`log_date`);

--
-- Indexes for table `ojt_deployment_offers`
--
ALTER TABLE `ojt_deployment_offers`
  ADD PRIMARY KEY (`offer_id`),
  ADD KEY `idx_deployoffer_student` (`student_id`),
  ADD KEY `idx_deployoffer_org` (`organization_id`),
  ADD KEY `fk_deployoffer_job` (`job_id`),
  ADD KEY `fk_deployoffer_offeredby` (`offered_by`);

--
-- Indexes for table `ojt_performance_records`
--
ALTER TABLE `ojt_performance_records`
  ADD PRIMARY KEY (`record_id`),
  ADD UNIQUE KEY `uq_ojtperf` (`ojt_id`,`evaluation_period`),
  ADD KEY `fk_ojtperf_evaluator` (`evaluator_id`);

--
-- Indexes for table `ojt_records`
--
ALTER TABLE `ojt_records`
  ADD PRIMARY KEY (`ojt_id`),
  ADD KEY `idx_ojtrec_student` (`student_id`),
  ADD KEY `idx_ojtrec_org` (`organization_id`),
  ADD KEY `idx_ojtrec_status` (`status`),
  ADD KEY `fk_ojtrec_program` (`program_id`);

--
-- Indexes for table `ojt_requirements`
--
ALTER TABLE `ojt_requirements`
  ADD PRIMARY KEY (`requirement_id`),
  ADD KEY `idx_ojtreq_institution` (`institution_id`);

--
-- Indexes for table `ojt_student_requirements`
--
ALTER TABLE `ojt_student_requirements`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_ojtstudreq` (`ojt_id`,`requirement_id`),
  ADD KEY `fk_ojtstudreq_req` (`requirement_id`);

--
-- Indexes for table `organization_documents`
--
ALTER TABLE `organization_documents`
  ADD PRIMARY KEY (`document_id`),
  ADD KEY `idx_orgdoc_org` (`organization_id`);

--
-- Indexes for table `organization_registrations`
--
ALTER TABLE `organization_registrations`
  ADD PRIMARY KEY (`registration_id`),
  ADD KEY `idx_orgreg_org` (`organization_id`),
  ADD KEY `idx_orgreg_status` (`status`),
  ADD KEY `fk_orgreg_submitter` (`submitted_by`),
  ADD KEY `fk_orgreg_reviewer` (`reviewed_by`);

--
-- Indexes for table `organization_staff`
--
ALTER TABLE `organization_staff`
  ADD PRIMARY KEY (`org_staff_id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `organization_status_history`
--
ALTER TABLE `organization_status_history`
  ADD PRIMARY KEY (`history_id`),
  ADD KEY `idx_orgstatushist_org` (`organization_id`),
  ADD KEY `fk_orgstatushist_changer` (`changed_by`);

--
-- Indexes for table `organization_suspensions`
--
ALTER TABLE `organization_suspensions`
  ADD PRIMARY KEY (`suspension_id`),
  ADD KEY `idx_orgsusp_org` (`organization_id`),
  ADD KEY `fk_orgsusp_issuer` (`issued_by`),
  ADD KEY `fk_orgsusp_complaint` (`complaint_id`);

--
-- Indexes for table `organization_warnings`
--
ALTER TABLE `organization_warnings`
  ADD PRIMARY KEY (`warning_id`),
  ADD KEY `idx_orgwarn_org` (`organization_id`),
  ADD KEY `fk_orgwarn_issuer` (`issued_by`),
  ADD KEY `fk_orgwarn_complaint` (`complaint_id`);

--
-- Indexes for table `portfolio_items`
--
ALTER TABLE `portfolio_items`
  ADD PRIMARY KEY (`item_id`),
  ADD KEY `idx_portitem_portfolio` (`portfolio_id`);

--
-- Indexes for table `programs`
--
ALTER TABLE `programs`
  ADD PRIMARY KEY (`program_id`),
  ADD UNIQUE KEY `uq_programs_inst_code` (`institution_id`,`program_code`),
  ADD KEY `idx_programs_institution` (`institution_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`role_id`),
  ADD UNIQUE KEY `uq_roles_name` (`role_name`);

--
-- Indexes for table `skills`
--
ALTER TABLE `skills`
  ADD PRIMARY KEY (`skill_id`),
  ADD UNIQUE KEY `uq_skills_name` (`skill_name`),
  ADD KEY `idx_skills_category` (`category_id`);

--
-- Indexes for table `skill_categories`
--
ALTER TABLE `skill_categories`
  ADD PRIMARY KEY (`category_id`),
  ADD UNIQUE KEY `uq_skillcat_name` (`category_name`);

--
-- Indexes for table `skill_demand_statistics`
--
ALTER TABLE `skill_demand_statistics`
  ADD PRIMARY KEY (`stat_id`),
  ADD UNIQUE KEY `uq_skilldemand` (`skill_id`,`period_start`,`period_end`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`student_id`),
  ADD UNIQUE KEY `uq_students_user` (`user_id`),
  ADD UNIQUE KEY `uq_students_inst_number` (`institution_id`,`student_number`),
  ADD KEY `idx_students_program` (`program_id`),
  ADD KEY `idx_students_category` (`category_id`),
  ADD KEY `idx_students_status` (`status_id`);

--
-- Indexes for table `student_achievements`
--
ALTER TABLE `student_achievements`
  ADD PRIMARY KEY (`achievement_id`),
  ADD KEY `idx_studach_student` (`student_id`);

--
-- Indexes for table `student_categories`
--
ALTER TABLE `student_categories`
  ADD PRIMARY KEY (`category_id`),
  ADD UNIQUE KEY `uq_studcat_name` (`category_name`);

--
-- Indexes for table `student_documents`
--
ALTER TABLE `student_documents`
  ADD PRIMARY KEY (`document_id`),
  ADD KEY `idx_studdoc_student` (`student_id`);

--
-- Indexes for table `student_portfolios`
--
ALTER TABLE `student_portfolios`
  ADD PRIMARY KEY (`portfolio_id`),
  ADD UNIQUE KEY `uq_portfolio_student` (`student_id`);

--
-- Indexes for table `student_registrations`
--
ALTER TABLE `student_registrations`
  ADD PRIMARY KEY (`registration_id`),
  ADD KEY `idx_studreg_student` (`student_id`),
  ADD KEY `idx_studreg_status` (`status`),
  ADD KEY `fk_studreg_verifier` (`verified_by`);

--
-- Indexes for table `student_resumes`
--
ALTER TABLE `student_resumes`
  ADD PRIMARY KEY (`resume_id`),
  ADD KEY `idx_resume_student` (`student_id`);

--
-- Indexes for table `student_skills`
--
ALTER TABLE `student_skills`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_studskill` (`student_id`,`skill_id`),
  ADD KEY `idx_studskill_skill` (`skill_id`);

--
-- Indexes for table `student_skill_recommendations`
--
ALTER TABLE `student_skill_recommendations`
  ADD PRIMARY KEY (`recommendation_id`),
  ADD KEY `idx_studskillrec_student` (`student_id`),
  ADD KEY `idx_studskillrec_skill` (`skill_id`);

--
-- Indexes for table `student_staff_assignments`
--
ALTER TABLE `student_staff_assignments`
  ADD PRIMARY KEY (`assignment_id`),
  ADD KEY `idx_ssa_student` (`student_id`),
  ADD KEY `idx_ssa_staff` (`staff_id`);

--
-- Indexes for table `student_statuses`
--
ALTER TABLE `student_statuses`
  ADD PRIMARY KEY (`status_id`),
  ADD UNIQUE KEY `uq_studstatus_name` (`status_name`);

--
-- Indexes for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD PRIMARY KEY (`setting_id`),
  ADD UNIQUE KEY `uq_sysset_key` (`setting_key`),
  ADD KEY `fk_sysset_updater` (`updated_by`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `uq_users_email` (`email`),
  ADD KEY `idx_users_role` (`role_id`);

--
-- Indexes for table `user_preferences`
--
ALTER TABLE `user_preferences`
  ADD PRIMARY KEY (`preference_id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `access_codes`
--
ALTER TABLE `access_codes`
  MODIFY `code_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=46;

--
-- AUTO_INCREMENT for table `accident_reports`
--
ALTER TABLE `accident_reports`
  MODIFY `accident_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `log_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `complaints`
--
ALTER TABLE `complaints`
  MODIFY `complaint_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `complaint_categories`
--
ALTER TABLE `complaint_categories`
  MODIFY `category_id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=896;

--
-- AUTO_INCREMENT for table `complaint_evidence`
--
ALTER TABLE `complaint_evidence`
  MODIFY `evidence_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `complaint_reviews`
--
ALTER TABLE `complaint_reviews`
  MODIFY `review_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `entity_registrations`
--
ALTER TABLE `entity_registrations`
  MODIFY `registration_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- AUTO_INCREMENT for table `hiring_organizations`
--
ALTER TABLE `hiring_organizations`
  MODIFY `organization_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `institutions`
--
ALTER TABLE `institutions`
  MODIFY `institution_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `institution_documents`
--
ALTER TABLE `institution_documents`
  MODIFY `document_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `institution_job_approvals`
--
ALTER TABLE `institution_job_approvals`
  MODIFY `approval_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `institution_registrations`
--
ALTER TABLE `institution_registrations`
  MODIFY `registration_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `institution_reports`
--
ALTER TABLE `institution_reports`
  MODIFY `report_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `institution_staff`
--
ALTER TABLE `institution_staff`
  MODIFY `staff_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `interviews`
--
ALTER TABLE `interviews`
  MODIFY `interview_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `job_applications`
--
ALTER TABLE `job_applications`
  MODIFY `application_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `job_offers`
--
ALTER TABLE `job_offers`
  MODIFY `offer_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `job_postings`
--
ALTER TABLE `job_postings`
  MODIFY `job_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `job_posting_reviews`
--
ALTER TABLE `job_posting_reviews`
  MODIFY `review_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `job_required_programs`
--
ALTER TABLE `job_required_programs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `job_required_skills`
--
ALTER TABLE `job_required_skills`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `master_programs`
--
ALTER TABLE `master_programs`
  MODIFY `master_program_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=860;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `notification_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=102;

--
-- AUTO_INCREMENT for table `ojt_attendance_logs`
--
ALTER TABLE `ojt_attendance_logs`
  MODIFY `attendance_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `ojt_deployment_offers`
--
ALTER TABLE `ojt_deployment_offers`
  MODIFY `offer_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ojt_performance_records`
--
ALTER TABLE `ojt_performance_records`
  MODIFY `record_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `ojt_records`
--
ALTER TABLE `ojt_records`
  MODIFY `ojt_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `ojt_requirements`
--
ALTER TABLE `ojt_requirements`
  MODIFY `requirement_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `ojt_student_requirements`
--
ALTER TABLE `ojt_student_requirements`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `organization_documents`
--
ALTER TABLE `organization_documents`
  MODIFY `document_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `organization_registrations`
--
ALTER TABLE `organization_registrations`
  MODIFY `registration_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `organization_staff`
--
ALTER TABLE `organization_staff`
  MODIFY `org_staff_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `organization_status_history`
--
ALTER TABLE `organization_status_history`
  MODIFY `history_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `organization_suspensions`
--
ALTER TABLE `organization_suspensions`
  MODIFY `suspension_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `organization_warnings`
--
ALTER TABLE `organization_warnings`
  MODIFY `warning_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `portfolio_items`
--
ALTER TABLE `portfolio_items`
  MODIFY `item_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=132;

--
-- AUTO_INCREMENT for table `programs`
--
ALTER TABLE `programs`
  MODIFY `program_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=55;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `role_id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=901;

--
-- AUTO_INCREMENT for table `skills`
--
ALTER TABLE `skills`
  MODIFY `skill_id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `skill_categories`
--
ALTER TABLE `skill_categories`
  MODIFY `category_id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=717;

--
-- AUTO_INCREMENT for table `skill_demand_statistics`
--
ALTER TABLE `skill_demand_statistics`
  MODIFY `stat_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `student_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT for table `student_achievements`
--
ALTER TABLE `student_achievements`
  MODIFY `achievement_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `student_categories`
--
ALTER TABLE `student_categories`
  MODIFY `category_id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=539;

--
-- AUTO_INCREMENT for table `student_documents`
--
ALTER TABLE `student_documents`
  MODIFY `document_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `student_portfolios`
--
ALTER TABLE `student_portfolios`
  MODIFY `portfolio_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `student_registrations`
--
ALTER TABLE `student_registrations`
  MODIFY `registration_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `student_resumes`
--
ALTER TABLE `student_resumes`
  MODIFY `resume_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `student_skills`
--
ALTER TABLE `student_skills`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `student_skill_recommendations`
--
ALTER TABLE `student_skill_recommendations`
  MODIFY `recommendation_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student_staff_assignments`
--
ALTER TABLE `student_staff_assignments`
  MODIFY `assignment_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `student_statuses`
--
ALTER TABLE `student_statuses`
  MODIFY `status_id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=896;

--
-- AUTO_INCREMENT for table `system_settings`
--
ALTER TABLE `system_settings`
  MODIFY `setting_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=78;

--
-- AUTO_INCREMENT for table `user_preferences`
--
ALTER TABLE `user_preferences`
  MODIFY `preference_id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_auditlog_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `complaints`
--
ALTER TABLE `complaints`
  ADD CONSTRAINT `fk_complaints_application` FOREIGN KEY (`application_id`) REFERENCES `job_applications` (`application_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_complaints_category` FOREIGN KEY (`category_id`) REFERENCES `complaint_categories` (`category_id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_complaints_job` FOREIGN KEY (`job_id`) REFERENCES `job_postings` (`job_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_complaints_org` FOREIGN KEY (`organization_id`) REFERENCES `hiring_organizations` (`organization_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_complaints_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `complaint_evidence`
--
ALTER TABLE `complaint_evidence`
  ADD CONSTRAINT `fk_compevid_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`complaint_id`) ON DELETE CASCADE;

--
-- Constraints for table `complaint_reviews`
--
ALTER TABLE `complaint_reviews`
  ADD CONSTRAINT `fk_compreview_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`complaint_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_compreview_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT;

--
-- Constraints for table `institution_documents`
--
ALTER TABLE `institution_documents`
  ADD CONSTRAINT `fk_instdoc_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`institution_id`) ON DELETE CASCADE;

--
-- Constraints for table `institution_registrations`
--
ALTER TABLE `institution_registrations`
  ADD CONSTRAINT `fk_instreg_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`institution_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_instreg_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_instreg_submitter` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT;

--
-- Constraints for table `institution_staff`
--
ALTER TABLE `institution_staff`
  ADD CONSTRAINT `fk_instaff_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`institution_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_instaff_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `interviews`
--
ALTER TABLE `interviews`
  ADD CONSTRAINT `fk_interview_app` FOREIGN KEY (`application_id`) REFERENCES `job_applications` (`application_id`) ON DELETE CASCADE;

--
-- Constraints for table `job_applications`
--
ALTER TABLE `job_applications`
  ADD CONSTRAINT `fk_jobapp_job` FOREIGN KEY (`job_id`) REFERENCES `job_postings` (`job_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_jobapp_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `job_offers`
--
ALTER TABLE `job_offers`
  ADD CONSTRAINT `fk_joboffer_app` FOREIGN KEY (`application_id`) REFERENCES `job_applications` (`application_id`) ON DELETE CASCADE;

--
-- Constraints for table `job_postings`
--
ALTER TABLE `job_postings`
  ADD CONSTRAINT `fk_jobpost_org` FOREIGN KEY (`organization_id`) REFERENCES `hiring_organizations` (`organization_id`) ON DELETE CASCADE;

--
-- Constraints for table `job_posting_reviews`
--
ALTER TABLE `job_posting_reviews`
  ADD CONSTRAINT `fk_jobreview_job` FOREIGN KEY (`job_id`) REFERENCES `job_postings` (`job_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_jobreview_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT;

--
-- Constraints for table `job_required_programs`
--
ALTER TABLE `job_required_programs`
  ADD CONSTRAINT `fk_jobreqprog_job` FOREIGN KEY (`job_id`) REFERENCES `job_postings` (`job_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_jobreqprog_program` FOREIGN KEY (`program_id`) REFERENCES `programs` (`program_id`) ON DELETE CASCADE;

--
-- Constraints for table `job_required_skills`
--
ALTER TABLE `job_required_skills`
  ADD CONSTRAINT `fk_jobreqskill_job` FOREIGN KEY (`job_id`) REFERENCES `job_postings` (`job_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_jobreqskill_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`skill_id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `ojt_deployment_offers`
--
ALTER TABLE `ojt_deployment_offers`
  ADD CONSTRAINT `fk_deployoffer_job` FOREIGN KEY (`job_id`) REFERENCES `job_postings` (`job_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_deployoffer_offeredby` FOREIGN KEY (`offered_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_deployoffer_org` FOREIGN KEY (`organization_id`) REFERENCES `hiring_organizations` (`organization_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_deployoffer_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `ojt_performance_records`
--
ALTER TABLE `ojt_performance_records`
  ADD CONSTRAINT `fk_ojtperf_evaluator` FOREIGN KEY (`evaluator_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_ojtperf_ojt` FOREIGN KEY (`ojt_id`) REFERENCES `ojt_records` (`ojt_id`) ON DELETE CASCADE;

--
-- Constraints for table `ojt_records`
--
ALTER TABLE `ojt_records`
  ADD CONSTRAINT `fk_ojtrec_org` FOREIGN KEY (`organization_id`) REFERENCES `hiring_organizations` (`organization_id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_ojtrec_program` FOREIGN KEY (`program_id`) REFERENCES `programs` (`program_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_ojtrec_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `ojt_requirements`
--
ALTER TABLE `ojt_requirements`
  ADD CONSTRAINT `fk_ojtreq_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`institution_id`) ON DELETE CASCADE;

--
-- Constraints for table `ojt_student_requirements`
--
ALTER TABLE `ojt_student_requirements`
  ADD CONSTRAINT `fk_ojtstudreq_ojt` FOREIGN KEY (`ojt_id`) REFERENCES `ojt_records` (`ojt_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_ojtstudreq_req` FOREIGN KEY (`requirement_id`) REFERENCES `ojt_requirements` (`requirement_id`) ON DELETE CASCADE;

--
-- Constraints for table `organization_documents`
--
ALTER TABLE `organization_documents`
  ADD CONSTRAINT `fk_orgdoc_org` FOREIGN KEY (`organization_id`) REFERENCES `hiring_organizations` (`organization_id`) ON DELETE CASCADE;

--
-- Constraints for table `organization_registrations`
--
ALTER TABLE `organization_registrations`
  ADD CONSTRAINT `fk_orgreg_org` FOREIGN KEY (`organization_id`) REFERENCES `hiring_organizations` (`organization_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_orgreg_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_orgreg_submitter` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT;

--
-- Constraints for table `organization_status_history`
--
ALTER TABLE `organization_status_history`
  ADD CONSTRAINT `fk_orgstatushist_changer` FOREIGN KEY (`changed_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_orgstatushist_org` FOREIGN KEY (`organization_id`) REFERENCES `hiring_organizations` (`organization_id`) ON DELETE CASCADE;

--
-- Constraints for table `organization_suspensions`
--
ALTER TABLE `organization_suspensions`
  ADD CONSTRAINT `fk_orgsusp_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`complaint_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_orgsusp_issuer` FOREIGN KEY (`issued_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_orgsusp_org` FOREIGN KEY (`organization_id`) REFERENCES `hiring_organizations` (`organization_id`) ON DELETE CASCADE;

--
-- Constraints for table `organization_warnings`
--
ALTER TABLE `organization_warnings`
  ADD CONSTRAINT `fk_orgwarn_complaint` FOREIGN KEY (`complaint_id`) REFERENCES `complaints` (`complaint_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_orgwarn_issuer` FOREIGN KEY (`issued_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_orgwarn_org` FOREIGN KEY (`organization_id`) REFERENCES `hiring_organizations` (`organization_id`) ON DELETE CASCADE;

--
-- Constraints for table `portfolio_items`
--
ALTER TABLE `portfolio_items`
  ADD CONSTRAINT `fk_portitem_portfolio` FOREIGN KEY (`portfolio_id`) REFERENCES `student_portfolios` (`portfolio_id`) ON DELETE CASCADE;

--
-- Constraints for table `programs`
--
ALTER TABLE `programs`
  ADD CONSTRAINT `fk_programs_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`institution_id`) ON DELETE CASCADE;

--
-- Constraints for table `skills`
--
ALTER TABLE `skills`
  ADD CONSTRAINT `fk_skills_category` FOREIGN KEY (`category_id`) REFERENCES `skill_categories` (`category_id`) ON DELETE SET NULL;

--
-- Constraints for table `skill_demand_statistics`
--
ALTER TABLE `skill_demand_statistics`
  ADD CONSTRAINT `fk_skilldemand_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`skill_id`) ON DELETE CASCADE;

--
-- Constraints for table `students`
--
ALTER TABLE `students`
  ADD CONSTRAINT `fk_students_category` FOREIGN KEY (`category_id`) REFERENCES `student_categories` (`category_id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_students_institution` FOREIGN KEY (`institution_id`) REFERENCES `institutions` (`institution_id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_students_program` FOREIGN KEY (`program_id`) REFERENCES `programs` (`program_id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_students_status` FOREIGN KEY (`status_id`) REFERENCES `student_statuses` (`status_id`) ON DELETE RESTRICT,
  ADD CONSTRAINT `fk_students_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `student_achievements`
--
ALTER TABLE `student_achievements`
  ADD CONSTRAINT `fk_studach_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `student_documents`
--
ALTER TABLE `student_documents`
  ADD CONSTRAINT `fk_studdoc_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `student_portfolios`
--
ALTER TABLE `student_portfolios`
  ADD CONSTRAINT `fk_portfolio_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `student_registrations`
--
ALTER TABLE `student_registrations`
  ADD CONSTRAINT `fk_studreg_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_studreg_verifier` FOREIGN KEY (`verified_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `student_resumes`
--
ALTER TABLE `student_resumes`
  ADD CONSTRAINT `fk_resume_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `student_skills`
--
ALTER TABLE `student_skills`
  ADD CONSTRAINT `fk_studskill_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`skill_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_studskill_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `student_skill_recommendations`
--
ALTER TABLE `student_skill_recommendations`
  ADD CONSTRAINT `fk_studskillrec_skill` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`skill_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_studskillrec_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `student_staff_assignments`
--
ALTER TABLE `student_staff_assignments`
  ADD CONSTRAINT `fk_ssa_staff` FOREIGN KEY (`staff_id`) REFERENCES `institution_staff` (`staff_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_ssa_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`student_id`) ON DELETE CASCADE;

--
-- Constraints for table `system_settings`
--
ALTER TABLE `system_settings`
  ADD CONSTRAINT `fk_sysset_updater` FOREIGN KEY (`updated_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `user_preferences`
--
ALTER TABLE `user_preferences`
  ADD CONSTRAINT `fk_user_pref_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
