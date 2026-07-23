-- JJK ENERGY - PASSO 8
-- Eventi globali: Boss Rush e Doppi EXP
-- Eseguire una sola volta in Supabase > SQL Editor.
-- Lo script e' idempotente e non cancella partite, account o statistiche.

begin;

-- Estrae soltanto le risorse che devono essere ripristinate al Boss.
create or replace function public.jjk_resource_snapshot(p_state jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(k, p_state -> k), '{}'::jsonb)
  from unnest(array[
    'energy','life','tokens','combatBonus','jogoLife','jogoHeat',
    'getoOneUse','tojiCollectedEnergy','itadoriFingers','itadoriMaxFingers',
    'itadoriOneUse','yutaKatanaActive','yutaCopiedTokens','yutaCopiedVigor',
    'yutaCopiedFingers','yutaCopiedMaxFingers','yutaCopiedHeat'
  ]) as k
  where coalesce(p_state, '{}'::jsonb) ? k;
$$;

-- Avvia l'evento globale Boss Rush.
create or replace function public.jjk_gm_start_boss_rush_event(
  p_room_id uuid,
  p_boss_player_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.rooms;
  v_boss public.room_players;
  v_state jsonb := '{}'::jsonb;
  v_snapshot jsonb := '{}'::jsonb;
  v_saved_controls jsonb := '[]'::jsonb;
  v_settings jsonb := '{}'::jsonb;
  v_events jsonb := '{}'::jsonb;
  v_event jsonb;
  v_now_ms bigint := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_old record;
  v_old_snapshot jsonb;
begin
  perform public.jjk_require_user();
  if not public.jjk_is_room_host(p_room_id) then
    raise exception 'HOST_ONLY' using errcode = 'P0001';
  end if;

  select * into v_room
  from public.rooms
  where id = p_room_id
  for update;

  if not found or v_room.status <> 'playing' then
    raise exception 'MATCH_NOT_PLAYING' using errcode = 'P0001';
  end if;

  v_settings := coalesce(v_room.settings, '{}'::jsonb);
  v_events := coalesce(v_settings -> 'events', '{}'::jsonb);

  if coalesce((v_events -> 'boss_rush' ->> 'active')::boolean, false) then
    raise exception 'BOSS_RUSH_EVENT_ALREADY_ACTIVE' using errcode = 'P0001';
  end if;
  if coalesce((v_events -> 'double_exp' ->> 'active')::boolean, false) then
    raise exception 'EVENT_CONFLICT' using errcode = 'P0001';
  end if;

  select * into v_boss
  from public.room_players
  where id = p_boss_player_id
    and room_id = p_room_id
    and is_host = false
    and left_at is null
    and kicked_at is null
  for update;

  if not found then
    raise exception 'PLAYER_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- Chiude in sicurezza eventuali vecchie Boss Rush individuali.
  for v_old in
    select rp.id, ps.state
    from public.room_players rp
    left join public.player_states ps on ps.room_player_id = rp.id
    where rp.room_id = p_room_id
      and rp.is_host = false
      and rp.boss_rush = true
  loop
    v_old_snapshot := public.jjk_resource_snapshot(coalesce(v_old.state -> '_bossRushSnapshot', '{}'::jsonb));
    update public.player_states
    set state = ((coalesce(state, '{}'::jsonb) - '_bossRushSnapshot' - 'bossRushActive')
                 || v_old_snapshot
                 || jsonb_build_object('bossRushActive', false, 'updatedAt', v_now_ms)),
        version = version + 1,
        updated_at = now()
    where room_player_id = v_old.id;
  end loop;

  update public.room_players
  set boss_rush = false,
      boss_rush_snapshot = null,
      updated_at = now()
  where room_id = p_room_id
    and is_host = false;

  select coalesce(ps.state, '{}'::jsonb) into v_state
  from public.player_states ps
  where ps.room_player_id = p_boss_player_id
  for update;

  v_snapshot := public.jjk_resource_snapshot(v_state);

  select coalesce(jsonb_agg(jsonb_build_object(
    'player_id', rp.id,
    'locked', rp.is_locked,
    'self_manage', rp.self_manage
  ) order by coalesce(rp.turn_order, 99), rp.joined_at), '[]'::jsonb)
  into v_saved_controls
  from public.room_players rp
  where rp.room_id = p_room_id
    and rp.is_host = false
    and rp.left_at is null
    and rp.kicked_at is null;

  v_event := jsonb_build_object(
    'active', true,
    'boss_player_id', p_boss_player_id,
    'boss_player_name', v_boss.player_name,
    'started_at', now(),
    'saved_controls', v_saved_controls,
    'boss_snapshot', v_snapshot
  );

  update public.room_players
  set is_locked = false,
      self_manage = false,
      boss_rush = (id = p_boss_player_id),
      boss_rush_snapshot = case when id = p_boss_player_id then v_snapshot else null end,
      updated_at = now()
  where room_id = p_room_id
    and is_host = false
    and left_at is null
    and kicked_at is null;

  insert into public.player_states(room_player_id, room_id, character_id, state, version, updated_at)
  values (
    p_boss_player_id,
    p_room_id,
    v_boss.character_id,
    coalesce(v_state, '{}'::jsonb) || jsonb_build_object(
      'bossRushActive', true,
      '_bossRushSnapshot', v_snapshot,
      'updatedAt', v_now_ms
    ),
    1,
    now()
  )
  on conflict (room_player_id) do update
  set state = (coalesce(public.player_states.state, '{}'::jsonb)
               || jsonb_build_object(
                 'bossRushActive', true,
                 '_bossRushSnapshot', v_snapshot,
                 'updatedAt', v_now_ms
               )),
      version = public.player_states.version + 1,
      updated_at = now();

  select v_settings || jsonb_build_object(
    'events', v_events || jsonb_build_object('boss_rush', v_event)
  ) into v_settings;

  update public.rooms
  set settings = v_settings,
      updated_at = now()
  where id = p_room_id;

  perform public.jjk_add_event(
    p_room_id,
    p_boss_player_id,
    'boss_rush_event_started',
    jsonb_build_object('boss_player_id', p_boss_player_id, 'boss_player_name', v_boss.player_name)
  );

  return v_event;
end;
$$;

-- Conclude l'evento Boss Rush, conserva le risorse finali degli altri
-- giocatori, ripristina le risorse del Boss e i controlli pre-evento.
create or replace function public.jjk_gm_end_boss_rush_event(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.rooms;
  v_settings jsonb := '{}'::jsonb;
  v_events jsonb := '{}'::jsonb;
  v_event jsonb := '{}'::jsonb;
  v_saved jsonb := '[]'::jsonb;
  v_boss_id uuid;
  v_snapshot jsonb := '{}'::jsonb;
  v_boss_name text;
  v_now_ms bigint := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  perform public.jjk_require_user();
  if not public.jjk_is_room_host(p_room_id) then
    raise exception 'HOST_ONLY' using errcode = 'P0001';
  end if;

  select * into v_room
  from public.rooms
  where id = p_room_id
  for update;

  if not found or v_room.status <> 'playing' then
    raise exception 'MATCH_NOT_PLAYING' using errcode = 'P0001';
  end if;

  v_settings := coalesce(v_room.settings, '{}'::jsonb);
  v_events := coalesce(v_settings -> 'events', '{}'::jsonb);
  v_event := coalesce(v_events -> 'boss_rush', '{}'::jsonb);

  if not coalesce((v_event ->> 'active')::boolean, false) then
    raise exception 'BOSS_RUSH_EVENT_NOT_ACTIVE' using errcode = 'P0001';
  end if;

  v_boss_id := (v_event ->> 'boss_player_id')::uuid;
  v_boss_name := v_event ->> 'boss_player_name';
  v_saved := coalesce(v_event -> 'saved_controls', '[]'::jsonb);
  v_snapshot := public.jjk_resource_snapshot(coalesce(v_event -> 'boss_snapshot', '{}'::jsonb));

  update public.player_states
  set state = ((coalesce(state, '{}'::jsonb) - '_bossRushSnapshot' - 'bossRushActive')
               || v_snapshot
               || jsonb_build_object('bossRushActive', false, 'updatedAt', v_now_ms)),
      version = version + 1,
      updated_at = now()
  where room_player_id = v_boss_id;

  update public.room_players rp
  set is_locked = coalesce((
        select (item ->> 'locked')::boolean
        from jsonb_array_elements(v_saved) as x(item)
        where item ->> 'player_id' = rp.id::text
        limit 1
      ), true),
      self_manage = coalesce((
        select (item ->> 'self_manage')::boolean
        from jsonb_array_elements(v_saved) as x(item)
        where item ->> 'player_id' = rp.id::text
        limit 1
      ), true),
      boss_rush = false,
      boss_rush_snapshot = null,
      updated_at = now()
  where rp.room_id = p_room_id
    and rp.is_host = false;

  v_events := v_events - 'boss_rush';
  select v_settings || jsonb_build_object('events', v_events) into v_settings;

  update public.rooms
  set settings = v_settings,
      updated_at = now()
  where id = p_room_id;

  perform public.jjk_add_event(
    p_room_id,
    v_boss_id,
    'boss_rush_event_ended',
    jsonb_build_object('boss_player_id', v_boss_id, 'boss_player_name', v_boss_name)
  );

  return jsonb_build_object('ended', true, 'boss_player_id', v_boss_id, 'boss_player_name', v_boss_name);
end;
$$;

-- Avvia Doppi EXP. Il giocatore attualmente di turno diventa l'ancora:
-- un giro termina quando il turno torna a lui.
create or replace function public.jjk_gm_start_double_exp_event(
  p_room_id uuid,
  p_rounds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.rooms;
  v_anchor public.room_players;
  v_settings jsonb := '{}'::jsonb;
  v_events jsonb := '{}'::jsonb;
  v_event jsonb;
begin
  perform public.jjk_require_user();
  if not public.jjk_is_room_host(p_room_id) then
    raise exception 'HOST_ONLY' using errcode = 'P0001';
  end if;
  if p_rounds is null or p_rounds < 1 or p_rounds > 20 then
    raise exception 'INVALID_EVENT_DURATION' using errcode = 'P0001';
  end if;

  select * into v_room
  from public.rooms
  where id = p_room_id
  for update;

  if not found or v_room.status <> 'playing' then
    raise exception 'MATCH_NOT_PLAYING' using errcode = 'P0001';
  end if;

  v_settings := coalesce(v_room.settings, '{}'::jsonb);
  v_events := coalesce(v_settings -> 'events', '{}'::jsonb);

  if coalesce((v_events -> 'boss_rush' ->> 'active')::boolean, false) then
    raise exception 'EVENT_CONFLICT' using errcode = 'P0001';
  end if;
  if coalesce((v_events -> 'double_exp' ->> 'active')::boolean, false) then
    raise exception 'DOUBLE_EXP_EVENT_ALREADY_ACTIVE' using errcode = 'P0001';
  end if;

  select * into v_anchor
  from public.room_players rp
  where rp.room_id = p_room_id
    and rp.is_host = false
    and rp.left_at is null
    and rp.kicked_at is null
    and rp.is_locked = false
  order by coalesce(rp.turn_order, 99), rp.joined_at
  limit 1
  for update;

  if not found then
    raise exception 'NO_ACTIVE_TURN' using errcode = 'P0001';
  end if;

  v_event := jsonb_build_object(
    'active', true,
    'anchor_player_id', v_anchor.id,
    'anchor_player_name', v_anchor.player_name,
    'rounds_total', p_rounds,
    'rounds_remaining', p_rounds,
    'started_at', now()
  );

  select v_settings || jsonb_build_object(
    'events', v_events || jsonb_build_object('double_exp', v_event)
  ) into v_settings;

  update public.rooms
  set settings = v_settings,
      updated_at = now()
  where id = p_room_id;

  perform public.jjk_add_event(
    p_room_id,
    v_anchor.id,
    'double_exp_event_started',
    jsonb_build_object(
      'anchor_player_id', v_anchor.id,
      'anchor_player_name', v_anchor.player_name,
      'rounds', p_rounds
    )
  );

  return v_event;
end;
$$;

create or replace function public.jjk_gm_end_double_exp_event(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_room public.rooms;
  v_settings jsonb := '{}'::jsonb;
  v_events jsonb := '{}'::jsonb;
  v_event jsonb := '{}'::jsonb;
begin
  perform public.jjk_require_user();
  if not public.jjk_is_room_host(p_room_id) then
    raise exception 'HOST_ONLY' using errcode = 'P0001';
  end if;

  select * into v_room
  from public.rooms
  where id = p_room_id
  for update;

  if not found then
    raise exception 'ROOM_NOT_FOUND' using errcode = 'P0001';
  end if;

  v_settings := coalesce(v_room.settings, '{}'::jsonb);
  v_events := coalesce(v_settings -> 'events', '{}'::jsonb);
  v_event := coalesce(v_events -> 'double_exp', '{}'::jsonb);

  if not coalesce((v_event ->> 'active')::boolean, false) then
    raise exception 'DOUBLE_EXP_EVENT_NOT_ACTIVE' using errcode = 'P0001';
  end if;

  v_events := v_events - 'double_exp';
  select v_settings || jsonb_build_object('events', v_events) into v_settings;

  update public.rooms
  set settings = v_settings,
      updated_at = now()
  where id = p_room_id;

  perform public.jjk_add_event(
    p_room_id,
    null,
    'double_exp_event_ended',
    jsonb_build_object('manual', true)
  );

  return jsonb_build_object('ended', true);
end;
$$;

-- Passaggio turno aggiornato: gestisce il conto dei giri di Doppi EXP.
create or replace function public.jjk_pass_turn(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.jjk_require_user();
  v_player public.room_players;
  v_next public.room_players;
  v_room public.rooms;
  v_settings jsonb := '{}'::jsonb;
  v_events jsonb := '{}'::jsonb;
  v_double jsonb := '{}'::jsonb;
  v_remaining integer;
  v_double_active boolean := false;
begin
  select * into v_room
  from public.rooms r
  where r.id = p_room_id
  for update;

  if not found or v_room.status <> 'playing' then
    raise exception 'MATCH_NOT_PLAYING' using errcode = 'P0001';
  end if;

  v_settings := coalesce(v_room.settings, '{}'::jsonb);
  v_events := coalesce(v_settings -> 'events', '{}'::jsonb);

  if coalesce((v_events -> 'boss_rush' ->> 'active')::boolean, false) then
    raise exception 'EVENT_TURNS_PAUSED' using errcode = 'P0001';
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
  set is_locked = false
  where id = v_next.id;

  update public.room_players
  set last_seen = now()
  where id in (v_player.id, v_next.id);

  v_double := coalesce(v_events -> 'double_exp', '{}'::jsonb);
  v_double_active := coalesce((v_double ->> 'active')::boolean, false);
  v_remaining := coalesce((v_double ->> 'rounds_remaining')::integer, 0);

  if v_double_active
     and (v_double ->> 'anchor_player_id') = v_next.id::text then
    v_remaining := greatest(0, coalesce((v_double ->> 'rounds_remaining')::integer, 1) - 1);

    if v_remaining <= 0 then
      v_events := v_events - 'double_exp';
      v_double_active := false;
      perform public.jjk_add_event(
        p_room_id,
        v_next.id,
        'double_exp_event_ended',
        jsonb_build_object('automatic', true)
      );
    else
      v_double := v_double || jsonb_build_object('rounds_remaining', v_remaining);
      v_events := v_events || jsonb_build_object('double_exp', v_double);
      perform public.jjk_add_event(
        p_room_id,
        v_next.id,
        'double_exp_round_completed',
        jsonb_build_object('rounds_remaining', v_remaining)
      );
    end if;

    select v_settings || jsonb_build_object('events', v_events) into v_settings;
    update public.rooms
    set settings = v_settings,
        updated_at = now()
    where id = p_room_id;
  end if;

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
    'next_player_order', v_next.turn_order,
    'double_exp_active', v_double_active,
    'double_exp_rounds_remaining', case when v_double_active then v_remaining else 0 end
  );
end;
$$;

revoke all on function public.jjk_resource_snapshot(jsonb) from public, anon;
revoke all on function public.jjk_gm_start_boss_rush_event(uuid, uuid) from public, anon;
revoke all on function public.jjk_gm_end_boss_rush_event(uuid) from public, anon;
revoke all on function public.jjk_gm_start_double_exp_event(uuid, integer) from public, anon;
revoke all on function public.jjk_gm_end_double_exp_event(uuid) from public, anon;
revoke all on function public.jjk_pass_turn(uuid) from public, anon;

grant execute on function public.jjk_gm_start_boss_rush_event(uuid, uuid) to authenticated;
grant execute on function public.jjk_gm_end_boss_rush_event(uuid) to authenticated;
grant execute on function public.jjk_gm_start_double_exp_event(uuid, integer) to authenticated;
grant execute on function public.jjk_gm_end_double_exp_event(uuid) to authenticated;
grant execute on function public.jjk_pass_turn(uuid) to authenticated;

commit;

select 'function' as object_type, p.proname as object_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'jjk_resource_snapshot',
    'jjk_gm_start_boss_rush_event',
    'jjk_gm_end_boss_rush_event',
    'jjk_gm_start_double_exp_event',
    'jjk_gm_end_double_exp_event',
    'jjk_pass_turn'
  )
order by p.proname;
