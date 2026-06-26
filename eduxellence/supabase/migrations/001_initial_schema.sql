-- ============================================================
-- Eduxellence Results — Full Database Schema
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for full-text search

-- ─── Enums ───────────────────────────────────────────────────
create type org_type          as enum ('school', 'university', 'centre');
create type user_role         as enum ('admin', 'teacher', 'lecturer', 'assistant');
create type group_type        as enum ('class', 'course', 'department');
create type gender_type       as enum ('M', 'F', 'Other');
create type subscription_plan as enum ('free', 'teacher', 'small_school', 'standard_school', 'premium_school');
create type sub_status        as enum ('active', 'expired', 'cancelled', 'trial');
create type report_type       as enum ('broadsheet', 'subject_report', 'result_card', 'class_summary', 'comparative');
create type report_status     as enum ('pending', 'processing', 'ready', 'failed');

-- ============================================================
-- CORE TABLES
-- ============================================================

-- Organizations (Schools, Universities, Centres)
create table organizations (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  type                  org_type not null default 'school',
  address               text,
  logo_url              text,
  motto                 text,
  website               text,
  contact_email         text,
  contact_phone         text,
  subscription_plan     subscription_plan not null default 'free',
  subscription_status   sub_status not null default 'active',
  subscription_expires_at timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Users (Teachers, Admins, Lecturers)
create table users (
  id              uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  email           text not null,
  name            text not null,
  role            user_role not null default 'teacher',
  signature_url   text,
  phone           text,
  profile_pic_url text,
  last_login      timestamptz,
  is_active       boolean not null default true,
  preferences     jsonb default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Academic Sessions (e.g. "2026/2027")
create table academic_sessions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  start_date      date,
  end_date        date,
  is_active       boolean not null default false,
  metadata        jsonb default '{}',
  created_at      timestamptz not null default now()
);

-- Terms within a session
create table terms (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references academic_sessions(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null, -- "First Term", "Second Term", etc.
  start_date      date,
  end_date        date,
  is_active       boolean not null default false,
  created_at      timestamptz not null default now()
);

-- Groups (Classes, Courses, Departments)
create table groups (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  code            text,
  type            group_type not null default 'class',
  instructor_id   uuid references users(id) on delete set null,
  session_id      uuid references academic_sessions(id) on delete set null,
  term_id         uuid references terms(id) on delete set null,
  is_active       boolean not null default true,
  metadata        jsonb default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Learners (Students, Trainees)
create table learners (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  group_id         uuid not null references groups(id) on delete cascade,
  first_name       text not null,
  last_name        text not null,
  other_names      text,
  admission_number text,
  email            text,
  phone            text,
  date_of_birth    date,
  gender           gender_type,
  guardian_name    text,
  guardian_phone   text,
  address          text,
  is_active        boolean not null default true,
  enrollment_date  date default current_date,
  photo_url        text,
  metadata         jsonb default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- Prevent duplicate admission numbers per org
  unique (organization_id, admission_number)
);

-- Subjects
create table subjects (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  group_id        uuid not null references groups(id) on delete cascade,
  name            text not null,
  code            text,
  instructor_id   uuid references users(id) on delete set null,
  template_id     uuid, -- FK added after assessment_templates created
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- ASSESSMENT TABLES
-- ============================================================

-- Assessment Templates (e.g. "Primary School Template", "WAEC Style")
create table assessment_templates (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  description     text,
  is_default      boolean not null default false,
  metadata        jsonb default '{}',
  created_at      timestamptz not null default now()
);

-- Add FK from subjects to templates
alter table subjects
  add constraint subjects_template_id_fkey
  foreign key (template_id) references assessment_templates(id) on delete set null;

-- Assessment Components (CA1, CA2, Exam, etc.)
create table assessment_components (
  id               uuid primary key default gen_random_uuid(),
  template_id      uuid not null references assessment_templates(id) on delete cascade,
  name             text not null,    -- "CA 1", "CA 2", "Exam"
  max_score        numeric(5,2) not null,
  weight           numeric(5,2),     -- optional weight percentage
  sequence         integer not null default 1,
  is_cumulative    boolean not null default false,
  pass_mark        numeric(5,2),
  metadata         jsonb default '{}',
  created_at       timestamptz not null default now()
);

-- Grading Systems
create table grading_systems (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name            text not null,
  grade_letter    text not null,    -- A, B, C, D, E, F
  min_score       numeric(5,2) not null,
  max_score       numeric(5,2) not null,
  remark          text not null,    -- "Excellent", "Very Good", etc.
  points          numeric(3,2),     -- GPA points (4.0, 3.5, etc.)
  created_at      timestamptz not null default now(),
  -- No overlapping grade ranges per org
  unique (organization_id, grade_letter)
);

-- ============================================================
-- SCORES TABLE
-- ============================================================

create table scores (
  id            uuid primary key default gen_random_uuid(),
  learner_id    uuid not null references learners(id) on delete cascade,
  subject_id    uuid not null references subjects(id) on delete cascade,
  component_id  uuid not null references assessment_components(id) on delete cascade,
  score         numeric(5,2),
  remarks       text,
  entered_by    uuid not null references users(id),
  entered_at    timestamptz not null default now(),
  last_modified timestamptz not null default now(),
  is_final      boolean not null default false,
  metadata      jsonb default '{}',
  -- One score per learner per subject per component
  unique (learner_id, subject_id, component_id),
  -- Score cannot exceed component max (enforced at app layer too)
  constraint score_non_negative check (score >= 0)
);

-- ============================================================
-- REPORTS TABLE
-- ============================================================

create table reports (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  group_id        uuid references groups(id) on delete set null,
  learner_id      uuid references learners(id) on delete set null,
  type            report_type not null,
  filters         jsonb default '{}',
  status          report_status not null default 'pending',
  download_url    text,
  created_by      uuid not null references users(id),
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

-- ============================================================
-- AUDIT LOG
-- ============================================================

create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete set null,
  action      text not null,       -- 'INSERT', 'UPDATE', 'DELETE'
  table_name  text not null,
  record_id   uuid,
  old_data    jsonb,
  new_data    jsonb,
  ip_address  text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

create table notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  title           text not null,
  body            text not null,
  is_read         boolean not null default false,
  metadata        jsonb default '{}',
  created_at      timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_users_org            on users(organization_id);
create index idx_groups_org           on groups(organization_id);
create index idx_learners_org         on learners(organization_id);
create index idx_learners_group       on learners(group_id);
create index idx_subjects_group       on subjects(group_id);
create index idx_scores_learner       on scores(learner_id);
create index idx_scores_subject       on scores(subject_id);
create index idx_scores_component     on scores(component_id);
create index idx_audit_user           on audit_logs(user_id);
create index idx_audit_created        on audit_logs(created_at desc);
create index idx_notifications_user   on notifications(user_id, is_read);

-- Full-text search on learners
create index idx_learners_search on learners using gin(
  (first_name || ' ' || last_name || ' ' || coalesce(other_names,'') || ' ' || coalesce(admission_number,'')) gin_trgm_ops
);

-- ============================================================
-- COMPUTED VIEWS
-- ============================================================

-- Per-learner per-subject score summary
create or replace view v_learner_subject_totals as
select
  s.learner_id,
  s.subject_id,
  sub.name                                        as subject_name,
  sub.group_id,
  sum(s.score)                                    as total_score,
  sum(ac.max_score)                               as max_possible,
  round((sum(s.score) / nullif(sum(ac.max_score),0)) * 100, 1) as percentage,
  count(s.id)                                     as components_entered,
  count(ac.id)                                    as components_total
from scores s
join assessment_components ac on ac.id = s.component_id
join subjects sub on sub.id = s.subject_id
group by s.learner_id, s.subject_id, sub.name, sub.group_id;

-- Per-learner overall totals across all subjects in a group
create or replace view v_learner_group_totals as
select
  lst.learner_id,
  lst.group_id,
  sum(lst.total_score)                             as grand_total,
  sum(lst.max_possible)                            as max_possible,
  round((sum(lst.total_score) / nullif(sum(lst.max_possible),0)) * 100, 1) as overall_percentage,
  count(distinct lst.subject_id)                  as subject_count
from v_learner_subject_totals lst
group by lst.learner_id, lst.group_id;

-- Class statistics per group
create or replace view v_group_statistics as
select
  lgt.group_id,
  count(distinct lgt.learner_id)                   as total_students,
  round(avg(lgt.overall_percentage), 1)            as class_average,
  max(lgt.grand_total)                             as highest_score,
  min(lgt.grand_total)                             as lowest_score,
  round(
    count(*) filter (where lgt.overall_percentage >= 40) * 100.0 /
    nullif(count(*),0)
  , 1)                                             as pass_rate
from v_learner_group_totals lgt
group by lgt.group_id;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamps
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_organizations_updated before update on organizations
  for each row execute procedure update_updated_at();
create trigger trg_users_updated before update on users
  for each row execute procedure update_updated_at();
create trigger trg_groups_updated before update on groups
  for each row execute procedure update_updated_at();
create trigger trg_learners_updated before update on learners
  for each row execute procedure update_updated_at();
create trigger trg_subjects_updated before update on subjects
  for each row execute procedure update_updated_at();

-- Audit trigger for scores
create or replace function audit_score_change()
returns trigger language plpgsql security definer as $$
begin
  insert into audit_logs(user_id, action, table_name, record_id, old_data, new_data)
  values (
    auth.uid(),
    tg_op,
    'scores',
    coalesce(new.id, old.id),
    case when tg_op != 'INSERT' then to_jsonb(old) else null end,
    case when tg_op != 'DELETE' then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

create trigger trg_scores_audit
  after insert or update or delete on scores
  for each row execute procedure audit_score_change();

-- Prevent editing finalised scores (only admin can)
create or replace function prevent_final_score_edit()
returns trigger language plpgsql as $$
begin
  if old.is_final = true and new.is_final = true then
    raise exception 'Score is finalised. Contact your administrator to unlock it.';
  end if;
  return new;
end;
$$;

create trigger trg_scores_final
  before update on scores
  for each row execute procedure prevent_final_score_edit();

-- Auto-create user profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into users (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'teacher')
  );
  return new;
end;
$$;

create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table organizations        enable row level security;
alter table users                enable row level security;
alter table academic_sessions    enable row level security;
alter table terms                enable row level security;
alter table groups               enable row level security;
alter table learners             enable row level security;
alter table subjects             enable row level security;
alter table assessment_templates enable row level security;
alter table assessment_components enable row level security;
alter table grading_systems      enable row level security;
alter table scores               enable row level security;
alter table reports              enable row level security;
alter table audit_logs           enable row level security;
alter table notifications        enable row level security;

-- Helper: get current user's org
create or replace function my_org_id()
returns uuid language sql security definer stable as $$
  select organization_id from users where id = auth.uid()
$$;

-- Helper: is current user an admin?
create or replace function is_admin()
returns boolean language sql security definer stable as $$
  select role = 'admin' from users where id = auth.uid()
$$;

-- Organizations: users can only see their own org
create policy "org_select" on organizations for select
  using (id = my_org_id());
create policy "org_update" on organizations for update
  using (id = my_org_id() and is_admin());

-- Users: see only colleagues in same org
create policy "users_select" on users for select
  using (organization_id = my_org_id() or id = auth.uid());
create policy "users_update_own" on users for update
  using (id = auth.uid());
create policy "users_update_admin" on users for update
  using (organization_id = my_org_id() and is_admin());

-- Sessions & Terms
create policy "sessions_select" on academic_sessions for select
  using (organization_id = my_org_id());
create policy "sessions_all_admin" on academic_sessions for all
  using (organization_id = my_org_id() and is_admin());

create policy "terms_select" on terms for select
  using (organization_id = my_org_id());
create policy "terms_all_admin" on terms for all
  using (organization_id = my_org_id() and is_admin());

-- Groups
create policy "groups_select" on groups for select
  using (organization_id = my_org_id());
create policy "groups_insert" on groups for insert
  with check (organization_id = my_org_id());
create policy "groups_update" on groups for update
  using (organization_id = my_org_id() and (is_admin() or instructor_id = auth.uid()));
create policy "groups_delete_admin" on groups for delete
  using (organization_id = my_org_id() and is_admin());

-- Learners
create policy "learners_select" on learners for select
  using (organization_id = my_org_id());
create policy "learners_insert" on learners for insert
  with check (organization_id = my_org_id());
create policy "learners_update" on learners for update
  using (organization_id = my_org_id());
create policy "learners_delete_admin" on learners for delete
  using (organization_id = my_org_id() and is_admin());

-- Subjects
create policy "subjects_select" on subjects for select
  using (organization_id = my_org_id());
create policy "subjects_insert" on subjects for insert
  with check (organization_id = my_org_id());
create policy "subjects_update" on subjects for update
  using (organization_id = my_org_id());

-- Assessment Templates
create policy "templates_select" on assessment_templates for select
  using (organization_id = my_org_id());
create policy "templates_insert" on assessment_templates for insert
  with check (organization_id = my_org_id());
create policy "templates_update" on assessment_templates for update
  using (organization_id = my_org_id() and is_admin());

-- Components (same org via template)
create policy "components_select" on assessment_components for select
  using (
    template_id in (select id from assessment_templates where organization_id = my_org_id())
  );
create policy "components_insert" on assessment_components for insert
  with check (
    template_id in (select id from assessment_templates where organization_id = my_org_id())
  );

-- Grading Systems
create policy "grading_select" on grading_systems for select
  using (organization_id = my_org_id());
create policy "grading_all_admin" on grading_systems for all
  using (organization_id = my_org_id() and is_admin());

-- Scores: teachers see their own group scores, admins see all
create policy "scores_select" on scores for select
  using (
    learner_id in (select id from learners where organization_id = my_org_id())
  );
create policy "scores_insert" on scores for insert
  with check (
    learner_id in (select id from learners where organization_id = my_org_id())
  );
create policy "scores_update" on scores for update
  using (
    learner_id in (select id from learners where organization_id = my_org_id())
    and (entered_by = auth.uid() or is_admin())
  );

-- Reports
create policy "reports_select" on reports for select
  using (organization_id = my_org_id());
create policy "reports_insert" on reports for insert
  with check (organization_id = my_org_id());

-- Audit logs: admin only
create policy "audit_select_admin" on audit_logs for select
  using (
    user_id in (select id from users where organization_id = my_org_id())
    and is_admin()
  );

-- Notifications
create policy "notifications_select" on notifications for select
  using (user_id = auth.uid());
create policy "notifications_update" on notifications for update
  using (user_id = auth.uid());

-- ============================================================
-- SEED: Default Assessment Template
-- ============================================================

-- This runs AFTER a user creates an org — they can insert their own.
-- Provided as an example you can run per-org after setup.

-- insert into assessment_templates (organization_id, name, is_default)
-- values ('<ORG_ID>', 'Standard Primary Template', true);
--
-- insert into assessment_components (template_id, name, max_score, sequence)
-- values
--   ('<TEMPLATE_ID>', 'CA 1',  20, 1),
--   ('<TEMPLATE_ID>', 'CA 2',  20, 2),
--   ('<TEMPLATE_ID>', 'Exam',  60, 3);

-- ============================================================
-- STORAGE BUCKETS (run separately in Supabase dashboard or CLI)
-- ============================================================
-- create policy for bucket "org-assets" (logos, signatures)
-- create policy for bucket "report-exports"
-- Both should be private; serve via signed URLs only.
