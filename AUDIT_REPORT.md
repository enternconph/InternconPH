# Software Audit Report: InternConPH Platform
**System**: InternConPH (Philippine OJT Coordination, CMO 104 s. 2017 / SIPP Compliance, and Career-Portfolio Platform)  
**Auditor**: Senior Software Auditor  
**Audit Date**: October 22, 2026  
**Mode**: READ-ONLY Codebase & SQL Data Evidence Inspection  

---

### Summary Box
```text
Weakest (top 3): Testing and documentation (1.5/10), Security hardening (3.0/10), Certificates and verifiable portfolio (3.5/10)
Capability Design: 8.0/10
As Evidenced in the Dump / As Built: 4.7/10
Blended Estimate: 5.9/10
```

---

### 1. Capability Scorecard

| Capability | Weight | Design | As Built | One-Line Reason | Evidence |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **1. Tripartite approval gate** | 1.5 | 8.0 | 4.0 | Specification designs a strict MOA-Student-School-Company gate, but code auto-creates ongoing OJT records upon requirement upload bypassing school endorsement. | `server/src/routes/student.routes.js:3620-3629`, `server/src/routes/institution.routes.js:3092-3140` |
| **2. Legitimacy vetting of schools and companies** | 1.5 | 8.5 | 6.5 | Dual-party admin verification workflow and status tracking exist, but lacks external CHED/SEC registry verification and uploads are public. | `server/src/routes/admin.routes.js:420-560`, `server/src/server.js:100-140` |
| **3. Signed dynamic QR attendance** | 1.5 | 8.5 | 5.5 | HMAC-SHA256 signature and 30s TTL implemented with timingSafeEqual, but replay protection is absent and TOTP secret is transmitted in plaintext to client and stored unencrypted. | `server/src/utils/totp.helper.js:38-95`, `server/src/routes/student.routes.js:1259-1260`, `server/src/config/migrate.js:145` |
| **4. Hours tracking and DTR** | 1.5 | 8.5 | 6.0 | Automated 8-hour daily capping and late/on-time status work, but TIME columns break overnight shifts and integer rendered_hours causes precision loss. | `server/src/routes/organization.routes.js:1880`, `server/internconph.sql:575`, `server/src/config/migrate.js:132-133` |
| **5. Shielded grievance and incident channel** | 1.5 | 8.0 | 4.5 | Anonymous complaint submission masks names in UI, but ON DELETE CASCADE erases grievance records if an org is deleted, and complaint evidence files are served publicly without auth. | `server/internconph.sql:130,151`, `server/src/server.js:100-140`, `server/src/routes/organization.routes.js:3420-3490` |
| **6. Certificates and verifiable portfolio** | 1.5 | 8.5 | 3.5 | Certificate generation logic checks hours and evaluation, but ojt_certificates table has NO DDL in SQL dump or migrate.js, generation lacks DB transaction, and revocation is unsupported. | `server/src/services/certificate.service.js:17-190`, `server/internconph.sql`, `server/src/config/migrate.js` |
| **7. Roles and permissions (RBAC)** | 1.5 | 8.0 | 5.5 | Core route middleware verifyToken and requireRole exist on major routers, but workplace mentors share hiring_organization token and can reach hours-crediting and offer APIs. | `server/src/middleware/auth.js:40-75`, `server/src/routes/organization.routes.js:2030-2070,3032` |
| **8. Job posting, applications, interviews, offers** | 1.5 | 8.5 | 5.0 | Full application lifecycle implemented from posting to offer acceptance, but marred by Critical IDOR on interview updates and unverified institution offer endorsement. | `server/src/routes/organization.routes.js:2976-2995`, `server/src/routes/institution.routes.js:3092-3140` |
| **9. AI skills and career engine** | 1.0 | 8.0 | 6.5 | Gemini-1.5-flash integration generates taxonomy-aligned skill suggestions and market demand, but model name is hardcoded and relies on synchronous external LLM latency without circuit-breaker. | `server/src/services/aiRecommendation.service.js:154-210` |
| **10. Realtime and notifications** | 1.0 | 7.5 | 5.0 | Dual in-app DB notification and Socket.IO broadcast functions smoothly on single instance, but lacks Redis adapter for multi-instance scaling and fails silently on sleeping hosts. | `server/src/config/socket.js:1-60`, `server/src/utils/notification.helper.js:1-50` |
| **11. Mobile intern app** | 1.0 | 8.0 | 5.0 | React Native app provides sleek DTR, dynamic QR display, and journal logging, but stores JWT and device secrets in unencrypted AsyncStorage and lacks offline punch queuing. | `mobile/src/context/AuthContext.js:45`, `mobile/src/screens/DtrScreen.js:65` |
| **12. Web app** | 1.0 | 8.5 | 6.0 | Comprehensive responsive UI across 41 pages with clean Tailwind CSS styling, but bundles server library googleapis in client build and lacks global React error boundaries. | `package.json:28`, `src/App.jsx:1-120` |
| **13. Privacy and RA 10173 compliance** | 1.25 | 7.5 | 4.0 | Includes privacy consent records and anonymous grievance flags, but violates RA 10173 by exposing student resumes, requirements, and incident evidence publicly on GET /uploads. | `server/src/server.js:100-140`, `server/internconph.sql:130,151` |
| **14. Security hardening** | 1.25 | 6.5 | 3.0 | No helmet headers, no rate-limiting, no account lockout on failed logins, DB SSL rejectUnauthorized:false, plaintext TOTP secret in DB and wire, and critical IDOR vulnerability. | `server/package.json`, `server/src/server.js:30-55`, `server/src/config/db.js:20`, `server/src/routes/organization.routes.js:2976-2995` |
| **15. Operations and architecture** | 1.25 | 7.0 | 4.5 | Express/MySQL structure is modular, but monolithic startup migration swallows ALTER errors, database dump has 51 empty tables, and deployment relies on single-node free-tier host. | `server/src/config/migrate.js:1-400`, `server/internconph.sql`, `server/src/server.js:82` |
| **16. Testing and documentation** | 1.25 | 7.5 | 1.5 | Architecture and workflow documentation is exceptionally thorough (Master Spec v1.2.0), but automated test coverage is literally zero across all three packages (0 tests, dummy test script). | `package.json:scripts`, `server/package.json:scripts`, `mobile/package.json:scripts` |

