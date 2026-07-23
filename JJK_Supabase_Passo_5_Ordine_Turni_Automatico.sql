-- JJK ENERGY - PASSO 5
-- Ordine dei turni scelto dal Game Master e avanzamento automatico.
-- Eseguire UNA VOLTA dopo i Passi 2, 3 e 4.
-- Lo script non cancella stanze, partite o statistiche esistenti.

begin;

-- =========================================================
-- 1. POSIZIONE DEL GIOCATORE NEL GIRO DEI TURNI
-- =========================================================

alter table public.room_players
  add column if not exists turn_order smallint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'room_players_turn_order_range'
      and conrelid = 'public.room_players'::regclass
  ) then
    alter table public.room_players
      add constraint room_players_turn_order_range
      check (turn_order is null or turn_order between 1 and 8);
  end if;
end;
$$;

create index if not exists room_players_turn_order_idx
  on public.room_players(room_id, turn_order)
  where is_host = false
    and left_at is null
    and kicked_at is null;

-- Compatibilita con eventuali partite gia in corso al momento della migrazione:
-- assegna temporaneamente l'ordine di ingresso. Dalla prossima partita il GM
-- dovra scegliere e salvare esplicitamente la sequenza.
with ranked_players as (
  select rp.id,
         row_number() over (partition by rp.room_id order by rp.joined_at, rp.id)::smallint as position
  from public.room_players rp
  join public.rooms r on r.id = rp.room_id
  where r.status = 'playing'
    and rp.is_host = false
    and rp.left_at is null
    and rp.kicked_at is null
    and rp.turn_order is null
)
update public.room_players rp
set turn_order = ranked_players.position
from ranked_players
where rp.id = ranked_players.id;

-- =========================================================
-- 2. IL GAME MASTER SALVA L'ORDINE SCELTO
-- =========================================================

create or replace function public.jjk_gm_set_turn_order(
  p_room_id uuid,
  p_player_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_active_count integer;
  v_supplied_count integer;
  v_distinct_count integer;
  v_player_id uuid;
  v_position integer := 0;
  v_order jsonb;
begin
  perform public.jjk_require_user();

  if not public.jjk_is_room_host(p_room_id) then
    raise exception 'HOST_ONLY' using errcode = 'P0001';
  end if;

  select r.status into v_status
  from public.rooms r
  where r.id = p_room_id
  for update;

  if not found then
    raise exception 'ROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_status <> 'selection' then
    raise exception 'TURN_ORDER_ONLY_DURING_SELECTION' using errcode = 'P0001';
  end if;

  select count(*) into v_active_count
  from public.room_players rp
  where rp.room_id = p_room_id
    and rp.is_host = false
    and rp.left_at is null
    and rp.kicked_at is null;

  v_supplied_count := coalesce(cardinality(p_player_ids), 0);

  if v_active_count < 1 then
    raise exception 'NO_PLAYERS' using errcode = 'P0001';
  end if;

  if v_supplied_count <> v_active_count then
    raise exception 'TURN_ORDER_PLAYER_MISMATCH' using errcode = 'P0001';
  end if;

  select count(distinct x.player_id) into v_distinct_count
  from unnest(p_player_ids) as x(player_id);

  if v_distinct_count <> v_active_count then
    raise exception 'INVALID_TURN_ORDER' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from unnest(p_player_ids) as x(player_id)
    left join public.room_players rp
      on rp.id = x.player_id
     and rp.room_id = p_room_id
     and rp.is_host = false
     and rp.left_at is null
     and rp.kicked_at is null
    where rp.id is null
  ) then
    raise exception 'TURN_ORDER_PLAYER_MISMATCH' using errcode = 'P0001';
  end if;

  -- Azzera prima tutte le posizioni per consentire qualsiasi riordinamento.
  update public.room_players
  set turn_order = null
  where room_id = p_room_id
    and is_host = false
    and left_at is null
    and kicked_at is null;

  foreach v_player_id in array p_player_ids loop
    v_position := v_position + 1;

    update public.room_players
    set turn_order = v_position
    where id = v_player_id
      and room_id = p_room_id
      and is_host = false
      and left_at is null
      and kicked_at is null;

    if not found then
      raise exception 'TURN_ORDER_PLAYER_MISMATCH' using errcode = 'P0001';
    end if;
  end loop;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'player_id', rp.id,
        'player_name', rp.player_name,
        'character_id', rp.character_id,
        'turn_order', rp.turn_order
      ) order by rp.turn_order
    ),
    '[]'::jsonb
  ) into v_order
  from public.room_players rp
  where rp.room_id = p_room_id
    and rp.is_host = false
    and rp.left_at is null
    and rp.kicked_at is null;

  perform public.jjk_add_event(
    p_room_id,
    null,
    'turn_order_set',
    jsonb_build_object('order', v_order)
  );

  return jsonb_build_object(
    'room_id', p_room_id,
    'order', v_order,
    'players', v_active_count
  );
