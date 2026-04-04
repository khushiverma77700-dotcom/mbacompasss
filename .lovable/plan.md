## Feature 1: Profile Analyzer 60-Day Cooldown

**How it works:**
- When a logged-in user submits a profile analysis, the system records their `user_id` + `created_at`
- Before allowing a new analysis, check if the user has an analysis within the last 60 days
- If yes → block re-analysis, show "You can re-analyze after [date]" with a countdown
- Users can **view their existing report anytime** from their dashboard
- If not logged in, no cooldown (they'd need to log in to save/view reports anyway)

**DB Changes:** None needed — `profile_analyses` already has `user_id` and `created_at`

**Code Changes:**
- Add cooldown check in `ProfileAnalyzerPage.tsx` before form submission
- Show existing report with a "next analysis available" date

---

## Feature 2: Admin Management Panel with Granular Permissions

**How it works:**
- New admin page: "Manage Admins" accessible only to super admins
- Form: Name, Email, and checkboxes for each admin section (26 sections)
- "Select All" toggle
- When a new admin is created → their account gets `admin` role + their allowed sections are saved
- In `AdminLayout`, filter the sidebar nav to only show sections the admin has access to
- Locked sections show a "No Access" state if navigated to directly

**DB Changes (migration):**
- New table `admin_permissions`:
  - `id` (uuid, PK)
  - `user_id` (uuid, NOT NULL, unique)
  - `display_name` (text)
  - `email` (text)
  - `allowed_sections` (text[] — stores section paths like "/admin/institutes")
  - `created_at`, `updated_at`
  - RLS: only admins can read/write

**Code Changes:**
- New page: `AdminManageAdmins.tsx` — list admins, add/edit permissions
- Update `AuthContext` to load `allowed_sections` for admin users
- Update `AdminLayout` to filter nav items based on permissions
- Add route in `App.tsx`

**Security:** The first admin (super admin) who has no `admin_permissions` row gets full access by default. Only admins with existing full access can manage other admins.