#### Score Arithmetic
- **Sum of Weights**: $(8 \times 1.5) + (4 \times 1.0) + (4 \times 1.25) = 12.0 + 4.0 + 5.0 = 21.00$
- **Weighted Design Score**:
  $$(8.0+8.5+8.5+8.5+8.0+8.5+8.0+8.5) \times 1.5 + (8.0+7.5+8.0+8.5) \times 1.0 + (7.5+6.5+7.0+7.5) \times 1.25$$
  $$= (66.5 \times 1.5) + (32.0 \times 1.0) + (28.5 \times 1.25) = 99.75 + 32.00 + 35.625 = 167.375$$
  $$\text{CAPABILITY DESIGN (overall)} = \frac{167.375}{21.00} = 7.9702 \approx \mathbf{8.0 / 10}$$
- **Weighted As Built Score**:
  $$(4.0+6.5+5.5+6.0+4.5+3.5+5.5+5.0) \times 1.5 + (6.5+5.0+5.0+6.0) \times 1.0 + (4.0+3.0+4.5+1.5) \times 1.25$$
  $$= (40.5 \times 1.5) + (22.5 \times 1.0) + (13.0 \times 1.25) = 60.75 + 22.50 + 16.25 = 99.50$$
  $$\text{AS BUILT (overall)} = \frac{99.50}{21.00} = 4.7381 \approx \mathbf{4.7 / 10}$$
- **Blended Estimate**:
  $$\text{BLENDED ESTIMATE} = (0.35 \times 7.9702) + (0.65 \times 4.7381) = 2.7896 + 3.0798 = 5.8694 \approx \mathbf{5.9 / 10}$$

#### Weakest Capabilities (Lowest AS BUILT)
1. **Testing and documentation (1.5/10)**: Automated test coverage is completely absent across web frontend, backend API, and mobile applications (0 test files, test runner scripts are dummy `exit 1`). *Evidence*: `package.json`, `server/package.json`, `mobile/package.json`.
2. **Security hardening (3.0/10)**: Critical IDOR in `PUT /api/org/interviews/:id`, unauthenticated public exposure of uploaded files (resumes, grievance evidence), absent rate limiting, no account lockout, and DB SSL `rejectUnauthorized: false`. *Evidence*: `server/src/routes/organization.routes.js:2976-2995`, `server/src/server.js:100-140`.
3. **Certificates and verifiable portfolio (3.5/10)**: The `ojt_certificates` table has no DDL in either `internconph.sql` or `migrate.js` (fresh installations crash when issuing or querying certificates), certificate generation lacks a DB transaction, and certificate revocation is unsupported. *Evidence*: `server/src/services/certificate.service.js:17-190`, `server/internconph.sql`.

