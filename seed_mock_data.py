#!/usr/bin/env python3
"""
seed_mock_data.py — InternCon PH Scalability Seeder
=====================================================
Generates 500,000+ student records and all relational dependents into the
local Laragon MySQL database `interncon_ph`.

Uses Faker for realistic Filipino names/addresses. All inserts use
executemany() with batch sizes of 5,000 and FK checks disabled for speed.

Usage:
    python seed_mock_data.py

Requirements:
    pip install faker mysql-connector-python
"""

import sys
import time
import random
import string
import logging
import traceback
from datetime import datetime, timedelta, date

import mysql.connector
from mysql.connector import Error as MySQLError
from faker import Faker

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════
DB_CONFIG = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "",
    "database": "interncon_ph",
    "charset": "utf8mb4",
    "use_pure": True,
    "connection_timeout": 30,
}

TOTAL_STUDENTS       = 500_000
NEW_INSTITUTIONS     = 50
NEW_ORGANIZATIONS    = 100
NEW_MENTORS_PER_ORG  = 2       # workplace mentor users per new org
NEW_JOB_POSTINGS     = 500
COMPLAINT_PERCENT    = 0.05    # 5% of students file complaints
OJT_PERCENT          = 0.40    # 40% of students have completed OJT records
GRAD_APP_COUNT       = 50_000  # job applications from graduates
GRAD_OFFER_COUNT     = 10_000  # job offers for a subset

BATCH_SIZE           = 5_000
COMMIT_EVERY         = 5_000   # commit after this many rows

# Pre-computed bcrypt hash for password "Mock@1234"
# (avoids calling bcrypt 500K times — all mock users share this hash)
MOCK_PASSWORD_HASH = "$2a$10$MOCK.SEEDER.HASH.FOR.SCALABILITY.TEST.interncon.ph.2026xxxx"

# Faker setup
fake = Faker(["en_PH", "en_US"])
Faker.seed(42)
random.seed(42)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("seeder")

# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════
_start_time = None

def elapsed():
    return f"{time.time() - _start_time:.1f}s"

def random_ph_phone():
    return f"09{random.randint(100000000, 999999999)}"

def random_code(length=6):
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))

def random_date_between(start_year=2024, end_year=2026):
    start = date(start_year, 1, 1)
    end = date(end_year, 9, 1)
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, delta))

def random_datetime_between(start_year=2024, end_year=2026):
    d = random_date_between(start_year, end_year)
    return datetime(d.year, d.month, d.day,
                    random.randint(6, 22), random.randint(0, 59), random.randint(0, 59))

def batch_insert(cursor, sql, data, label="rows"):
    """Insert data in batches using executemany, with per-batch error handling."""
    total = len(data)
    inserted = 0
    errors = 0
    for i in range(0, total, BATCH_SIZE):
        batch = data[i:i + BATCH_SIZE]
        try:
            cursor.executemany(sql, batch)
            inserted += len(batch)
        except MySQLError as e:
            errors += len(batch)
            log.error(f"  Batch {i // BATCH_SIZE + 1} FAILED ({label}): {e}")
            log.error(f"  Sample row: {batch[0] if batch else 'N/A'}")
            cursor._connection.rollback()
            continue
        if inserted % (BATCH_SIZE * 10) == 0 or inserted == total:
            log.info(f"  {label}: {inserted:,}/{total:,} inserted [{elapsed()}]")
    cursor._connection.commit()
    if errors:
        log.warning(f"  ⚠ {label}: {errors:,} rows failed across batches")
    return inserted

# ═══════════════════════════════════════════════════════════════════════════════
# FILIPINO DATA POOLS
# ═══════════════════════════════════════════════════════════════════════════════
PH_CITIES = [
    "Koronadal City", "General Santos City", "Davao City", "Cebu City",
    "Manila", "Quezon City", "Makati City", "Pasig City", "Cagayan de Oro",
    "Zamboanga City", "Iloilo City", "Bacolod City", "Tacloban City",
    "Butuan City", "Tagum City", "Cotabato City", "Kidapawan City",
    "Digos City", "Mati City", "Panabo City", "Surigao City",
    "Pagadian City", "Ozamiz City", "Iligan City", "Valencia City",
    "Malaybalay City", "Marawi City", "Dipolog City", "Legazpi City",
    "Naga City", "Lipa City", "Batangas City", "Lucena City",
    "San Pablo City", "Tarlac City", "Baguio City", "Dagupan City",
    "San Fernando City", "Angeles City", "Olongapo City", "Cabanatuan City",
]

PH_PROVINCES = [
    "South Cotabato", "Sarangani", "Sultan Kudarat", "Davao del Sur",
    "Davao del Norte", "Cebu", "Metro Manila", "Bukidnon", "Misamis Oriental",
    "Zamboanga del Sur", "Iloilo", "Negros Occidental", "Leyte",
    "Agusan del Norte", "Lanao del Sur", "Cotabato", "Albay",
    "Camarines Sur", "Batangas", "Laguna", "Pampanga", "Pangasinan",
    "Benguet", "Tarlac", "Nueva Ecija", "Rizal", "Cavite", "Bulacan",
]

INSTITUTION_TYPES = ["university", "college", "polytechnic", "institute"]

INDUSTRIES = [
    "Information Technology", "Engineering", "Healthcare", "Education",
    "Finance & Banking", "Manufacturing", "Retail", "Hospitality",
    "Agriculture", "Construction", "Telecommunications", "Media & Communications",
    "Real Estate", "Legal Services", "Government", "Non-Profit",
    "Food & Beverage", "Transportation & Logistics", "Energy & Utilities",
    "Pharmaceutical", "Insurance", "Consulting",
]

BUSINESS_STRUCTURES = ["corporation", "partnership", "sole_proprietorship", "cooperative"]

PORTFOLIO_TITLES = [
    "Smart Attendance & OJT Tracking System",
    "Enterprise Inventory & Resource Planner",
    "E-Commerce Platform with AI Recommendation",
    "Hospital Management Information System",
    "Student Information & Enrollment System",
    "Barangay Management System",
    "Library Catalog & Borrowing System",
    "Employee Payroll & HR System",
    "Online Learning Management System",
    "Supply Chain & Logistics Tracker",
    "Point-of-Sale Inventory System",
    "Automated Grading & Records System",
    "Tourism Booking & Reservation Platform",
    "Crime Mapping & Incident Reporting Tool",
    "Agricultural Monitoring Dashboard",
]