end;
$$;

-- =========================================================
-- 3. NUOVA SCELTA PERSONAGGI = NUOVO ORDINE DA DEFINIRE
-- =========================================================

create or replace function public.jjk_start_character_selection(p_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.jjk_require_user();

  if not public.jjk_is_room_host(p_room_id) then
    raise exception 'HOST_ONLY' using errcode = 'P0001';
  end if;

  update public.rooms
  set status = 'selection'
  where id = p_room_id
    and status in ('lobby', 'selection', 'ended');

  if not found then
    raise exception 'INVALID_ROOM_STATUS' using errcode = 'P0001';
  end if;

  update public.room_players
  set is_locked = true,
      turn_order = null
  where room_id = p_room_id
    and is_host = false
    and left_at is null
    and kicked_at is null;

  perform public.jjk_add_event(p_room_id, null, 'selection_started', '{}'::jsonb);
  return true;
end;
$$;

-- =========================================================
-- 4. AVVIO PARTITA: IL PRIMO GIOCATORE SI SBLOCCA SUBITO
-- =========================================================

create or replace function public.jjk_start_match(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
  v_ready integer;
  v_ordered integer;
  v_distinct_order integer;
  v_min_order integer;
  v_max_order integer;
  v_room public.rooms;
  v_first public.room_players;
  v_order jsonb;
begin
  perform public.jjk_require_user();

  if not public.jjk_is_room_host(p_room_id) then
    raise exception 'HOST_ONLY' using errcode = 'P0001';
  end if;

  select * into v_room
  from public.rooms r
  where r.id = p_room_id
  for update;

  if not found or v_room.status <> 'selection' then
    raise exception 'SELECTION_NOT_OPEN' using errcode = 'P0001';
  end if;

  select count(*) into v_total
  from public.room_players rp
  where rp.room_id = p_room_id
    and rp.is_host = false
    and rp.left_at is null
    and rp.kicked_at is null;

  select count(*) into v_ready
  from public.room_players rp
  where rp.room_id = p_room_id
    and rp.is_host = false
    and rp.left_at is null
    and rp.kicked_at is null
    and rp.character_id is not null;

  select count(rp.turn_order),
         count(distinct rp.turn_order),
         min(rp.turn_order),
         max(rp.turn_order)
  into v_ordered, v_distinct_order, v_min_order, v_max_order
  from public.room_players rp
  where rp.room_id = p_room_id
    and rp.is_host = false
    and rp.left_at is null
    and rp.kicked_at is null;

  if v_total < 1 then
    raise exception 'NO_PLAYERS' using errcode = 'P0001';
  end if;

  if v_ready <> v_total then
    raise exception 'PLAYERS_NOT_READY' using errcode = 'P0001';
  end if;

  if v_ordered <> v_total
     or v_distinct_order <> v_total
     or v_min_order <> 1
     or v_max_order <> v_total then
    raise exception 'TURN_ORDER_REQUIRED' using errcode = 'P0001';
  end if;

  select * into v_first
  from public.room_players rp
  where rp.room_id = p_room_id
    and rp.is_host = false
    and rp.left_at is null
    and rp.kicked_at is null
    and rp.turn_order = 1;

  if not found then
    raise exception 'TURN_ORDER_REQUIRED' using errcode = 'P0001';
  end if;

  update public.rooms
  set status = 'playing',
      started_at = now(),
      ended_at = null,
      winner_player_id = null,
      winner_data = '{}'::jsonb
  where id = p_room_id;

  update public.room_players
  set is_locked = case
        when is_host then false
        when id = v_first.id then false
        else true
      end,
      boss_rush = false,
      boss_rush_snapshot = null
  where room_id = p_room_id
    and left_at is null
    and kicked_at is null;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'player_id', rp.id,
        'player_name', rp.player_name,
        'character_id', rp.character_id,
        'turn_order', rp.turn_order
      ) order by rp.turn_order
    ),
    '[]'::jsonb
  ) into v_order
  from public.room_players rp
  where rp.room_id = p_room_id
    and rp.is_host = false
    and rp.left_at is null
    and rp.kicked_at is null;

  perform public.jjk_add_event(
    p_room_id,
    v_first.id,
    'match_started',
    jsonb_build_object(
      'players', v_total,
      'first_player_id', v_first.id,
      'first_player_name', v_first.player_name,
      'turn_order', v_order
    )
  );

  return jsonb_build_object(
    'room_id', p_room_id,
    'status', 'playing',
    'started_at', now(),
    'players', v_total,
    'first_player_id', v_first.id,
    'first_player_name', v_first.player_name,
    'turn_order', v_order
  );