#### Strongest Capabilities (Highest AS BUILT)
1. **Legitimacy vetting of schools and companies (6.5/10)**: Structured dual-party document review workflow for institutions and organizations with audit tracking and rejection reason tracking. *Evidence*: `server/src/routes/admin.routes.js:420-560`.
2. **AI skills and career engine (6.5/10)**: Functional Google Gemini-1.5-flash integration analyzing curricula against real Philippine industry skills taxonomy and generating contextual student skill gap recommendations. *Evidence*: `server/src/services/aiRecommendation.service.js:154-210`.
3. **Hours tracking and DTR (6.0/10)**: Working automated time-in/time-out logging, strict 8-hour daily shift capping, on-time/late tagging, and mentor manual adjustment tracking with audit log recording. *Evidence*: `server/src/routes/organization.routes.js:1770-1890`.

---

### 2. Inventory Comparison

| Inventory Metric | Spec Claim | Counted From Code | Match? | Discrepancy Analysis |
| :--- | :---: | :---: | :---: | :--- |
| **API Route Declarations** | 178 | 178 | **YES** | Exactly 178 route handlers declared across 9 router files in `server/src/routes/` (`admin`: 26, `auth`: 10, `certificate`: 3, `institution`: 31, `notification`: 4, `organization`: 38, `public`: 6, `student`: 54, `user`: 6). In addition, 5 root handlers exist in `server.js` (`/`, `/health`, `/healthz`, `/api/health`, `/uploads`). |
| **Database Tables** | 61 | 53 in SQL Dump<br>60 in Migration Union<br>0 DDL for 1 Table | **NO** | `server/internconph.sql` contains 53 tables. `server/src/config/migrate.js` defines 26 tables (7 absent from dump: `ojt_attendance_logs`, `student_attendance_devices`, `ojt_daily_journals`, `accident_reports`, `institution_reports`, `user_preferences`, `stored_uploads`), bringing defined tables to 60. Table 61 (`ojt_certificates`) has NO `CREATE TABLE` statement anywhere. |
| **React Web Pages** | 41 | 41 | **YES** | Exactly 41 page components in `src/pages/` (`admin`: 8, `institution`: 7, `organization`: 9, `public`: 8, `shared`: 1, `student`: 8). |
| **Mobile App Screens** | 5 | 7 | **NO** | Spec specifies 5 active tab screens (Home, DTR, Journal, Clearance, Evaluation); code implements 7 screen files in `mobile/src/screens/` including `LoginScreen.js` and `AccessBlockedScreen.js`. |
| **System Roles** | 6 | 0 in Dump Data<br>6 in `migrate.js` | **PARTIAL** | `roles` table in `server/internconph.sql` has 0 rows. 6 roles are seeded programmatically during runtime in `migrate.js:347-363` (`system_admin`, `institution`, `institution_staff`, `hiring_organization`, `workplace_mentor`, `student`). Mentors share `hiring_organization` user role and are only distinguished in `organization_staff.position`. |
| **Critical Dependencies** | Full Stack | Missing Core Production Libraries | **NO** | **Backend**: Missing `helmet`, `express-rate-limit`, email client (`nodemailer`), validation library (`zod`/`joi`).<br>**Mobile**: Missing native crypto (`react-native-quick-crypto`) and secure storage (`expo-secure-store`).<br>**Web**: Bundles backend library `googleapis` in client bundle. |

---

### 3. Detailed Findings Table

