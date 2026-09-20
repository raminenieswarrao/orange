-- Run once after orange_initial_schema.sql.
-- Only the recipient can accept or decline a pending friend request.

begin;

drop policy if exists friendships_update_participant
on public.friendships;

create policy friendships_respond_addressee
on public.friendships
for update
to authenticated
using (
    addressee_id = auth.uid()
    and status = 'PENDING'
)
with check (
    addressee_id = auth.uid()
    and status in ('ACCEPTED', 'DECLINED', 'BLOCKED')
);

commit;