create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade not null,
  recruiter_id uuid references profiles(id) on delete set null,
  content text not null,
  direction text not null check (direction in ('outbound', 'inbound')),
  channel text not null default 'internal' check (channel in ('internal', 'whatsapp', 'sms', 'email')),
  status text not null default 'sent' check (status in ('sending', 'sent', 'delivered', 'read', 'failed')),
  whatsapp_message_sid text,
  created_at timestamptz default now() not null
);

create index if not exists messages_candidate_id_idx on messages(candidate_id);
create index if not exists messages_created_at_idx on messages(created_at desc);

alter table messages enable row level security;
create policy "Authenticated users can manage messages" on messages
  for all using (auth.role() = 'authenticated');

-- Allow realtime
alter publication supabase_realtime add table messages;