end;
$$;

-- =========================================================
-- 5. PASSA TURNO: BLOCCA IL GIOCATORE E SBLOCCA IL SUCCESSIVO
-- =========================================================

-- Il tipo restituito cambia da boolean a jsonb, quindi va ricreata.
drop function if exists public.jjk_pass_turn(uuid);

create function public.jjk_pass_turn(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.jjk_require_user();
  v_player public.room_players;
  v_next public.room_players;
  v_status text;
begin
  select r.status into v_status
  from public.rooms r
  where r.id = p_room_id
  for update;

  if not found or v_status <> 'playing' then
    raise exception 'MATCH_NOT_PLAYING' using errcode = 'P0001';
  end if;

  select * into v_player
  from public.room_players rp
  where rp.room_id = p_room_id
    and rp.user_id = v_user_id
    and rp.is_host = false
    and rp.left_at is null
    and rp.kicked_at is null
  for update;

  if not found then
    raise exception 'PLAYER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_player.is_locked then
    raise exception 'NOT_YOUR_TURN' using errcode = 'P0001';
  end if;

  if v_player.turn_order is null then
    raise exception 'TURN_ORDER_REQUIRED' using errcode = 'P0001';
  end if;

  select rp.* into v_next
  from public.room_players rp
  where rp.room_id = p_room_id
    and rp.is_host = false
    and rp.left_at is null
    and rp.kicked_at is null
    and rp.turn_order is not null
  order by
    case when rp.turn_order > v_player.turn_order then 0 else 1 end,
    rp.turn_order
  limit 1
  for update;

  if not found then
    raise exception 'NEXT_PLAYER_NOT_FOUND' using errcode = 'P0001';
  end if;

  update public.room_players
  set is_locked = true
  where room_id = p_room_id
    and is_host = false
    and left_at is null
    and kicked_at is null;

  update public.room_players
  set is_locked = false,
      last_seen = case when id = v_player.id then now() else last_seen end
  where id = v_next.id;

  update public.room_players
  set last_seen = now()
  where id = v_player.id;

  perform public.jjk_add_event(
    p_room_id,
    v_player.id,
    'turn_passed',
    jsonb_build_object(
      'player_name', v_player.player_name,
      'player_order', v_player.turn_order,
      'next_player_id', v_next.id,
      'next_player_name', v_next.player_name,
      'next_player_order', v_next.turn_order
    )
  );

  perform public.jjk_add_event(
    p_room_id,
    v_next.id,
    'turn_given_automatic',
    jsonb_build_object(
      'previous_player_id', v_player.id,
      'previous_player_name', v_player.player_name,
      'player_name', v_next.player_name,
      'turn_order', v_next.turn_order
    )
  );

  return jsonb_build_object(
    'previous_player_id', v_player.id,
    'previous_player_name', v_player.player_name,
    'next_player_id', v_next.id,
    'next_player_name', v_next.player_name,
    'next_player_order', v_next.turn_order
  );
end;
$$;

-- =========================================================
-- 6. SNAPSHOT: INVIA ANCHE LA POSIZIONE NELL'ORDINE
-- =========================================================

create or replace function public.jjk_room_snapshot(p_room_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_room jsonb;
  v_players jsonb;
  v_events jsonb;
begin
  perform public.jjk_require_user();

  if not public.jjk_is_room_member(p_room_id)
     and not public.jjk_is_room_host(p_room_id) then
    raise exception 'NOT_ROOM_MEMBER' using errcode = 'P0001';
  end if;

  select to_jsonb(r) into v_room
  from public.rooms r
  where r.id = p_room_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', rp.id,
      'user_id', rp.user_id,
      'player_name', rp.player_name,
      'character_id', rp.character_id,
      'is_host', rp.is_host,
      'is_connected', rp.is_connected,
      'is_locked', rp.is_locked,
      'self_manage', rp.self_manage,
      'energy_discount', rp.energy_discount,
      'has_eye', rp.has_eye,
      'boss_rush', rp.boss_rush,
      'turn_order', rp.turn_order,
      'joined_at', rp.joined_at,
      'last_seen', rp.last_seen,
      'left_at', rp.left_at,
      'kicked_at', rp.kicked_at,
      'state', coalesce(ps.state, '{}'::jsonb),
      'state_version', coalesce(ps.version, 0),
      'state_updated_at', ps.updated_at
    ) order by rp.is_host desc, coalesce(rp.turn_order, 99), rp.joined_at asc
  ), '[]'::jsonb) into v_players
  from public.room_players rp
  left join public.player_states ps on ps.room_player_id = rp.id
  where rp.room_id = p_room_id;

  select coalesce(jsonb_agg(x.event_row order by x.created_at asc), '[]'::jsonb)
  into v_events
  from (
    select re.created_at,
           jsonb_build_object(
             'id', re.id,
             'room_player_id', re.room_player_id,
             'actor_user_id', re.actor_user_id,
             'event_type', re.event_type,
             'payload', re.payload,
             'created_at', re.created_at
           ) as event_row
    from public.room_events re
    where re.room_id = p_room_id
    order by re.created_at desc
    limit 100
  ) x;

  return jsonb_build_object(
    'room', v_room,
    'players', v_players,
    'events', v_events,
    'server_time', now()
  );
end;
$$;

-- =========================================================
-- 7. PERMESSI
-- =========================================================

revoke all on function public.jjk_gm_set_turn_order(uuid, uuid[]) from public, anon;
revoke all on function public.jjk_pass_turn(uuid) from public, anon;

grant execute on function public.jjk_gm_set_turn_order(uuid, uuid[]) to authenticated;
grant execute on function public.jjk_pass_turn(uuid) to authenticated;

-- Le funzioni sostituite mantengono normalmente i permessi, ma li riaffermiamo.
grant execute on function public.jjk_start_character_selection(uuid) to authenticated;
grant execute on function public.jjk_start_match(uuid) to authenticated;
grant execute on function public.jjk_room_snapshot(uuid) to authenticated;

commit;

-- Controllo finale: devono comparire la colonna e le funzioni.
select 'column' as object_type,
       column_name as object_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'room_players'
  and column_name = 'turn_order'

union all

select 'function' as object_type,
       p.proname as object_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'jjk_gm_set_turn_order',
    'jjk_pass_turn',
    'jjk_start_character_selection',
    'jjk_start_match',
    'jjk_room_snapshot'
  )
order by object_type, object_name;