| ID | Area | Finding | Severity | Status | Evidence |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **SEC-01** | Security / IDOR | **Cross-Tenant Interview Tampering**: `PUT /api/org/interviews/:id` executes `SELECT ... WHERE i.interview_id = ?` without verifying that the interview belongs to the caller's `organization_id`. Any authenticated organization user can update interview status, schedule, and notes of applicants at other companies. | **CRITICAL** | **CONFIRMED** | `server/src/routes/organization.routes.js:2976-2995` |
| **SEC-02** | Data Privacy | **Unauthenticated Public Exposure of Sensitive Uploads**: Route `GET /uploads/:subfolder/:filename` serves all uploaded files without checking authentication tokens. Allows anyone on the internet to enumerate and download student resumes, institutional requirements, ID photos, and confidential grievance incident evidence. | **HIGH** | **CONFIRMED** | `server/src/server.js:100-140` |
| **SEC-03** | Cryptography | **Plaintext TOTP Secret Transmission & Storage**: `student_attendance_devices.totp_secret` is stored as plaintext `VARCHAR(64)` in the database and transmitted in cleartext JSON to the client via `GET /student/attendance/qr-credentials`. Compounding this, mobile stores it in unencrypted `AsyncStorage`. | **HIGH** | **CONFIRMED** | `server/src/routes/student.routes.js:1259-1260`, `server/src/config/migrate.js:145`, `mobile/src/context/AuthContext.js:45` |
| **SEC-04** | Security Hardening | **Missing Basic Hardening Headers & Brute-Force Rate Limiting**: `server/package.json` and `server.js` do not utilize `helmet` security headers, do not implement IP or account rate-limiting on login (`/api/auth/login`), and have no account lockout mechanism after repeated failed attempts. | **HIGH** | **CONFIRMED** | `server/src/routes/auth.routes.js:90-120`, `server/src/server.js:25-60`, `server/package.json` |
| **DAT-01** | Data Integrity | **Missing DDL for `ojt_certificates` Table**: `ojt_certificates` is actively queried in 5 route and service files (`certificate.service.js`, `certificate.routes.js`, etc.), but has no `CREATE TABLE` DDL in `server/internconph.sql` or `server/src/config/migrate.js`. Clean deployments crash when generating or verifying certificates. | **HIGH** | **CONFIRMED** | `server/src/services/certificate.service.js:123`, `server/internconph.sql`, `server/src/config/migrate.js` |
| **DAT-02** | Legal / Compliance | **Grievance Evidence Destruction via Cascading Deletes**: `complaints` and `complaint_evidence` tables define `ON DELETE CASCADE` foreign keys referencing `hiring_organizations(organization_id)` and `students(student_id)`. Deleting an entity permanently purges incident reports and legal audit trails. | **HIGH** | **CONFIRMED** | `server/internconph.sql:129-130,151` |
| **DAT-03** | Data Precision | **Hours Truncation via Integer Datatypes**: `ojt_records.rendered_hours` and `students.completed_ojt_hours` are declared as `INT(11)` in the SQL dump, truncating fractional training hours (e.g., 4.5 hours rounded or truncated to 4). | **MEDIUM** | **CONFIRMED** | `server/internconph.sql:575,711` |
| **DAT-04** | Architecture | **Overnight Shift Incompatibility in Attendance**: `ojt_attendance_logs` declares `time_in` and `time_out` as `TIME` columns rather than `DATETIME`. Shifts spanning midnight compute negative or invalid durations without complex application wrapping. | **MEDIUM** | **CONFIRMED** | `server/src/config/migrate.js:132-133` |
| **BIZ-01** | Business Logic | **Bypass of Tripartite Approval Gate**: Saving or submitting an OJT requirement (`POST /api/student/requirements/:id/save`) automatically inserts an `ojt_records` row with status `'ongoing'` attached to an arbitrary organization (`ORDER BY status='approved' LIMIT 1`) without company acceptance or school endorsement. | **HIGH** | **CONFIRMED** | `server/src/routes/student.routes.js:3619-3629` |
| **BIZ-02** | Business Logic | **Missing QR Replay Protection**: `verifyTotpPayload` checks that the client timestamp is within 30 seconds of server time and verifies HMAC, but does not track consumed signatures or nonces. An eavesdropped QR code payload can be replayed repeatedly within the 30-second window. | **MEDIUM** | **CONFIRMED** | `server/src/utils/totp.helper.js:38-95` |
| **BIZ-03** | Data Integrity | **Non-Transactional Certificate Issuance**: `checkAndGenerateCertificate` performs multiple sequential queries (`pool.query`) across `ojt_records`, `ojt_certificates`, `student_portfolios`, and `portfolio_items` without a database transaction (`beginTransaction`/`commit`). A failure midway leaves orphaned or corrupt certificate state. | **MEDIUM** | **CONFIRMED** | `server/src/services/certificate.service.js:59-180` |
| **RBAC-01**| RBAC / Auth | **Workplace Mentor Privilege Overextension**: Workplace mentors authenticate under the `hiring_organization` role and are only differentiated by `organization_staff.position`. Mentors can access HR endpoints including manual hours crediting up to 40 hours (`POST /interns/:ojtId/hours`). | **MEDIUM** | **CONFIRMED** | `server/src/routes/organization.routes.js:2030-2070,2125` |
| **OPS-01** | Operations | **Swallowed Migration Errors**: Startup migration script `server/src/config/migrate.js` wraps 15 table ALTER statements in blanket `try { ... } catch (err) { /* ignore */ }` blocks without filtering error codes (`ER_DUP_FIELDNAME` vs connection/syntax errors), masking catastrophic deployment failures. | **MEDIUM** | **CONFIRMED** | `server/src/config/migrate.js:370-420` |
| **OPS-02** | Operations | **In-Memory WebSockets Incompatible with Clustering**: Realtime socket updates (`emitUpdate`) use in-memory Socket.IO without a Redis pub/sub adapter. Multi-instance scaling on cloud platforms breaks socket delivery across nodes. | **MEDIUM** | **CONFIRMED** | `server/src/config/socket.js:1-60` |
| **DEV-01** | Code Quality | **Zero Automated Test Coverage**: Repository contains 0 automated test files across `src/`, `server/`, and `mobile/`. No unit, integration, RBAC, or IDOR tests exist. | **HIGH** | **CONFIRMED** | `package.json`, `server/package.json`, `mobile/package.json` |
| **DEV-02** | Client Bundle | **Server-Side Library Bundled in Frontend**: Web client `package.json` includes `googleapis` in production dependencies, needlessly inflating frontend client bundle size. | **LOW** | **CONFIRMED** | `package.json:28` |

