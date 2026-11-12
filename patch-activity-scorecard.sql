-- Market Mavericks HRMS: Activity Calendar + Performance Scorecard
-- Run once in Supabase > SQL Editor > New query > Run. Safe to run again.

-- helper functions (security definer so RLS does not recurse)
create or replace function public.mm_is_admin() returns boolean
language sql stable security definer set search_path=public as
$$ select exists(select 1 from employees where user_id=auth.uid() and role='admin') $$;

create or replace function public.mm_emp_id() returns uuid
language sql stable security definer set search_path=public as
$$ select id from employees where user_id=auth.uid() limit 1 $$;

create or replace function public.mm_manages(emp uuid) returns boolean
language sql stable security definer set search_path=public as
$$ select exists(select 1 from employees e where e.id=emp and e.manager_id=(select id from employees where user_id=auth.uid() limit 1)) $$;

-- tables (all child rows cascade when an employee is deleted)
create table if not exists activity_logs(
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  log_date date not null,
  category text not null,
  summary text not null,
  hours numeric default 0,
  units integer default 0,
  created_at timestamptz default now()
);
create index if not exists activity_logs_emp_date on activity_logs(employee_id,log_date);

create table if not exists activity_events(
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type text not null default 'event',
  start_date date not null,
  end_date date not null,
  start_time text,
  end_time text,
  location text,
  description text,
  created_by uuid references employees(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists perf_targets(
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  month int not null, year int not null,
  title text not null,
  target numeric not null default 0,
  achieved numeric not null default 0,
  unit text,
  set_by uuid references employees(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists perf_targets_emp on perf_targets(employee_id,year,month);

create table if not exists perf_ratings(
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  month int not null, year int not null,
  rating numeric not null check (rating>=1 and rating<=5),
  comments text,
  rated_by uuid references employees(id) on delete set null,
  updated_at timestamptz default now(),
  unique(employee_id,year,month)
);

create table if not exists perf_tasks(
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  title text not null,
  due_date date,
  priority text default 'normal',
  status text not null default 'todo',
  assigned_by uuid references employees(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists perf_tasks_emp on perf_tasks(employee_id,due_date);

-- row level security
alter table activity_logs enable row level security;
alter table activity_events enable row level security;
alter table perf_targets enable row level security;
alter table perf_ratings enable row level security;
alter table perf_tasks enable row level security;

do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname='public'
    and tablename in ('activity_logs','activity_events','perf_targets','perf_ratings','perf_tasks')
  loop execute format('drop policy %I on %I', r.policyname, r.tablename); end loop;
end $$;

-- work log: see own / admin sees all / manager sees team; write own (admin any)
create policy al_sel on activity_logs for select to authenticated using (employee_id=mm_emp_id() or mm_is_admin() or mm_manages(employee_id));
create policy al_ins on activity_logs for insert to authenticated with check (employee_id=mm_emp_id() or mm_is_admin());
create policy al_upd on activity_logs for update to authenticated using (employee_id=mm_emp_id() or mm_is_admin());
create policy al_del on activity_logs for delete to authenticated using (employee_id=mm_emp_id() or mm_is_admin());

-- events and batches: everyone reads, admin writes
create policy ae_sel on activity_events for select to authenticated using (true);
create policy ae_ins on activity_events for insert to authenticated with check (mm_is_admin());
create policy ae_upd on activity_events for update to authenticated using (mm_is_admin());
create policy ae_del on activity_events for delete to authenticated using (mm_is_admin());

-- targets: employee reads own; admin or the employee's manager writes
create policy pt_sel on perf_targets for select to authenticated using (employee_id=mm_emp_id() or mm_is_admin() or mm_manages(employee_id));
create policy pt_ins on perf_targets for insert to authenticated with check (mm_is_admin() or mm_manages(employee_id));
create policy pt_upd on perf_targets for update to authenticated using (mm_is_admin() or mm_manages(employee_id));
create policy pt_del on perf_targets for delete to authenticated using (mm_is_admin() or mm_manages(employee_id));

-- manager rating: employee reads own; admin or manager writes (a manager cannot rate themselves)
create policy pr_sel on perf_ratings for select to authenticated using (employee_id=mm_emp_id() or mm_is_admin() or mm_manages(employee_id));
create policy pr_ins on perf_ratings for insert to authenticated with check (mm_is_admin() or (mm_manages(employee_id) and employee_id<>mm_emp_id()));
create policy pr_upd on perf_ratings for update to authenticated using (mm_is_admin() or (mm_manages(employee_id) and employee_id<>mm_emp_id()));
create policy pr_del on perf_ratings for delete to authenticated using (mm_is_admin() or mm_manages(employee_id));

-- tasks: employee can add and tick their own; admin/manager assign and manage
create policy pk_sel on perf_tasks for select to authenticated using (employee_id=mm_emp_id() or mm_is_admin() or mm_manages(employee_id));
create policy pk_ins on perf_tasks for insert to authenticated with check (mm_is_admin() or mm_manages(employee_id) or employee_id=mm_emp_id());
create policy pk_upd on perf_tasks for update to authenticated using (mm_is_admin() or mm_manages(employee_id) or employee_id=mm_emp_id());
create policy pk_del on perf_tasks for delete to authenticated using (mm_is_admin() or mm_manages(employee_id) or (employee_id=mm_emp_id() and assigned_by=mm_emp_id()));
