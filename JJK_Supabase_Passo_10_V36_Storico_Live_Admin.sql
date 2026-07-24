-- JJK ENERGY - PASSO 10 / V36
-- Storico account/personaggi, presenza online, spettatore live e pannello proprietario.
-- Eseguire in Supabase SQL Editor dopo i Passi 2-9. Rieseguibile e non distruttivo.

begin;

create table if not exists public.jjk_site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);
create table if not exists public.jjk_account_controls (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_blocked boolean not null default false,
  is_deleted boolean not null default false,
  block_reason text,
  allowed_character_ids text[],
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
create table if not exists public.jjk_site_presence (
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  current_screen text not null default 'home',
  last_seen timestamptz not null default now(),
  primary key(user_id,client_id)
);
create index if not exists jjk_presence_seen_idx on public.jjk_site_presence(last_seen desc);

-- Riconoscimento automatico del proprietario. Se il nickname e' diverso, eseguire:
-- insert into public.jjk_site_admins(user_id,note)
-- select user_id,'Proprietario' from public.player_profiles where lower(account_tag)='TUO_NICKNAME'
-- on conflict(user_id) do nothing;
insert into public.jjk_site_admins(user_id,note)
select user_id,'Proprietario JJK Energy'
from public.player_profiles
where lower(coalesce(account_tag,'')) in ('marcocaruso01','marco_caruso','marcocaruso')
on conflict(user_id) do nothing;

alter table public.jjk_site_admins enable row level security;
alter table public.jjk_account_controls enable row level security;
alter table public.jjk_site_presence enable row level security;
revoke all on public.jjk_site_admins, public.jjk_account_controls, public.jjk_site_presence from public, anon, authenticated;

create or replace function public.jjk_is_site_admin()
returns boolean language sql stable security definer set search_path=''
as $$ select auth.uid() is not null and exists(select 1 from public.jjk_site_admins a where a.user_id=auth.uid()) $$;

create or replace function public.jjk_require_site_admin()
returns uuid language plpgsql stable security definer set search_path=''
as $$ begin if not public.jjk_is_site_admin() then raise exception 'ADMIN_ONLY' using errcode='P0001'; end if; return auth.uid(); end $$;

create or replace function public.jjk_require_user()
returns uuid language plpgsql stable security definer set search_path=''
as $$
declare v_user uuid:=auth.uid(); v_anon boolean:=false; v_ctl public.jjk_account_controls;
begin
 if v_user is null then raise exception 'AUTH_REQUIRED' using errcode='P0001'; end if;
 begin v_anon:=coalesce((auth.jwt()->>'is_anonymous')::boolean,false); exception when others then v_anon:=false; end;
 if v_anon then raise exception 'REGISTERED_ACCOUNT_REQUIRED' using errcode='P0001'; end if;
 select * into v_ctl from public.jjk_account_controls where user_id=v_user;
 if found and v_ctl.is_deleted then raise exception 'ACCOUNT_DELETED' using errcode='P0001'; end if;
 if found and v_ctl.is_blocked then raise exception 'ACCOUNT_BLOCKED: %',coalesce(v_ctl.block_reason,'Accesso sospeso') using errcode='P0001'; end if;
 return v_user;
end $$;

create or replace function public.jjk_enforce_account_controls_v36()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_ctl public.jjk_account_controls;
begin
 if new.user_id is null or coalesce(new.is_host,false) then return new; end if;
 select * into v_ctl from public.jjk_account_controls where user_id=new.user_id;
 if found and v_ctl.is_deleted then raise exception 'ACCOUNT_DELETED' using errcode='P0001'; end if;
 if found and v_ctl.is_blocked then raise exception 'ACCOUNT_BLOCKED: %',coalesce(v_ctl.block_reason,'Accesso sospeso') using errcode='P0001'; end if;
 if found and new.character_id is not null and cardinality(coalesce(v_ctl.allowed_character_ids,'{}'::text[]))>0 and not(new.character_id=any(v_ctl.allowed_character_ids)) then raise exception 'CHARACTER_NOT_ALLOWED' using errcode='P0001'; end if;
 return new;
end $$;
drop trigger if exists zz_jjk_enforce_account_controls_v36 on public.room_players;
create trigger zz_jjk_enforce_account_controls_v36 before insert or update of user_id,character_id on public.room_players for each row execute function public.jjk_enforce_account_controls_v36();

create or replace function public.jjk_presence_heartbeat(p_client_id text,p_screen text default 'home')
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=public.jjk_require_user(); v_client text:=left(regexp_replace(coalesce(p_client_id,''),'[^a-zA-Z0-9_-]','','g'),120); v_screen text:=left(regexp_replace(coalesce(p_screen,'home'),'[^a-zA-Z0-9_-]','','g'),60);
begin
 if length(v_client)<3 then raise exception 'INVALID_CLIENT_ID' using errcode='P0001'; end if;
 insert into public.jjk_site_presence(user_id,client_id,current_screen,last_seen) values(v_user,v_client,coalesce(nullif(v_screen,''),'home'),now()) on conflict(user_id,client_id) do update set current_screen=excluded.current_screen,last_seen=now();
 update public.player_profiles set last_seen_at=now(),updated_at=now() where user_id=v_user;
 delete from public.jjk_site_presence where last_seen<now()-interval '10 minutes';
 return jsonb_build_object('ok',true,'server_time',now());
end $$;

create or replace function public.jjk_online_users_v36()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_user uuid:=public.jjk_require_user(); v_result jsonb;
begin
 select coalesce(jsonb_agg(jsonb_build_object('user_id',q.user_id,'display_name',q.display_name,'account_tag',q.account_tag,'current_screen',q.current_screen,'current_screen_label',case q.current_screen when 'home' then 'Home' when 'statistics' then 'Statistiche' when 'rooms' then 'Stanze' when 'player' then 'In partita' when 'gameMaster' then 'Game Master' else 'Nel sito' end,'last_seen',q.last_seen,'in_match',q.in_match,'character_id',q.character_id) order by q.last_seen desc),'[]'::jsonb) into v_result
 from (
   select distinct on(sp.user_id) sp.user_id,pp.display_name,pp.account_tag,sp.current_screen,sp.last_seen,
     exists(select 1 from public.room_players rp join public.rooms r on r.id=rp.room_id where rp.user_id=sp.user_id and rp.left_at is null and rp.kicked_at is null and r.status='playing') as in_match,
     (select rp.character_id from public.room_players rp join public.rooms r on r.id=rp.room_id where rp.user_id=sp.user_id and rp.left_at is null and rp.kicked_at is null and r.status='playing' order by rp.last_seen desc limit 1) as character_id
   from public.jjk_site_presence sp join public.player_profiles pp on pp.user_id=sp.user_id left join public.jjk_account_controls ctl on ctl.user_id=sp.user_id
   where sp.last_seen>=now()-interval '90 seconds' and coalesce(ctl.is_blocked,false)=false and coalesce(ctl.is_deleted,false)=false order by sp.user_id,sp.last_seen desc
 ) q;
 return v_result;
end $$;

create or replace function public.jjk_live_matches_v36()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_user uuid:=public.jjk_require_user(); v_result jsonb;
begin
 select coalesce(jsonb_agg(jsonb_build_object(
   'room_id',r.id,'label','Partita live','duration_seconds',greatest(0,extract(epoch from(now()-coalesce(r.started_at,r.created_at)))::integer),
   'player_count',(select count(*) from public.room_players x where x.room_id=r.id and not x.is_host and x.left_at is null and x.kicked_at is null),
   'connected_players',(select count(*) from public.room_players x where x.room_id=r.id and not x.is_host and x.left_at is null and x.kicked_at is null and x.is_connected and x.last_seen>=now()-interval '120 seconds'),
   'gm_online',exists(select 1 from public.room_players x where x.room_id=r.id and x.is_host and x.is_connected and x.last_seen>=now()-interval '120 seconds'),
   'boss_rush_active',exists(select 1 from public.room_players x where x.room_id=r.id and x.boss_rush and x.left_at is null),
   'participants',(select coalesce(jsonb_agg(jsonb_build_object('player_name',x.player_name,'account_tag',pp.account_tag,'character_id',x.character_id,'is_connected',x.is_connected) order by coalesce(x.turn_order,99),x.joined_at),'[]'::jsonb) from public.room_players x left join public.player_profiles pp on pp.user_id=x.user_id where x.room_id=r.id and not x.is_host and x.left_at is null and x.kicked_at is null)
 ) order by coalesce(r.started_at,r.created_at) desc),'[]'::jsonb) into v_result from public.rooms r where r.status='playing';
 return v_result;
end $$;

create or replace function public.jjk_live_match_snapshot_v36(p_room_id uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_user uuid:=public.jjk_require_user(); v_room public.rooms; v_players jsonb;
begin
 select * into v_room from public.rooms where id=p_room_id and status='playing';
 if not found then raise exception 'LIVE_MATCH_NOT_FOUND' using errcode='P0001'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',rp.id,'player_name',rp.player_name,'account_tag',pp.account_tag,'character_id',rp.character_id,'is_host',rp.is_host,'is_connected',rp.is_connected and rp.last_seen>=now()-interval '120 seconds','is_locked',rp.is_locked,'boss_rush',rp.boss_rush,'state',case when rp.is_host then '{}'::jsonb else coalesce(ps.state,'{}'::jsonb)-'log' end) order by rp.is_host desc,coalesce(rp.turn_order,99),rp.joined_at),'[]'::jsonb) into v_players
 from public.room_players rp left join public.player_profiles pp on pp.user_id=rp.user_id left join public.player_states ps on ps.room_player_id=rp.id where rp.room_id=p_room_id and rp.left_at is null and rp.kicked_at is null;
 return jsonb_build_object('room_id',v_room.id,'label','Partita live','duration_seconds',greatest(0,extract(epoch from(now()-coalesce(v_room.started_at,v_room.created_at)))::integer),'players',v_players,'server_time',now());
end $$;

create or replace function public.jjk_match_history_v36(p_limit integer default 60,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_user uuid:=public.jjk_require_user(); v_result jsonb; v_limit integer:=greatest(1,least(coalesce(p_limit,60),200)); v_offset integer:=greatest(0,coalesce(p_offset,0));
begin
 select coalesce(jsonb_agg(jsonb_build_object(
   'match_id',m.id,'ended_at',m.ended_at,'duration_seconds',m.duration_seconds,'boss_rush_used',m.boss_rush_used,
   'winner_name',(select pp.display_name from public.match_participants mp join public.player_profiles pp on pp.user_id=mp.user_id where mp.match_id=m.id and mp.is_winner limit 1),
   'total_techniques',0,
   'participants',(select coalesce(jsonb_agg(jsonb_build_object('user_id',mp.user_id,'player_name',pp.display_name,'account_tag',pp.account_tag,'character_id',mp.character_id,'is_winner',mp.is_winner) order by mp.is_winner desc,pp.account_tag),'[]'::jsonb) from public.match_participants mp join public.player_profiles pp on pp.user_id=mp.user_id where mp.match_id=m.id)
 ) order by m.ended_at desc),'[]'::jsonb) into v_result from (select * from public.matches where ended_at is not null order by ended_at desc limit v_limit offset v_offset) m;
 return v_result;
end $$;

create or replace function public.jjk_admin_dashboard_v36(p_search text default null,p_limit integer default 200)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_admin uuid:=public.jjk_require_site_admin(); v_result jsonb; v_term text:='%'||lower(btrim(coalesce(p_search,'')))||'%';
begin
 select coalesce(jsonb_agg(jsonb_build_object('user_id',pp.user_id,'display_name',pp.display_name,'account_tag',pp.account_tag,'registered_at',pp.registered_at,'last_seen_at',pp.last_seen_at,'is_blocked',coalesce(ctl.is_blocked,false),'is_deleted',coalesce(ctl.is_deleted,false),'block_reason',ctl.block_reason,'allowed_character_ids',ctl.allowed_character_ids,'online',exists(select 1 from public.jjk_site_presence sp where sp.user_id=pp.user_id and sp.last_seen>=now()-interval '90 seconds'),'matches',(select count(*) from public.match_participants mp where mp.user_id=pp.user_id),'wins',(select count(*) from public.match_participants mp where mp.user_id=pp.user_id and mp.is_winner)) order by pp.registered_at desc nulls last,pp.account_tag),'[]'::jsonb) into v_result
 from public.player_profiles pp left join public.jjk_account_controls ctl on ctl.user_id=pp.user_id where p_search is null or btrim(p_search)='' or lower(coalesce(pp.account_tag,'')) like v_term or lower(coalesce(pp.display_name,'')) like v_term limit greatest(1,least(coalesce(p_limit,200),500));
 return v_result;
end $$;

create or replace function public.jjk_admin_update_account_v36(p_user_id uuid,p_display_name text default null,p_account_tag text default null,p_is_blocked boolean default false,p_block_reason text default null,p_allowed_character_ids text[] default null)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_admin uuid:=public.jjk_require_site_admin(); v_name text:=left(btrim(coalesce(p_display_name,'')),30); v_tag text:=lower(left(btrim(coalesce(p_account_tag,'')),20));
begin
 if p_user_id=v_admin and p_is_blocked then raise exception 'CANNOT_BLOCK_SELF' using errcode='P0001'; end if;
 if v_name<>'' then update public.player_profiles set display_name=v_name,updated_at=now() where user_id=p_user_id; update public.room_players set player_name=v_name where user_id=p_user_id and left_at is null and kicked_at is null; end if;
 if v_tag<>'' then if v_tag!~'^[a-z0-9_]{3,20}$' then raise exception 'INVALID_ACCOUNT_TAG' using errcode='P0001'; end if; if exists(select 1 from public.player_profiles where lower(account_tag)=v_tag and user_id<>p_user_id) then raise exception 'ACCOUNT_TAG_TAKEN' using errcode='P0001'; end if; update public.player_profiles set account_tag=v_tag,updated_at=now() where user_id=p_user_id; end if;
 insert into public.jjk_account_controls(user_id,is_blocked,is_deleted,block_reason,allowed_character_ids,updated_at,updated_by) values(p_user_id,coalesce(p_is_blocked,false),false,nullif(btrim(coalesce(p_block_reason,'')),''),case when cardinality(coalesce(p_allowed_character_ids,'{}'::text[]))=0 then null else p_allowed_character_ids end,now(),v_admin) on conflict(user_id) do update set is_blocked=excluded.is_blocked,is_deleted=false,block_reason=excluded.block_reason,allowed_character_ids=excluded.allowed_character_ids,updated_at=now(),updated_by=v_admin;
 if p_is_blocked then update public.room_players set is_connected=false,is_locked=true,left_at=coalesce(left_at,now()) where user_id=p_user_id and left_at is null; delete from public.jjk_site_presence where user_id=p_user_id; end if;
 return jsonb_build_object('ok',true,'user_id',p_user_id);
end $$;

create or replace function public.jjk_admin_delete_account_v36(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_admin uuid:=public.jjk_require_site_admin();
begin
 if p_user_id=v_admin then raise exception 'CANNOT_DELETE_SELF' using errcode='P0001'; end if;
 insert into public.jjk_account_controls(user_id,is_blocked,is_deleted,block_reason,updated_at,updated_by) values(p_user_id,true,true,'Account eliminato dal proprietario',now(),v_admin) on conflict(user_id) do update set is_blocked=true,is_deleted=true,block_reason='Account eliminato dal proprietario',updated_at=now(),updated_by=v_admin;
 update public.room_players set is_connected=false,is_locked=true,left_at=coalesce(left_at,now()) where user_id=p_user_id and left_at is null;
 delete from public.jjk_site_presence where user_id=p_user_id;
 update public.player_profiles set display_name='Account eliminato',account_tag=null,updated_at=now() where user_id=p_user_id;
 return jsonb_build_object('ok',true,'user_id',p_user_id,'soft_deleted',true);
end $$;

revoke all on function public.jjk_is_site_admin() from public,anon;
revoke all on function public.jjk_presence_heartbeat(text,text) from public,anon;
revoke all on function public.jjk_online_users_v36() from public,anon;
revoke all on function public.jjk_live_matches_v36() from public,anon;
revoke all on function public.jjk_live_match_snapshot_v36(uuid) from public,anon;
revoke all on function public.jjk_match_history_v36(integer,integer) from public,anon;
revoke all on function public.jjk_admin_dashboard_v36(text,integer) from public,anon;
revoke all on function public.jjk_admin_update_account_v36(uuid,text,text,boolean,text,text[]) from public,anon;
revoke all on function public.jjk_admin_delete_account_v36(uuid) from public,anon;
grant execute on function public.jjk_is_site_admin() to authenticated;
grant execute on function public.jjk_presence_heartbeat(text,text) to authenticated;
grant execute on function public.jjk_online_users_v36() to authenticated;
grant execute on function public.jjk_live_matches_v36() to authenticated;
grant execute on function public.jjk_live_match_snapshot_v36(uuid) to authenticated;
grant execute on function public.jjk_match_history_v36(integer,integer) to authenticated;
grant execute on function public.jjk_admin_dashboard_v36(text,integer) to authenticated;
grant execute on function public.jjk_admin_update_account_v36(uuid,text,text,boolean,text,text[]) to authenticated;
grant execute on function public.jjk_admin_delete_account_v36(uuid) to authenticated;

commit;

select 'V36 pronta' as stato, public.jjk_is_site_admin() as account_corrente_amministratore, (select count(*) from public.jjk_site_admins) as amministratori_registrati;