---

### 4. Spec-Versus-Reality Drift List

1. **Table Count & Authority**:
   - *Spec Claim*: 61 standardized relational database tables.
   - *Reality*: `server/internconph.sql` contains only 53 tables. Runtime script `server/src/config/migrate.js` dynamically creates 7 additional tables on startup (total 60), but Table 61 (`ojt_certificates`) has no DDL in either location.
2. **Tripartite Approval Enforcement**:
   - *Spec Claim*: Strict tripartite gate where students cannot commence training without an approved MOA, formal job offer acceptance, and institutional endorsement.
   - *Reality*: `server/src/routes/student.routes.js:3624` creates an active `'ongoing'` OJT record automatically attached to an arbitrary company whenever a student uploads an initial document.
3. **Roles Table Seeding**:
   - *Spec Claim*: 6 core system roles seeded in `roles` table.
   - *Reality*: `server/internconph.sql` contains 0 rows in `roles`. Roles are inserted dynamically at server boot in `migrate.js:347`. Mentors share the company user account and are not separated at the auth token layer.
4. **Mobile Platform Scope**:
   - *Spec Claim*: 5 core screens.
   - *Reality*: 7 screens exist in `mobile/src/screens/` including standalone login and access blocked handlers.
5. **Dynamic QR Cryptographic Boundary**:
   - *Spec Claim*: Server-side private cryptographic TOTP seed locked strictly within the security perimeter.
   - *Reality*: The secret is exposed in cleartext to the mobile app via `GET /student/attendance/qr-credentials` and stored in unencrypted mobile storage.
6. **Data Storage Datatypes**:
   - *Spec Claim*: High-precision hours calculation and overnight shift resilience.
   - *Reality*: `rendered_hours` is stored as an integer (`INT(11)`), and attendance logs use `TIME` instead of `DATETIME`.

---

### 5. What Could Not Be Verified and Why

1. **Production Row Relationships & Referential Integrity in Live Database**:
   - *Status*: **UNVERIFIED**.
   - *Reason*: `server/internconph.sql` is a development skeleton dump where 51 of 53 tables contain exactly 0 rows (only `student_categories` with 4 rows and `student_statuses` with 6 rows have data). Live database records for `job_applications`, `ojt_records`, `ojt_attendance_logs`, `complaints`, and `ojt_certificates` could not be evaluated for orphaned keys or mismatched hours.
2. **Live Email Notification Delivery**:
   - *Status*: **UNVERIFIED**.
   - *Reason*: No SMTP host or email delivery provider (SendGrid, Mailgun, AWS SES) is configured in the codebase; functions log to console or insert DB notifications only.
3. **Multi-Tenant Stress Performance**:
   - *Status*: **UNVERIFIED**.
   - *Reason*: No load testing scripts, concurrent attendance simulation tools, or Redis cluster environments are present in the repository.

---

### 6. Top 10 Fixes Ranked by Score Impact

