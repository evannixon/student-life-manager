-- Jalankan SQL ini di Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > paste ini > Run

-- ============================================
-- TABLE: transactions
-- ============================================
create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  amount integer not null,
  category text not null default 'lainnya',
  date date not null default current_date,
  icon text not null default '💸',
  created_at timestamptz default now()
);

-- Enable Row Level Security (RLS) — user hanya bisa lihat data sendiri
alter table transactions enable row level security;

create policy "Users can view own transactions"
  on transactions for select using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on transactions for insert with check (auth.uid() = user_id);

create policy "Users can delete own transactions"
  on transactions for delete using (auth.uid() = user_id);

-- Enable Realtime
alter publication supabase_realtime add table transactions;

-- ============================================
-- TABLE: tasks
-- ============================================
create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  subject text not null,
  deadline date not null,
  difficulty integer not null default 3 check (difficulty between 1 and 5),
  status text not null default 'todo' check (status in ('todo', 'progress', 'done')),
  danger_score integer not null default 50,
  created_at timestamptz default now()
);

alter table tasks enable row level security;

create policy "Users can view own tasks"
  on tasks for select using (auth.uid() = user_id);

create policy "Users can insert own tasks"
  on tasks for insert with check (auth.uid() = user_id);

create policy "Users can update own tasks"
  on tasks for update using (auth.uid() = user_id);

create policy "Users can delete own tasks"
  on tasks for delete using (auth.uid() = user_id);

-- Enable Realtime
alter publication supabase_realtime add table tasks;

-- Done!
select 'Setup selesai! Tabel transactions dan tasks siap dipakai.' as status;