PORTFOLIO_DESCRIPTIONS = [
    "Comprehensive platform built with React and Node.js for real-time monitoring.",
    "High-performance web dashboard with automated analytics and reporting.",
    "Full-stack application demonstrating enterprise-grade architecture.",
    "Capstone project showcasing modern web development best practices.",
    "Industry-standard solution with responsive design and API integration.",
]

CERTIFICATE_TITLES = [
    "AWS Certified Cloud Practitioner",
    "Google IT Support Professional Certificate",
    "Meta Front-End Developer Certificate",
    "IBM Data Science Professional Certificate",
    "CompTIA A+ Certification",
    "Cisco CCNA Certification",
    "Microsoft Azure Fundamentals (AZ-900)",
    "Oracle Certified Associate Java SE",
    "Full-Stack Web Development Specialization",
    "Python for Data Science (Coursera)",
]

COMPLAINT_SUBJECTS = [
    "Excessive overtime without compensation",
    "Inappropriate workplace behavior from supervisor",
    "Unsafe working conditions in the office",
    "Delayed stipend payment for 2 months",
    "Task assignments unrelated to OJT program",
    "Verbal harassment from senior employee",
    "Required to work on holidays without notice",
    "No proper safety equipment provided",
    "Mentor unavailable for guidance",
    "Unreasonable workload expectations",
]