| Rank | Fix Description | Target Capability | Point Gain |
| :---: | :--- | :--- | :---: |
| **1** | **Remediate Critical IDOR Vulnerability**: Scope `PUT /api/org/interviews/:id` to `organization_id = req.user.organization_id` and scope institution offer endpoints to verified enrolled students. | Cap 8 (Job Lifecycle) & Cap 14 (Hardening) | **+1.5** |
| **2** | **Add `ojt_certificates` Table DDL & Transaction Wrapper**: Write explicit `CREATE TABLE ojt_certificates` in `internconph.sql` and `migrate.js`, and wrap `certificate.service.js` in `beginTransaction` / `commit`. | Cap 6 (Certificates & Portfolio) | **+3.0** |
| **3** | **Secure `/uploads` Serving Endpoint**: Mount authentication middleware on `GET /uploads/:subfolder/:filename` and restrict sensitive subdirectories (`complaints`, `resumes`, `requirements`) to authorized owners/admins. | Cap 5 (Grievance) & Cap 13 (Privacy) | **+2.0** |
| **4** | **Establish Automated Test Suite**: Implement Vitest/Supertest test suites covering authentication, RBAC route guards, dynamic QR verification, and IDOR prevention. | Cap 16 (Testing & Docs) | **+4.5** |
| **5** | **Protect Dynamic QR Secret**: Do not send `totp_secret` in plaintext to mobile; generate QR tokens via an authenticated mobile challenge or encrypt the secret using native hardware keystore (`expo-secure-store`). | Cap 3 (Dynamic QR) & Cap 14 (Hardening) | **+1.5** |
| **6** | **Implement QR Attendance Replay Cache**: Store validated payload signatures with a 30-second sliding expiration window to prevent replay of captured QR tokens. | Cap 3 (Dynamic QR) | **+1.0** |
| **7** | **Install Security Headers & Rate Limiting**: Integrate `helmet` and `express-rate-limit` in `server.js` with strict limits on `/api/auth/login` and redemption routes. | Cap 14 (Security Hardening) | **+1.5** |
| **8** | **Remove `ON DELETE CASCADE` on Grievance Records**: Replace cascade deletes with `ON DELETE RESTRICT` or soft deletes (`deleted_at`) on `complaints` and `complaint_evidence`. | Cap 5 (Grievance Channel) | **+1.5** |
| **9** | **Fix Hours and Time Datatypes**: Convert `rendered_hours` and `completed_ojt_hours` to `DECIMAL(6,2)` and `ojt_attendance_logs` timestamps to `DATETIME` to support overnight shifts and fractional training credit. | Cap 4 (Hours Tracking & DTR) | **+1.0** |
| **10**| **Enforce Strict Tripartite Gate**: Remove fallback auto-creation of `ojt_records` in `student.routes.js:3624`; require approved offer and MOA endorsement before creating ongoing records. | Cap 1 (Tripartite Gate) | **+2.0** |

---

### 7. Method Notes
- **Files Read & Inspected**:
  - `server/src/server.js`, `server/src/config/db.js`, `server/src/config/migrate.js`, `server/src/config/socket.js`
  - `server/src/middleware/auth.js`, `server/src/utils/totp.helper.js`, `server/src/utils/session.js`, `server/src/utils/upload.helper.js`, `server/src/utils/notification.helper.js`
  - `server/src/routes/admin.routes.js`, `server/src/routes/auth.routes.js`, `server/src/routes/certificate.routes.js`, `server/src/routes/institution.routes.js`, `server/src/routes/notification.routes.js`, `server/src/routes/organization.routes.js`, `server/src/routes/public.routes.js`, `server/src/routes/student.routes.js`, `server/src/routes/user.routes.js`
  - `server/src/services/certificate.service.js`, `server/src/services/aiRecommendation.service.js`
  - `server/internconph.sql`
  - `src/App.jsx`, `src/pages/**`
  - `mobile/src/context/AuthContext.js`, `mobile/src/screens/**`, `mobile/src/utils/totpHelper.js`, `mobile/src/services/api.js`
  - `package.json`, `server/package.json`, `mobile/package.json`
  - `INTERNCONPH_COMPLETE_SYSTEM_DETAILS.txt`, `internconph_system_architecture_and_workflow.txt`
- **Commands Executed**:
  - Python static AST analysis and regex routing inventories (`phase1_inventory.py`)
  - SQL schema, constraint, and table row count inspection (`phase2_sql_audit.py`, `crossref_tables.py`)
  - Authentication, IDOR, and route guard audits (`phase3_code_audit.py`, `check_idor.py`, `check_route_guards.py`)
  - Capability score and arithmetic verification (`calc_scores.py`)
- **Execution Date**: October 22, 2026
