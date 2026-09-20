-- Orange initial database schema for Supabase PostgreSQL
-- Run once in a NEW ORANGE-DEV project's SQL Editor.

begin;

create extension if not exists pgcrypto;

create type public.friendship_status as enum ('PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED');
create type public.group_role as enum ('OWNER', 'ADMIN', 'MEMBER');
create type public.split_method as enum ('EQUAL', 'CUSTOM');
create type public.activity_type as enum (
  'EXPENSE_CREATED',
  'EXPENSE_UPDATED',
  'EXPENSE_DELETED',
  'SETTLEMENT_CREATED'
);
create type public.notification_status as enum ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  display_name text not null,
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]{3,30}$')
);

create unique index profiles_username_unique_ci on public.profiles (lower(username));
create unique index profiles_email_unique_ci on public.profiles (lower(email));

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status public.friendship_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_not_self check (requester_id <> addressee_id)
);

create unique index friendships_unique_pair on public.friendships (
  least(requester_id, addressee_id),
  greatest(requester_id, addressee_id)
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text,
  image_url text,
  default_currency char(3) not null default 'USD' check (default_currency ~ '^[A-Z]{3}$'),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.group_role not null default 'MEMBER',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  description text not null check (char_length(trim(description)) between 1 and 160),
  total_amount numeric(14,2) not null check (total_amount > 0),
  currency char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  paid_by uuid not null references public.profiles(id),
  split_method public.split_method not null,
  expense_date date not null default current_date,
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expense_shares (
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  owed_amount numeric(14,2) not null check (owed_amount >= 0),
  created_at timestamptz not null default now(),
  primary key (expense_id, user_id)
);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  paid_by uuid not null references public.profiles(id),
  paid_to uuid not null references public.profiles(id),
  amount numeric(14,2) not null check (amount > 0),
  currency char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  settled_at timestamptz not null default now(),
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint settlements_different_users check (paid_by <> paid_to)
);

-- Immutable business history. For deletes, snapshot stores the removed expense data.
create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  activity_type public.activity_type not null,
  expense_id uuid references public.expenses(id) on delete set null,
  settlement_id uuid references public.settlements(id) on delete set null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_enabled boolean not null default true,
  expense_created boolean not null default true,
  expense_updated boolean not null default true,
  expense_deleted boolean not null default true,
  settlement_created boolean not null default true,
  updated_at timestamptz not null default now()
);

-- One row per recipient. A background worker sends and retries these emails.
create table public.email_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  activity_event_id uuid not null references public.activity_events(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  recipient_email text not null,
  status public.notification_status not null default 'PENDING',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_event_id, recipient_id)
);

create index friendships_requester_idx on public.friendships (requester_id, status);
create index friendships_addressee_idx on public.friendships (addressee_id, status);
create index group_members_user_idx on public.group_members (user_id, group_id);
create index expenses_group_date_idx on public.expenses (group_id, expense_date desc, created_at desc);
create index expense_shares_user_idx on public.expense_shares (user_id, expense_id);
create index settlements_group_date_idx on public.settlements (group_id, settled_at desc);
create index activity_events_group_date_idx on public.activity_events (group_id, created_at desc);
create index email_outbox_pending_idx on public.email_notification_outbox (status, next_attempt_at)
  where status in ('PENDING', 'FAILED');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger friendships_set_updated_at before update on public.friendships
for each row execute function public.set_updated_at();
create trigger groups_set_updated_at before update on public.groups
for each row execute function public.set_updated_at();
create trigger expenses_set_updated_at before update on public.expenses
for each row execute function public.set_updated_at();
create trigger notification_preferences_set_updated_at before update on public.notification_preferences
for each row execute function public.set_updated_at();
create trigger email_outbox_set_updated_at before update on public.email_notification_outbox
for each row execute function public.set_updated_at();

-- Gmail/Google OAuth users receive a profile automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
begin
  base_username := regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'preferred_username', split_part(new.email, '@', 1), 'orange_user'),
    '[^A-Za-z0-9_]', '_', 'g'
  );

  insert into public.profiles (id, username, display_name, email, avatar_url)
  values (
    new.id,
    left(base_username, 21) || '_' || left(replace(new.id::text, '-', ''), 8),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'Orange User'),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  );

  insert into public.notification_preferences (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Avoid recursive RLS checks on group_members.
create or replace function public.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = target_group_id and gm.user_id = auth.uid()
  );
$$;

create or replace function public.is_group_manager(target_group_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
      and gm.role in ('OWNER', 'ADMIN')
  );
$$;

grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_manager(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_shares enable row level security;
alter table public.settlements enable row level security;
alter table public.activity_events enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.email_notification_outbox enable row level security;

create policy profiles_read_authenticated on public.profiles
for select to authenticated using (true);
create policy profiles_update_self on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy friendships_read_participant on public.friendships
for select to authenticated using (auth.uid() in (requester_id, addressee_id));
create policy friendships_create_self on public.friendships
for insert to authenticated with check (requester_id = auth.uid() and status = 'PENDING');
create policy friendships_update_participant on public.friendships
for update to authenticated using (auth.uid() in (requester_id, addressee_id));
create policy friendships_delete_participant on public.friendships
for delete to authenticated using (auth.uid() in (requester_id, addressee_id));

create policy groups_read_member on public.groups
for select to authenticated using (public.is_group_member(id) or created_by = auth.uid());
create policy groups_create_self on public.groups
for insert to authenticated with check (created_by = auth.uid());
create policy groups_update_manager on public.groups
for update to authenticated using (public.is_group_manager(id));
create policy groups_delete_owner on public.groups
for delete to authenticated using (
  exists (select 1 from public.group_members gm where gm.group_id = id and gm.user_id = auth.uid() and gm.role = 'OWNER')
);

create policy group_members_read_member on public.group_members
for select to authenticated using (public.is_group_member(group_id) or user_id = auth.uid());
create policy group_members_add_manager_or_creator on public.group_members
for insert to authenticated with check (
  public.is_group_manager(group_id)
  or (user_id = auth.uid() and exists (
    select 1 from public.groups g where g.id = group_id and g.created_by = auth.uid()
  ))
);
create policy group_members_update_manager on public.group_members
for update to authenticated using (public.is_group_manager(group_id));
create policy group_members_delete_manager_or_self on public.group_members
for delete to authenticated using (public.is_group_manager(group_id) or user_id = auth.uid());

create policy expenses_read_member on public.expenses
for select to authenticated using (public.is_group_member(group_id));
create policy expenses_create_member on public.expenses
for insert to authenticated with check (public.is_group_member(group_id) and created_by = auth.uid());
create policy expenses_update_creator_or_manager on public.expenses
for update to authenticated using (created_by = auth.uid() or public.is_group_manager(group_id));
create policy expenses_delete_creator_or_manager on public.expenses
for delete to authenticated using (created_by = auth.uid() or public.is_group_manager(group_id));

create policy expense_shares_read_group_member on public.expense_shares
for select to authenticated using (
  exists (select 1 from public.expenses e where e.id = expense_id and public.is_group_member(e.group_id))
);
create policy expense_shares_create_expense_editor on public.expense_shares
for insert to authenticated with check (
  exists (select 1 from public.expenses e where e.id = expense_id and (e.created_by = auth.uid() or public.is_group_manager(e.group_id)))
);
create policy expense_shares_update_expense_editor on public.expense_shares
for update to authenticated using (
  exists (select 1 from public.expenses e where e.id = expense_id and (e.created_by = auth.uid() or public.is_group_manager(e.group_id)))
);
create policy expense_shares_delete_expense_editor on public.expense_shares
for delete to authenticated using (
  exists (select 1 from public.expenses e where e.id = expense_id and (e.created_by = auth.uid() or public.is_group_manager(e.group_id)))
);

create policy settlements_read_member on public.settlements
for select to authenticated using (public.is_group_member(group_id));
create policy settlements_create_member on public.settlements
for insert to authenticated with check (public.is_group_member(group_id) and created_by = auth.uid());
create policy settlements_delete_creator_or_manager on public.settlements
for delete to authenticated using (created_by = auth.uid() or public.is_group_manager(group_id));

create policy activity_read_member on public.activity_events
for select to authenticated using (public.is_group_member(group_id));
create policy activity_create_actor on public.activity_events
for insert to authenticated with check (public.is_group_member(group_id) and actor_id = auth.uid());

create policy notification_preferences_read_self on public.notification_preferences
for select to authenticated using (user_id = auth.uid());
create policy notification_preferences_update_self on public.notification_preferences
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- No client policy for email_notification_outbox. Only the trusted backend/service role processes it.

commit;

-- Application transaction rules to enforce in the backend:
-- 1. Insert/update an expense and its shares atomically.
-- 2. Sum(expense_shares.owed_amount) must equal expenses.total_amount.
-- 3. paid_by and every share user must be active members of the same group.
-- 4. In the same transaction, insert one activity_event and one outbox row for
--    every eligible group member except the actor.
-- 5. For deletion, write the activity snapshot/outbox rows before deleting the expense.