JOB_TITLES = [
    "Frontend Developer Intern", "Backend Developer Intern",
    "Full-Stack Developer Intern", "UI/UX Design Intern",
    "Data Analytics Intern", "Network Administration Intern",
    "IT Support Intern", "Software QA Intern",
    "Database Administrator Intern", "Mobile App Developer Intern",
    "Cybersecurity Intern", "Cloud Computing Intern",
    "Business Analyst Intern", "Digital Marketing Intern",
    "Project Management Intern", "Technical Writer Intern",
    "Systems Administrator Intern", "DevOps Intern",
    "Machine Learning Intern", "Graphic Design Intern",
    "Accounting Intern", "HR Assistant Intern",
    "Civil Engineering Intern", "Electrical Engineering Intern",
    "Mechanical Engineering Intern", "Nursing Aide Intern",
    "Hospitality Management Intern", "Tourism Operations Intern",
    "Education Assistant Intern", "Social Work Intern",
]


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN SEEDER
# ═══════════════════════════════════════════════════════════════════════════════
def main():
    global _start_time, TOTAL_STUDENTS, NEW_JOB_POSTINGS, GRAD_APP_COUNT, GRAD_OFFER_COUNT
    _start_time = time.time()

    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        TOTAL_STUDENTS = int(sys.argv[1])
        NEW_JOB_POSTINGS = min(NEW_JOB_POSTINGS, max(5, TOTAL_STUDENTS // 10))
        GRAD_APP_COUNT = min(GRAD_APP_COUNT, TOTAL_STUDENTS)
        GRAD_OFFER_COUNT = min(GRAD_OFFER_COUNT, GRAD_APP_COUNT)

    log.info("=" * 70)
    log.info(f"InternCon PH — Mock Data Seeder ({TOTAL_STUDENTS:,} Students)")
    log.info("=" * 70)

    # ── Connect ──────────────────────────────────────────────────────────────
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        log.info(f"✓ Connected to MySQL: {DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['database']}")
    except MySQLError as e:
        log.critical(f"✗ Cannot connect to MySQL: {e}")
        sys.exit(1)

    # ── Preflight: Read existing MAX IDs ─────────────────────────────────────
    log.info("─── Preflight: Reading existing data ───")

    def get_max_id(table, col):
        cursor.execute(f"SELECT COALESCE(MAX(`{col}`), 0) FROM `{table}`")
        val = cursor.fetchone()[0]
        return int(val) if val is not None else 0

    def get_all_rows(table, cols):
        cursor.execute(f"SELECT {', '.join(cols)} FROM `{table}`")
        return cursor.fetchall()

    max_user_id          = get_max_id("users", "user_id")
    max_student_id       = get_max_id("students", "student_id")
    max_institution_id   = get_max_id("institutions", "institution_id")
    max_program_id       = get_max_id("programs", "program_id")
    max_org_id           = get_max_id("hiring_organizations", "organization_id")
    max_org_staff_id     = get_max_id("organization_staff", "org_staff_id")
    max_inst_doc_id      = get_max_id("institution_documents", "document_id")
    max_inst_reg_id      = get_max_id("institution_registrations", "registration_id")
    max_org_doc_id       = get_max_id("organization_documents", "document_id")
    max_org_reg_id       = get_max_id("organization_registrations", "registration_id")
    max_entity_reg_id    = get_max_id("entity_registrations", "registration_id")
    max_stud_reg_id      = get_max_id("student_registrations", "registration_id")
    max_portfolio_id     = get_max_id("student_portfolios", "portfolio_id")
    max_portfolio_item   = get_max_id("portfolio_items", "item_id")
    max_resume_id        = get_max_id("student_resumes", "resume_id")
    max_ojt_id           = get_max_id("ojt_records", "ojt_id")
    max_ojt_perf_id      = get_max_id("ojt_performance_records", "record_id")
    max_complaint_id     = get_max_id("complaints", "complaint_id")
    max_review_id        = get_max_id("complaint_reviews", "review_id")
    max_job_id           = get_max_id("job_postings", "job_id")
    max_approval_id      = get_max_id("institution_job_approvals", "approval_id")
    max_application_id   = get_max_id("job_applications", "application_id")
    max_offer_id         = get_max_id("job_offers", "offer_id")
    max_notification_id  = get_max_id("notifications", "notification_id")
    max_preference_id    = get_max_id("user_preferences", "preference_id")

    # Read lookup tables
    existing_institutions = get_all_rows("institutions", ["institution_id", "institution_name", "institution_code"])
    existing_programs     = get_all_rows("programs", ["program_id", "institution_id", "program_name", "program_code", "department", "required_ojt_hours"])
    existing_orgs         = get_all_rows("hiring_organizations", ["organization_id", "organization_name"])
    existing_categories   = get_all_rows("student_categories", ["category_id", "category_name"])
    existing_statuses     = get_all_rows("student_statuses", ["status_id", "status_name"])
    existing_complaint_cats = get_all_rows("complaint_categories", ["category_id"])
    existing_skills       = get_all_rows("skills", ["skill_id"])
    master_programs       = get_all_rows("master_programs", [
        "master_program_id", "program_name", "program_code", "discipline", "default_ojt_hours"
    ])

    # Read existing staff for reviewer references
    existing_staff       = get_all_rows("institution_staff", ["staff_id", "user_id", "institution_id"])
    existing_admin_users = []
    cursor.execute("SELECT user_id FROM users WHERE role_id = 1")
    existing_admin_users = [r[0] for r in cursor.fetchall()]

    log.info(f"  Existing: {len(existing_institutions)} institutions, {len(existing_programs)} programs, "
             f"{len(existing_orgs)} orgs, max_user_id={max_user_id}, max_student_id={max_student_id}")

    # Preflight FK validation
    assert len(existing_categories) >= 1, "student_categories is empty!"
    assert len(existing_statuses) >= 5, "student_statuses must have at least 5 rows!"
    assert len(existing_complaint_cats) >= 1, "complaint_categories is empty!"
    assert len(master_programs) >= 10, "master_programs must have sufficient programs!"
    log.info("✓ Preflight validation passed")

    # ── Disable FK checks for speed ──────────────────────────────────────────
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
    cursor.execute("SET UNIQUE_CHECKS = 0")
    cursor.execute("SET autocommit = 0")
    # Increase packet size for large batches
    try:
        cursor.execute("SET GLOBAL max_allowed_packet = 268435456")  # 256MB
    except Exception:
        pass
    log.info("✓ FK/Unique checks disabled, autocommit off")

    # ═════════════════════════════════════════════════════════════════════════
    # PHASE 1: NEW INSTITUTIONS
    # ═════════════════════════════════════════════════════════════════════════
    log.info("═══ Phase 1: Generating new institutions ═══")

    current_user_id = max_user_id + 1

    cursor.execute("SELECT COUNT(1) FROM institutions WHERE institution_code LIKE 'MOCK-%'")
    existing_mock_insts = cursor.fetchone()[0]
    institutions_to_create = max(0, NEW_INSTITUTIONS - existing_mock_insts)

    new_institutions = []
    new_inst_docs = []
    new_inst_regs = []
    new_inst_programs = []  # (program_id, institution_id, ...)
    new_inst_users = []

    inst_id_start = max_institution_id + 1
    inst_doc_id = max_inst_doc_id + 1
    inst_reg_id = max_inst_reg_id + 1
    prog_id = max_program_id + 1

    used_inst_codes = {r[2] for r in existing_institutions}

    if institutions_to_create == 0:
        log.info(f"✓ Phase 1: {existing_mock_insts} mock institutions already exist, skipping creation [{elapsed()}]")
    else:
        log.info(f"  Generating {institutions_to_create} new institutions...")

    for i in range(institutions_to_create):
        inst_id = inst_id_start + i
        user_id = current_user_id
        current_user_id += 1

        # Generate unique institution code
        while True:
            code = f"MOCK-{random_code(4)}"
            if code not in used_inst_codes:
                used_inst_codes.add(code)
                break

        city = random.choice(PH_CITIES)
        province = random.choice(PH_PROVINCES)
        inst_type = random.choice(INSTITUTION_TYPES)
        name_prefix = random.choice(["Saint", "Holy", "Our Lady of", "National", "Central",
                                      "Eastern", "Western", "Southern", "Northern", "Pacific",
                                      "Asian", "Philippine", "Mindanao", "Visayas", "Luzon"])
        name_suffix = random.choice(["University", "College", "Institute of Technology",
                                      "Polytechnic State University", "Academy",
                                      "College of Science and Technology"])
        inst_name = f"{name_prefix} {city.split()[0]} {name_suffix}"

        email = f"admin@{code.lower().replace('-','')}.edu.ph"
        now = datetime.now()

        # Director user
        new_inst_users.append((
            user_id, 2, email, None, None, MOCK_PASSWORD_HASH,
            1, 1, None, now, now
        ))

        # Institution
        new_institutions.append((
            inst_id, inst_name, code, inst_type,
            f"{fake.street_address()}, {city}, {province}",
            city, province, None, email, random_ph_phone(),
            f"MOCK-PERMIT-{random_code(6)}", fake.name(), "Institution Director / President",
            f"https://{code.lower().replace('-','')}.edu.ph", "active", now, now
        ))

        # Institution document
        new_inst_docs.append((
            inst_doc_id, inst_id, "accreditation_certificate",
            f"CHED GR / TESDA CTPR / DepEd Permit (MOCK-PERMIT-{random_code(6)})",
            f"/uploads/institutions/mock_accreditation_{inst_id}.pdf",
            "mock_accreditation.pdf", 0, now, now, now
        ))
        inst_doc_id += 1

        # Institution registration
        new_inst_regs.append((
            inst_reg_id, inst_id, user_id, "approved", None, None, now, now, now, now
        ))
        inst_reg_id += 1

        # Programs for this institution (5-10 random from master_programs)
        num_progs = random.randint(5, 10)
        selected_masters = random.sample(master_programs, min(num_progs, len(master_programs)))
        for mp in selected_masters:
            new_inst_programs.append((
                prog_id, inst_id, mp[1], mp[2], mp[3], mp[4], now, now
            ))
            prog_id += 1

    # Insert institution users
    batch_insert(cursor,
        "INSERT INTO users (user_id, role_id, email, avatar_url, display_name, password_hash, "
        "is_active, is_verified, last_login_at, created_at, updated_at) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        new_inst_users, "institution_users")

    # Insert institutions
    batch_insert(cursor,
        "INSERT INTO institutions (institution_id, institution_name, institution_code, institution_type, "
        "address, city, province, postal_code, contact_email, contact_phone, accreditation_number, "
        "director_name, director_title, website, status, created_at, updated_at) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        new_institutions, "institutions")

    # Insert institution docs
    batch_insert(cursor,
        "INSERT INTO institution_documents (document_id, institution_id, document_type, document_name, "
        "file_path, file_name, verified, uploaded_at, created_at, updated_at) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        new_inst_docs, "institution_documents")

    # Insert institution registrations
    batch_insert(cursor,
        "INSERT INTO institution_registrations (registration_id, institution_id, submitted_by, status, "
        "reviewed_by, review_notes, submitted_at, reviewed_at, created_at, updated_at) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        new_inst_regs, "institution_registrations")

    # Insert new programs
    batch_insert(cursor,
        "INSERT INTO programs (program_id, institution_id, program_name, program_code, department, "
        "required_ojt_hours, created_at, updated_at) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
        new_inst_programs, "programs")

    conn.commit()
    log.info(f"✓ Phase 1 complete: {NEW_INSTITUTIONS} institutions, {len(new_inst_programs)} programs [{elapsed()}]")

    # ═════════════════════════════════════════════════════════════════════════
    # PHASE 2: NEW ORGANIZATIONS + STAFF
    # ═════════════════════════════════════════════════════════════════════════
    log.info("═══ Phase 2: Generating new organizations ═══")

    cursor.execute("SELECT COUNT(1) FROM hiring_organizations WHERE contact_email LIKE '%@mock-org.com'")
    existing_mock_orgs = cursor.fetchone()[0]
    orgs_to_create = max(0, NEW_ORGANIZATIONS - existing_mock_orgs)

    org_id_start = max_org_id + 1
    org_doc_id = max_org_doc_id + 1
    org_reg_id = max_org_reg_id + 1
    org_staff_id = max_org_staff_id + 1

    new_org_users = []
    new_orgs = []
    new_org_docs = []
    new_org_regs = []
    new_org_staff_users = []
    new_org_staff = []

    if orgs_to_create == 0:
        log.info(f"✓ Phase 2: {existing_mock_orgs} mock organizations already exist, skipping creation [{elapsed()}]")
    else:
        log.info(f"  Generating {orgs_to_create} new organizations...")

    for i in range(orgs_to_create):
        org_id = org_id_start + i
        city = random.choice(PH_CITIES)
        province = random.choice(PH_PROVINCES)
        industry = random.choice(INDUSTRIES)
        structure = random.choice(BUSINESS_STRUCTURES)
        org_name = f"{fake.company()} {random.choice(['Inc.', 'Corp.', 'LLC', 'Solutions', 'Group', 'Enterprises'])}"
        email_hr = f"hr{org_id}@mock-org.com"
        now = datetime.now()

        # HR user
        hr_user_id = current_user_id
        current_user_id += 1
        new_org_users.append((
            hr_user_id, 5, email_hr, None, None, MOCK_PASSWORD_HASH,
            1, 1, None, now, now
        ))

        # Organization
        new_orgs.append((
            org_id, org_name, structure, industry,
            f"{fake.street_address()}, {city}",
            city, province,
            f"SEC-MOCK-{random_code(8)}", f"TIN-MOCK-{random_code(8)}",
            f"BP-MOCK-{random_code(8)}", email_hr, random_ph_phone(),
            f"https://mock-org-{org_id}.com", "active", now, now
        ))

        # Organization docs (4 types)
        for doc_type in ["sec_registration", "business_permit", "bir_registration", "dole_registration"]:
            new_org_docs.append((
                org_doc_id, org_id, doc_type,
                f"Mock {doc_type.replace('_',' ').title()}",
                f"/uploads/orgs/mock_{doc_type}_{org_id}.pdf",
                f"mock_{doc_type}.pdf", 1, now, now, now
            ))
            org_doc_id += 1

        # Organization registration
        new_org_regs.append((
            org_reg_id, org_id, hr_user_id, "approved", None, None, now, now, now, now
        ))
        org_reg_id += 1

        # Workplace mentors
        for m in range(NEW_MENTORS_PER_ORG):
            mentor_user_id = current_user_id
            current_user_id += 1
            mentor_email = f"mentor{org_id}_{m}@mock-org.com"

            new_org_staff_users.append((
                mentor_user_id, 5, mentor_email, None, None, MOCK_PASSWORD_HASH,
                1, 1, None, now, now
            ))

            new_org_staff.append((
                org_staff_id, mentor_user_id, org_id, None,
                f"EMP-MOCK-{org_id}-{m}", random.choice(["Mr.", "Ms.", "Mrs."]),
                fake.first_name(), fake.last_name()[:1], fake.last_name(), None,
                "workplace_mentor", random.choice(["MIS Officer", "IT Lead", "Senior Developer", "Project Manager"]),
                random.choice(["IT Department", "Engineering", "Operations", "HR"]),
                city, random.randint(1, 15), random_ph_phone(),
                f"WM-MOCK-{random_code(5)}", 1, None, now, now
            ))
            org_staff_id += 1

    # Insert org HR users
    batch_insert(cursor,
        "INSERT INTO users (user_id, role_id, email, avatar_url, display_name, password_hash, "
        "is_active, is_verified, last_login_at, created_at, updated_at) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        new_org_users, "org_hr_users")

    # Insert org mentor users
    batch_insert(cursor,
        "INSERT INTO users (user_id, role_id, email, avatar_url, display_name, password_hash, "
        "is_active, is_verified, last_login_at, created_at, updated_at) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        new_org_staff_users, "org_mentor_users")

    # Insert organizations
    batch_insert(cursor,
        "INSERT INTO hiring_organizations (organization_id, organization_name, business_structure, "
        "industry, address, city, province, sec_dti_number, bir_tin, mayors_permit_number, "
        "contact_email, contact_phone, website, status, created_at, updated_at) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        new_orgs, "hiring_organizations")

    # Insert org docs
    batch_insert(cursor,
        "INSERT INTO organization_documents (document_id, organization_id, document_type, document_name, "
        "file_path, file_name, verified, uploaded_at, created_at, updated_at) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        new_org_docs, "organization_documents")

    # Insert org registrations
    batch_insert(cursor,
        "INSERT INTO organization_registrations (registration_id, organization_id, submitted_by, status, "
        "reviewed_by, review_notes, submitted_at, reviewed_at, created_at, updated_at) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        new_org_regs, "organization_registrations")

    # Insert org staff
    batch_insert(cursor,
        "INSERT INTO organization_staff (org_staff_id, user_id, organization_id, program_id, "
        "staff_number, title, first_name, middle_name, last_name, suffix, position, job_title, "
        "department, work_location, years_of_experience, contact_number, passcode_used, "
        "is_verified, rejection_reason, created_at, updated_at) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        new_org_staff, "organization_staff")

    conn.commit()
    log.info(f"✓ Phase 2 complete: {len(new_orgs)} new orgs, {len(new_org_staff)} mentors [{elapsed()}]")

    # ═════════════════════════════════════════════════════════════════════════
    # BUILD FULL INSTITUTION+PROGRAM POOL
    # ═════════════════════════════════════════════════════════════════════════
    # Refresh all programs from DB
    all_programs = get_all_rows("programs", ["program_id", "institution_id", "program_name", "program_code", "department", "required_ojt_hours"])

    # Group programs by institution
    programs_by_inst = {}
    for p in all_programs:
        programs_by_inst.setdefault(p[1], []).append(p)  # keyed by institution_id

    all_institution_ids = list(programs_by_inst.keys())

    # Build all org IDs pool from DB
    cursor.execute("SELECT organization_id FROM hiring_organizations")
    all_org_ids = [r[0] for r in cursor.fetchall()]

    # Build all org mentor user IDs pool (for evaluator_id references)
    cursor.execute("SELECT user_id FROM organization_staff")
    all_mentor_user_ids = [r[0] for r in cursor.fetchall()]

    # Staff user IDs per institution (for verified_by references)
    existing_staff = get_all_rows("institution_staff", ["staff_id", "user_id", "institution_id"])
    staff_by_inst = {}
    for s in existing_staff:
        staff_by_inst.setdefault(s[2], []).append(s[1])  # institution_id -> [user_id]

    # Complaint category IDs
    complaint_cat_ids = [r[0] for r in existing_complaint_cats]

    # ═════════════════════════════════════════════════════════════════════════
    # PHASE 3: USERS + STUDENTS (500,000)
    # ═════════════════════════════════════════════════════════════════════════
    log.info("═══ Phase 3: Generating 500K students ═══")

    student_user_id_start = current_user_id
    student_id_start = max_student_id + 1
    entity_reg_id = max_entity_reg_id + 1
    stud_reg_id = max_stud_reg_id + 1

    # Classification weights: 60% regular, 15% irregular, 15% transferee, 10% graduate
    classifications = (
        ["regular"] * 60 +
        ["irregular"] * 15 +
        ["transferee"] * 15 +
        ["graduate"] * 10
    )

    # Non-OJT statuses (NEVER 'ojt' — rule enforced)
    non_grad_ojt_statuses = ["starting_ojt", "searching", "applied", "accepted"]

    # Category IDs (use 1=Regular primarily)
    cat_ids = [r[0] for r in existing_categories]

    # Student statuses: 2=active, 5=graduated
    STATUS_ACTIVE = 2
    STATUS_GRADUATED = 5

    # We'll collect graduate student IDs for Phase 7
    graduate_student_ids = []
    all_new_student_ids = []
    # For OJT phase, collect student+program+institution combos
    ojt_eligible = []

    users_batch = []
    students_batch = []
    entity_regs_batch = []
    stud_regs_batch = []

    now = datetime.now()

    log.info(f"  Generating student data in memory...")
    for i in range(TOTAL_STUDENTS):
        user_id = student_user_id_start + i
        student_id = student_id_start + i

        # Pick random institution and program
        inst_id = random.choice(all_institution_ids)
        prog = random.choice(programs_by_inst[inst_id])
        prog_id_val = prog[0]
        req_hours = prog[5] if prog[5] else 486

        # Classification
        classification = random.choice(classifications)

        # Status and OJT status based on classification
        if classification == "graduate":
            status_id = STATUS_GRADUATED
            ojt_status = "completed_ojt"
            completed_hours = req_hours  # ← makes them job-offer eligible
            graduate_student_ids.append(student_id)
        else:
            status_id = STATUS_ACTIVE
            ojt_status = random.choice(non_grad_ojt_statuses)
            completed_hours = 0

        # Category (mostly Regular=1)
        category_id = random.choices(cat_ids, weights=[70, 15, 10, 5], k=1)[0]

        # Personal info
        gender = random.choice(["male", "female"])
        first_name = fake.first_name_male() if gender == "male" else fake.first_name_female()
        last_name = fake.last_name()
        middle_name = fake.last_name() if random.random() > 0.2 else None
        email = f"mock.student.{student_id}@interncon-test.ph"
        student_number = f"MOCK-{int(student_id):07d}"
        year_level = random.choice([1, 2, 3, 4])
        birthdate = random_date_between(1998, 2006)

        # User row
        users_batch.append((
            user_id, 4, email, None, None, MOCK_PASSWORD_HASH,
            1, 1, None, now, now
        ))

        # Student row
        students_batch.append((
            student_id, user_id, inst_id, prog_id_val, student_number,
            category_id, classification, ojt_status, None, status_id,
            first_name, middle_name, last_name, birthdate, gender,
            random_ph_phone(), f"{fake.street_address()}, {random.choice(PH_CITIES)}",
            year_level, req_hours, completed_hours, 1, 1, now, now
        ))

        # Entity registration
        entity_regs_batch.append((
            entity_reg_id, "student", student_id, user_id, "verified",
            None, None, None, now
        ))
        entity_reg_id += 1

        # Student registration
        verifier = None
        inst_staff_users = staff_by_inst.get(inst_id, [])
        if inst_staff_users:
            verifier = random.choice(inst_staff_users)

        stud_regs_batch.append((
            stud_reg_id, student_id, "verified", verifier, None, now, now, now, now
        ))
        stud_reg_id += 1

        all_new_student_ids.append(student_id)

        # Track OJT-eligible (completed_ojt or graduate with hours)
        if classification == "graduate" or ojt_status in ("accepted",):
            ojt_eligible.append((student_id, prog_id_val, inst_id, req_hours))

        # Batch insert when buffer fills
        if len(users_batch) >= BATCH_SIZE:
            batch_insert(cursor,
                "INSERT INTO users (user_id, role_id, email, avatar_url, display_name, password_hash, "
                "is_active, is_verified, last_login_at, created_at, updated_at) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                users_batch, "student_users")
            users_batch = []

        if len(students_batch) >= BATCH_SIZE:
            batch_insert(cursor,
                "INSERT INTO students (student_id, user_id, institution_id, program_id, student_number, "
                "category_id, classification, ojt_status, passcode_used, status_id, first_name, "
                "middle_name, last_name, birthdate, gender, contact_number, address, year_level, "
                "required_ojt_hours, completed_ojt_hours, is_verified, is_active, created_at, updated_at) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                students_batch, "students")
            students_batch = []

        if len(entity_regs_batch) >= BATCH_SIZE:
            batch_insert(cursor,
                "INSERT INTO entity_registrations (registration_id, entity_type, entity_id, user_id, "
                "status, reviewer_user_id, reviewed_at, rejection_reason, submitted_at) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                entity_regs_batch, "entity_registrations")
            entity_regs_batch = []

        if len(stud_regs_batch) >= BATCH_SIZE:
            batch_insert(cursor,
                "INSERT INTO student_registrations (registration_id, student_id, status, verified_by, "
                "verification_notes, submitted_at, verified_at, created_at, updated_at) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                stud_regs_batch, "student_registrations")
            stud_regs_batch = []

    # Flush remaining
    if users_batch:
        batch_insert(cursor,
            "INSERT INTO users (user_id, role_id, email, avatar_url, display_name, password_hash, "
            "is_active, is_verified, last_login_at, created_at, updated_at) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            users_batch, "student_users_final")

    if students_batch:
        batch_insert(cursor,
            "INSERT INTO students (student_id, user_id, institution_id, program_id, student_number, "
            "category_id, classification, ojt_status, passcode_used, status_id, first_name, "
            "middle_name, last_name, birthdate, gender, contact_number, address, year_level, "
            "required_ojt_hours, completed_ojt_hours, is_verified, is_active, created_at, updated_at) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            students_batch, "students_final")

    if entity_regs_batch:
        batch_insert(cursor,
            "INSERT INTO entity_registrations (registration_id, entity_type, entity_id, user_id, "
            "status, reviewer_user_id, reviewed_at, rejection_reason, submitted_at) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            entity_regs_batch, "entity_registrations_final")

    if stud_regs_batch:
        batch_insert(cursor,
            "INSERT INTO student_registrations (registration_id, student_id, status, verified_by, "
            "verification_notes, submitted_at, verified_at, created_at, updated_at) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            stud_regs_batch, "student_registrations_final")

    conn.commit()
    log.info(f"✓ Phase 3 complete: {TOTAL_STUDENTS:,} students, {len(graduate_student_ids):,} graduates [{elapsed()}]")

    # ═════════════════════════════════════════════════════════════════════════
    # PHASE 4: PORTFOLIOS + RESUMES
    # ═════════════════════════════════════════════════════════════════════════
    log.info("═══ Phase 4: Generating portfolios & resumes ═══")

    portfolio_id = max_portfolio_id + 1
    item_id = max_portfolio_item + 1
    resume_id = max_resume_id + 1

    portfolios_batch = []
    items_batch = []
    resumes_batch = []

    for idx, sid in enumerate(all_new_student_ids):
        # Portfolio
        portfolios_batch.append((
            portfolio_id, sid, "Career Portfolio", "Student career portfolio", now, now
        ))

        # 2-4 portfolio items
        num_items = random.randint(2, 4)
        item_types = random.sample(
            ["academic_portfolio", "project", "certificate", "credential", "transcript", "cor"],
            min(num_items, 6)
        )
        for it_type in item_types:
            if it_type in ("certificate", "credential"):
                title = random.choice(CERTIFICATE_TITLES)
                desc = "Industry certification demonstrating professional competency."
            else:
                title = random.choice(PORTFOLIO_TITLES)
                desc = random.choice(PORTFOLIO_DESCRIPTIONS)

            items_batch.append((
                item_id, portfolio_id, title, desc,
                f"/uploads/portfolio/mock_{it_type}_{sid}.pdf",
                f"mock_{it_type}.pdf", random.randint(100000, 5000000),
                it_type, None, 0, None, None, now, now
            ))
            item_id += 1

        portfolio_id += 1

        # Resume
        resumes_batch.append((
            resume_id, sid, f"/uploads/portfolio/mock_resume_{sid}.pdf",
            f"Mock_Resume_{sid}.pdf", random.randint(200000, 800000),
            1, 1, now, now
        ))
        resume_id += 1

        # Batch flush
        if len(portfolios_batch) >= BATCH_SIZE:
            batch_insert(cursor,
                "INSERT INTO student_portfolios (portfolio_id, student_id, title, summary, "
                "created_at, updated_at) VALUES (%s,%s,%s,%s,%s,%s)",
                portfolios_batch, "portfolios")
            portfolios_batch = []

        if len(items_batch) >= BATCH_SIZE:
            batch_insert(cursor,
                "INSERT INTO portfolio_items (item_id, portfolio_id, title, description, "
                "file_path, file_name, file_size, item_type, sub_category, is_verified, "
                "associated_org_id, associated_job_id, created_at, updated_at) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                items_batch, "portfolio_items")
            items_batch = []

        if len(resumes_batch) >= BATCH_SIZE:
            batch_insert(cursor,
                "INSERT INTO student_resumes (resume_id, student_id, file_path, file_name, "
                "file_size, version, is_active, created_at, updated_at) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                resumes_batch, "resumes")
            resumes_batch = []

    # Flush remaining
    if portfolios_batch:
        batch_insert(cursor,
            "INSERT INTO student_portfolios (portfolio_id, student_id, title, summary, "
            "created_at, updated_at) VALUES (%s,%s,%s,%s,%s,%s)",
            portfolios_batch, "portfolios_final")
    if items_batch:
        batch_insert(cursor,
            "INSERT INTO portfolio_items (item_id, portfolio_id, title, description, "
            "file_path, file_name, file_size, item_type, sub_category, is_verified, "
            "associated_org_id, associated_job_id, created_at, updated_at) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            items_batch, "portfolio_items_final")
    if resumes_batch:
        batch_insert(cursor,
            "INSERT INTO student_resumes (resume_id, student_id, file_path, file_name, "
            "file_size, version, is_active, created_at, updated_at) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            resumes_batch, "resumes_final")

    conn.commit()
    log.info(f"✓ Phase 4 complete: {TOTAL_STUDENTS:,} portfolios, {item_id - max_portfolio_item - 1:,} items [{elapsed()}]")

    # ═════════════════════════════════════════════════════════════════════════
    # PHASE 5: OJT RECORDS + EVALUATIONS
    # ═════════════════════════════════════════════════════════════════════════
    log.info("═══ Phase 5: Generating OJT records & evaluations ═══")

    ojt_id = max_ojt_id + 1
    perf_id = max_ojt_perf_id + 1

    # Take the first OJT_PERCENT of ojt_eligible
    num_ojt = int(TOTAL_STUDENTS * OJT_PERCENT)
    ojt_sample = ojt_eligible[:num_ojt] if len(ojt_eligible) >= num_ojt else ojt_eligible

    ojt_batch = []
    perf_batch = []

    for student_id, prog_id_val, inst_id, req_hours in ojt_sample:
        org_id = random.choice(all_org_ids)
        start_dt = random_date_between(2024, 2026)

        ojt_batch.append((
            ojt_id, student_id, org_id, prog_id_val,
            start_dt, start_dt + timedelta(days=random.randint(90, 180)),
            req_hours, req_hours, "completed",
            fake.name(), random_ph_phone(), now, now
        ))

        # 1-2 evaluations
        if all_mentor_user_ids:
            evaluator = random.choice(all_mentor_user_ids)

            perf_batch.append((
                perf_id, ojt_id, evaluator, "midterm",
                round(random.uniform(3.0, 5.0), 2), "Satisfactory performance during midterm evaluation.",
                None, random_datetime_between(2024, 2026), now, now
            ))
            perf_id += 1

            if random.random() > 0.3:  # 70% also get final eval
                perf_batch.append((
                    perf_id, ojt_id, evaluator, "final",
                    round(random.uniform(3.5, 5.0), 2), "Strong overall performance throughout the internship.",
                    '{"score_quality": ' + str(random.randint(3,5)) + ', "score_attitude": ' + str(random.randint(3,5)) + '}',
                    random_datetime_between(2024, 2026), now, now
                ))
                perf_id += 1

        ojt_id += 1

        if len(ojt_batch) >= BATCH_SIZE:
            batch_insert(cursor,
                "INSERT INTO ojt_records (ojt_id, student_id, organization_id, program_id, "
                "start_date, end_date, required_hours, rendered_hours, status, supervisor_name, "
                "supervisor_contact, created_at, updated_at) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                ojt_batch, "ojt_records")
            ojt_batch = []

        if len(perf_batch) >= BATCH_SIZE:
            batch_insert(cursor,
                "INSERT INTO ojt_performance_records (record_id, ojt_id, evaluator_id, "
                "evaluation_period, rating, comments, score_details, evaluated_at, "
                "created_at, updated_at) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                perf_batch, "ojt_performance_records")
            perf_batch = []

    # Flush
    if ojt_batch:
        batch_insert(cursor,
            "INSERT INTO ojt_records (ojt_id, student_id, organization_id, program_id, "
            "start_date, end_date, required_hours, rendered_hours, status, supervisor_name, "
            "supervisor_contact, created_at, updated_at) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            ojt_batch, "ojt_records_final")
    if perf_batch:
        batch_insert(cursor,
            "INSERT INTO ojt_performance_records (record_id, ojt_id, evaluator_id, "
            "evaluation_period, rating, comments, score_details, evaluated_at, "
            "created_at, updated_at) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            perf_batch, "ojt_performance_final")

    conn.commit()
    log.info(f"✓ Phase 5 complete: {len(ojt_sample):,} OJT records, {perf_id - max_ojt_perf_id - 1:,} evaluations [{elapsed()}]")

    # ═════════════════════════════════════════════════════════════════════════
    # PHASE 6: COMPLAINTS / GRIEVANCES
    # ═════════════════════════════════════════════════════════════════════════
    log.info("═══ Phase 6: Generating complaints ═══")

    num_complaints = int(TOTAL_STUDENTS * COMPLAINT_PERCENT)
    complaint_students = random.sample(all_new_student_ids, min(num_complaints, len(all_new_student_ids)))

    complaint_id = max_complaint_id + 1
    review_id = max_review_id + 1

    complaints_batch = []
    reviews_batch = []

    complaint_statuses = ["submitted", "institution_review", "admin_review", "resolved", "dismissed"]
    graduate_set = set(graduate_student_ids)

    for sid in complaint_students:
        org_id = random.choice(all_org_ids)
        cat_id = random.choice(complaint_cat_ids)
        status = random.choice(complaint_statuses)
        filed = random_datetime_between(2024, 2026)
        c_student_status = "graduated" if sid in graduate_set else None

        complaints_batch.append((
            complaint_id, sid, "student", c_student_status, org_id, cat_id,
            None, None,
            random.choice(COMPLAINT_SUBJECTS),
            f"Detailed description of the complaint filed by student {sid}.",
            0, 0, None, None, 0, None, None,
            status, filed, filed, filed
        ))

        # Add review for resolved/institution_review
        if status in ("resolved", "institution_review") and existing_admin_users:
            reviewer = random.choice(existing_admin_users)
            reviews_batch.append((
                review_id, complaint_id, reviewer,
                "admin" if status == "resolved" else "institution",
                "Findings from investigation of the reported incident.",
                "Recommended corrective action.",
                random.choice(["warning", "suspension", "counseling", None]),
                filed + timedelta(days=random.randint(1, 14)), now, now
            ))
            review_id += 1

        complaint_id += 1

        if len(complaints_batch) >= BATCH_SIZE:
            batch_insert(cursor,
                "INSERT INTO complaints (complaint_id, student_id, complainant_type, student_status, "
                "organization_id, category_id, job_id, application_id, subject, description, "
                "is_accident, forwarded_to_org, forwarded_to_org_at, org_notice_summary, "
                "include_student_details, warning_note_to_student, warning_sent_at, status, "
                "filed_at, created_at, updated_at) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                complaints_batch, "complaints")
            complaints_batch = []

        if len(reviews_batch) >= BATCH_SIZE:
            batch_insert(cursor,
                "INSERT INTO complaint_reviews (review_id, complaint_id, reviewed_by, reviewer_role, "
                "findings, recommendation, action_taken, reviewed_at, created_at, updated_at) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                reviews_batch, "complaint_reviews")
            reviews_batch = []

    # Flush
    if complaints_batch:
        batch_insert(cursor,
            "INSERT INTO complaints (complaint_id, student_id, complainant_type, student_status, "
            "organization_id, category_id, job_id, application_id, subject, description, "
            "is_accident, forwarded_to_org, forwarded_to_org_at, org_notice_summary, "
            "include_student_details, warning_note_to_student, warning_sent_at, status, "
            "filed_at, created_at, updated_at) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            complaints_batch, "complaints_final")
    if reviews_batch:
        batch_insert(cursor,
            "INSERT INTO complaint_reviews (review_id, complaint_id, reviewed_by, reviewer_role, "
            "findings, recommendation, action_taken, reviewed_at, created_at, updated_at) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            reviews_batch, "reviews_final")

    conn.commit()
    log.info(f"✓ Phase 6 complete: {len(complaint_students):,} complaints [{elapsed()}]")

    # ═════════════════════════════════════════════════════════════════════════
    # PHASE 7: JOB POSTINGS, APPLICATIONS & OFFERS
    # ═════════════════════════════════════════════════════════════════════════
    log.info("═══ Phase 7: Generating job postings, applications & offers ═══")

    job_id = max_job_id + 1
    approval_id_val = max_approval_id + 1
    app_id = max_application_id + 1
    offer_id_val = max_offer_id + 1

    jobs_batch = []
    approvals_batch = []
    applications_batch = []
    offers_batch = []

    new_job_ids = []

    for j in range(NEW_JOB_POSTINGS):
        org_id = random.choice(all_org_ids)
        title = random.choice(JOB_TITLES)
        jid = job_id + j
        posted = random_datetime_between(2025, 2026)

        jobs_batch.append((
            jid, org_id, None, title,
            f"Join our team as a {title}. Gain hands-on experience in a professional environment.",
            "Strong communication skills, willingness to learn.",
            None, "ojt", "internship",
            random.choice(PH_CITIES), None, random.randint(3, 5),
            round(random.uniform(0, 500), 2) if random.random() > 0.5 else None,
            "daily", "ojt_students" if random.random() > 0.3 else "ojt_completers_or_graduates",
            random.choice(["onsite", "hybrid", "remote"]),
            random.randint(1, 10), "active", posted, None, posted, posted
        ))

        # Approval from a random institution
        inst_id = random.choice(all_institution_ids)
        reviewer_uid = None
        inst_staff_users = staff_by_inst.get(inst_id, [])
        if inst_staff_users:
            reviewer_uid = random.choice(inst_staff_users)

        approvals_batch.append((
            approval_id_val, jid, inst_id, "approved",
            reviewer_uid, posted, None, posted
        ))
        approval_id_val += 1

        new_job_ids.append(jid)

    job_id += NEW_JOB_POSTINGS

    # Insert jobs
    batch_insert(cursor,
        "INSERT INTO job_postings (job_id, organization_id, mentor_id, title, description, "
        "requirements, deliverables, posting_type, job_type, location, finish_time, on_call_days, "
        "salary_rate, salary_rate_type, target_audience, work_setup, slots_available, status, "
        "posted_at, expires_at, created_at, updated_at) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        jobs_batch, "job_postings")

    # Insert approvals
    batch_insert(cursor,
        "INSERT INTO institution_job_approvals (approval_id, job_id, institution_id, approval_status, "
        "reviewed_by, reviewed_at, rejection_reason, created_at) "
        "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
        approvals_batch, "job_approvals")

    # Job applications from graduates
    if graduate_student_ids and new_job_ids:
        num_apps = min(GRAD_APP_COUNT, len(graduate_student_ids))
        app_students = random.sample(graduate_student_ids, num_apps)

        app_statuses = ["submitted", "shortlisted", "interview", "offered", "accepted", "rejected"]

        for sid in app_students:
            jid = random.choice(new_job_ids)
            app_status = random.choice(app_statuses)
            applied = random_datetime_between(2025, 2026)

            applications_batch.append((
                app_id, jid, sid, app_status,
                applied if app_status == "accepted" else None,
                None, applied, applied, applied
            ))

            # Job offer for accepted applications
            if app_status == "accepted" and len(offers_batch) < GRAD_OFFER_COUNT:
                offers_batch.append((
                    offer_id_val, app_id, "accepted", applied,
                    applied, applied, applied
                ))
                offer_id_val += 1

            app_id += 1

            if len(applications_batch) >= BATCH_SIZE:
                batch_insert(cursor,
                    "INSERT INTO job_applications (application_id, job_id, student_id, status, "
                    "accepted_at, completed_at, applied_at, created_at, updated_at) "
                    "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                    applications_batch, "job_applications")
                applications_batch = []

        # Flush applications
        if applications_batch:
            batch_insert(cursor,
                "INSERT INTO job_applications (application_id, job_id, student_id, status, "
                "accepted_at, completed_at, applied_at, created_at, updated_at) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                applications_batch, "job_applications_final")

        # Insert offers
        if offers_batch:
            batch_insert(cursor,
                "INSERT INTO job_offers (offer_id, application_id, status, offered_at, "
                "responded_at, created_at, updated_at) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s)",
                offers_batch, "job_offers")

    conn.commit()
    log.info(f"✓ Phase 7 complete: {NEW_JOB_POSTINGS} postings, {app_id - max_application_id - 1:,} applications, "
             f"{len(offers_batch):,} offers [{elapsed()}]")

    # ═════════════════════════════════════════════════════════════════════════
    # RE-ENABLE CONSTRAINTS + FINAL VALIDATION
    # ═════════════════════════════════════════════════════════════════════════
    log.info("═══ Final: Re-enabling constraints & validation ═══")

    cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
    cursor.execute("SET UNIQUE_CHECKS = 1")
    cursor.execute("SET autocommit = 1")
    conn.commit()

    # Row count validation
    log.info("─── Final Row Counts ───")
    tables = [
        "users", "students", "institutions", "programs",
        "hiring_organizations", "organization_staff",
        "entity_registrations", "student_registrations",
        "student_portfolios", "portfolio_items", "student_resumes",
        "ojt_records", "ojt_performance_records",
        "complaints", "complaint_reviews",
        "job_postings", "institution_job_approvals",
        "job_applications", "job_offers",
    ]
    total_rows = 0
    for t in tables:
        cursor.execute(f"SELECT COUNT(*) FROM `{t}`")
        cnt = cursor.fetchone()[0]
        total_rows += cnt
        log.info(f"  {t:40s} {cnt:>12,}")

    log.info(f"  {'TOTAL':40s} {total_rows:>12,}")

    # Timing
    elapsed_secs = time.time() - _start_time
    log.info("=" * 70)
    log.info(f"✓ SEEDING COMPLETE in {elapsed_secs / 60:.1f} minutes ({elapsed_secs:.0f}s)")
    log.info(f"  Total new rows inserted: ~{total_rows:,}")
    log.info("=" * 70)

    cursor.close()
    conn.close()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log.warning("\n⚠ Interrupted by user. Partial data may have been committed.")
        sys.exit(130)
    except Exception as e:
        log.critical(f"✗ Fatal error: {e}")
        traceback.print_exc()
        sys.exit(1)
