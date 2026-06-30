-- ============================================================
-- PeopleCore HRMS — Supabase Database Setup
-- Run this entire file in Supabase SQL Editor (once)
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- 1. DEPARTMENTS
-- ─────────────────────────────────────────
create table if not exists departments (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  head_name text,
  created_at timestamptz default now()
);

insert into departments (name, head_name) values
  ('Engineering', ''),
  ('Marketing', ''),
  ('Sales', ''),
  ('Administration', ''),
  ('Research', ''),
  ('HR', ''),
  ('Finance', ''),
  ('Design', ''),
  ('Operations', '')
on conflict (name) do nothing;

-- ─────────────────────────────────────────
-- 2. EMPLOYEES (linked to auth.users)
-- ─────────────────────────────────────────
create table if not exists employees (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  employee_code text unique not null,
  first_name text not null,
  last_name text not null,
  email text not null unique,
  phone text,
  department text,
  designation text,
  role text default 'employee' check (role in ('admin','employee')),
  date_of_joining date,
  manager_id uuid references employees(id) on delete set null,
  gross_salary numeric(12,2) default 0,
  pf_percent numeric(5,2) default 12,
  tax_amount numeric(12,2) default 0,
  status text default 'active' check (status in ('active','inactive','on-leave')),
  avatar_color text default '#4F46E5',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- 3. ATTENDANCE
-- ─────────────────────────────────────────
create table if not exists attendance (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid references employees(id) on delete cascade,
  date date not null,
  check_in timestamptz,
  check_out timestamptz,
  type text default 'Office' check (type in ('Office','WFH','Half Day')),
  status text default 'present' check (status in ('present','absent','on-leave')),
  hours_worked numeric(5,2),
  notes text,
  created_at timestamptz default now(),
  unique(employee_id, date)
);

-- ─────────────────────────────────────────
-- 4. LEAVE REQUESTS
-- ─────────────────────────────────────────
create table if not exists leave_requests (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid references employees(id) on delete cascade,
  leave_type text not null check (leave_type in ('Annual Leave','Sick Leave','Casual Leave','Comp Off','Work From Home','Maternity Leave','Paternity Leave','Unpaid Leave')),
  from_date date not null,
  to_date date not null,
  days integer not null,
  reason text,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  approved_by uuid references employees(id),
  approved_at timestamptz,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- 5. LEAVE BALANCES
-- ─────────────────────────────────────────
create table if not exists leave_balances (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid references employees(id) on delete cascade,
  leave_type text not null,
  total_days integer default 0,
  used_days integer default 0,
  year integer default extract(year from now()),
  unique(employee_id, leave_type, year)
);

-- ─────────────────────────────────────────
-- 6. HOLIDAYS
-- ─────────────────────────────────────────
create table if not exists holidays (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  date date not null unique,
  type text default 'National' check (type in ('National','Festival','Optional','Company')),
  created_at timestamptz default now()
);

insert into holidays (name, date, type) values
  ('New Year''s Day', '2026-01-01', 'National'),
  ('Republic Day', '2026-01-26', 'National'),
  ('Holi', '2026-03-25', 'Festival'),
  ('Dr. Ambedkar Jayanti', '2026-04-14', 'National'),
  ('Labour Day', '2026-05-01', 'National'),
  ('Independence Day', '2026-08-15', 'National'),
  ('Gandhi Jayanti', '2026-10-02', 'National'),
  ('Dussehra', '2026-10-22', 'Festival'),
  ('Diwali', '2026-11-11', 'Festival'),
  ('Christmas Day', '2026-12-25', 'National')
on conflict (date) do nothing;

-- ─────────────────────────────────────────
-- 7. PAYROLL
-- ─────────────────────────────────────────
create table if not exists payroll (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid references employees(id) on delete cascade,
  month integer not null,
  year integer not null,
  gross_salary numeric(12,2),
  basic numeric(12,2),
  hra numeric(12,2),
  special_allowance numeric(12,2),
  transport_allowance numeric(12,2),
  pf_deduction numeric(12,2),
  tax_deduction numeric(12,2),
  professional_tax numeric(12,2) default 200,
  other_deductions numeric(12,2) default 0,
  net_pay numeric(12,2),
  status text default 'pending' check (status in ('pending','processed','paid')),
  processed_at timestamptz,
  created_at timestamptz default now(),
  unique(employee_id, month, year)
);

-- ─────────────────────────────────────────
-- 8. INCENTIVES / BONUSES
-- ─────────────────────────────────────────
create table if not exists incentives (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid references employees(id) on delete cascade,
  type text not null check (type in ('Performance Bonus','Spot Award','Target Achievement','Referral Bonus','Annual Bonus','Festival Bonus','Other')),
  amount numeric(12,2) not null,
  period text,
  notes text,
  status text default 'pending' check (status in ('pending','approved','paid')),
  approved_by uuid references employees(id),
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- 9. WELLBEING SURVEYS
-- ─────────────────────────────────────────
create table if not exists wellbeing_surveys (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid references employees(id) on delete cascade,
  month integer not null,
  year integer not null,
  mood_score integer check (mood_score between 1 and 5),
  workload_score integer check (workload_score between 1 and 5),
  team_score integer check (team_score between 1 and 5),
  balance_score integer check (balance_score between 1 and 5),
  motivation_score integer check (motivation_score between 1 and 5),
  overall_score numeric(5,2),
  comments text,
  created_at timestamptz default now(),
  unique(employee_id, month, year)
);

-- ─────────────────────────────────────────
-- 10. ANNOUNCEMENTS
-- ─────────────────────────────────────────
create table if not exists announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  content text not null,
  category text default 'General' check (category in ('HR','Notice','Benefits','Event','Policy','General')),
  author_id uuid references employees(id),
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- 11. DOCUMENTS
-- ─────────────────────────────────────────
create table if not exists documents (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text default 'Policy' check (type in ('Policy','Template','Form','Payslip','Offer Letter','Other')),
  url text,
  employee_id uuid references employees(id) on delete cascade,
  is_company_wide boolean default false,
  size_kb integer,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────

alter table employees enable row level security;
alter table attendance enable row level security;
alter table leave_requests enable row level security;
alter table leave_balances enable row level security;
alter table payroll enable row level security;
alter table incentives enable row level security;
alter table wellbeing_surveys enable row level security;
alter table announcements enable row level security;
alter table documents enable row level security;
alter table holidays enable row level security;
alter table departments enable row level security;

-- Helper: get current employee's DB record
create or replace function get_my_employee_id()
returns uuid language sql stable as $$
  select id from employees where user_id = auth.uid() limit 1;
$$;

-- Helper: is current user an admin?
create or replace function is_admin()
returns boolean language sql stable as $$
  select exists (
    select 1 from employees where user_id = auth.uid() and role = 'admin'
  );
$$;

-- EMPLOYEES policies
create policy "Admin sees all employees" on employees for select using (is_admin());
create policy "Employee sees own record" on employees for select using (user_id = auth.uid());
create policy "Admin can insert employees" on employees for insert with check (is_admin());
create policy "Admin can update employees" on employees for update using (is_admin());
create policy "Employee can update own record" on employees for update using (user_id = auth.uid());

-- ATTENDANCE policies
create policy "Admin sees all attendance" on attendance for select using (is_admin());
create policy "Employee sees own attendance" on attendance for select using (employee_id = get_my_employee_id());
create policy "Employee can insert own attendance" on attendance for insert with check (employee_id = get_my_employee_id());
create policy "Employee can update own attendance" on attendance for update using (employee_id = get_my_employee_id());
create policy "Admin can manage attendance" on attendance for all using (is_admin());

-- LEAVE REQUESTS policies
create policy "Admin sees all leaves" on leave_requests for select using (is_admin());
create policy "Employee sees own leaves" on leave_requests for select using (employee_id = get_my_employee_id());
create policy "Employee can apply leave" on leave_requests for insert with check (employee_id = get_my_employee_id());
create policy "Admin can update leave status" on leave_requests for update using (is_admin());

-- LEAVE BALANCES policies
create policy "Admin sees all balances" on leave_balances for select using (is_admin());
create policy "Employee sees own balance" on leave_balances for select using (employee_id = get_my_employee_id());
create policy "Admin manages balances" on leave_balances for all using (is_admin());

-- PAYROLL policies
create policy "Admin sees all payroll" on payroll for select using (is_admin());
create policy "Employee sees own payroll" on payroll for select using (employee_id = get_my_employee_id());
create policy "Admin manages payroll" on payroll for all using (is_admin());

-- INCENTIVES policies
create policy "Admin sees all incentives" on incentives for select using (is_admin());
create policy "Employee sees own incentives" on incentives for select using (employee_id = get_my_employee_id());
create policy "Admin manages incentives" on incentives for all using (is_admin());

-- WELLBEING policies
create policy "Admin sees all wellbeing" on wellbeing_surveys for select using (is_admin());
create policy "Employee sees own wellbeing" on wellbeing_surveys for select using (employee_id = get_my_employee_id());
create policy "Employee can submit wellbeing" on wellbeing_surveys for insert with check (employee_id = get_my_employee_id());
create policy "Employee can update own wellbeing" on wellbeing_surveys for update using (employee_id = get_my_employee_id());

-- ANNOUNCEMENTS - everyone can read, only admin writes
create policy "Everyone reads announcements" on announcements for select using (auth.role() = 'authenticated');
create policy "Admin manages announcements" on announcements for all using (is_admin());

-- DOCUMENTS - company-wide visible to all, personal visible to owner
create policy "Everyone sees company docs" on documents for select using (is_company_wide = true and auth.role() = 'authenticated');
create policy "Employee sees own docs" on documents for select using (employee_id = get_my_employee_id());
create policy "Admin manages all docs" on documents for all using (is_admin());

-- HOLIDAYS - everyone can read
create policy "Everyone reads holidays" on holidays for select using (auth.role() = 'authenticated');
create policy "Admin manages holidays" on holidays for all using (is_admin());

-- DEPARTMENTS - everyone can read
create policy "Everyone reads departments" on departments for select using (auth.role() = 'authenticated');
create policy "Admin manages departments" on departments for all using (is_admin());

-- ─────────────────────────────────────────
-- FUNCTIONS
-- ─────────────────────────────────────────

-- Auto-compute payroll net pay
create or replace function compute_payroll()
returns trigger language plpgsql as $$
begin
  new.basic := round(new.gross_salary * 0.50, 2);
  new.hra := round(new.gross_salary * 0.20, 2);
  new.special_allowance := round(new.gross_salary * 0.20, 2);
  new.transport_allowance := round(new.gross_salary * 0.10, 2);
  new.pf_deduction := round(new.gross_salary * 0.12, 2);
  new.net_pay := new.gross_salary - new.pf_deduction - new.tax_deduction - new.professional_tax - new.other_deductions;
  return new;
end;
$$;

create trigger trg_compute_payroll
before insert or update on payroll
for each row execute function compute_payroll();

-- Auto-update wellbeing overall score
create or replace function compute_wellbeing_score()
returns trigger language plpgsql as $$
begin
  new.overall_score := round(
    ((new.mood_score + new.workload_score + new.team_score + new.balance_score + new.motivation_score) / 5.0) * 20, 1
  );
  return new;
end;
$$;

create trigger trg_wellbeing_score
before insert or update on wellbeing_surveys
for each row execute function compute_wellbeing_score();

-- Auto-update employee updated_at
create or replace function update_modified_column()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_employee_updated
before update on employees
for each row execute function update_modified_column();

-- ─────────────────────────────────────────
-- SAMPLE COMPANY DOCUMENTS
-- ─────────────────────────────────────────
insert into documents (name, type, is_company_wide) values
  ('Employee Handbook 2026.pdf', 'Policy', true),
  ('Leave Policy 2026.pdf', 'Policy', true),
  ('Code of Conduct.pdf', 'Policy', true),
  ('Offer Letter Template.pdf', 'Template', true),
  ('Appraisal Form 2026.pdf', 'Form', true)
on conflict do nothing;

-- ─────────────────────────────────────────
-- SAMPLE ANNOUNCEMENTS (after admin user created, update author_id)
-- ─────────────────────────────────────────
insert into announcements (title, content, category) values
  ('Welcome to PeopleCore HRMS!', 'Your HR management system is now live. Please complete your profile and mark attendance daily.', 'Notice'),
  ('Leave Policy Reminder', 'Annual leave applications must be submitted at least 3 days in advance. Refer to the Leave Policy document for details.', 'Policy')
on conflict do nothing;

-- ============================================================
-- DONE! Next: create your admin user in Supabase Auth,
-- then run the INSERT below (replace the email):
--
-- insert into employees (employee_code, first_name, last_name, email, role, department, designation, user_id)
-- values ('EMP001', 'Your', 'Name', 'your@email.com', 'admin', 'Administration', 'HR Manager',
--   (select id from auth.users where email = 'your@email.com'));
-- ============================================================
