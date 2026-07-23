-- JJK ENERGY - PASSO 7
-- Account permanenti, username univoci e classifiche riservate ai giocatori registrati.
-- Eseguire DOPO i Passi 2, 3, 4, 5 e 6.
-- Lo script e' rieseguibile e NON cancella stanze, partite, statistiche o progressi.

begin;

-- =========================================================
-- 1. PROFILO ACCOUNT PUBBLICO
-- =========================================================

alter table public.player_profiles
  add column if not exists account_tag text,
  add column if not exists registered_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'player_profiles_account_tag_format'
      and conrelid = 'public.player_profiles'::regclass
  ) then
    alter table public.player_profiles
      add constraint player_profiles_account_tag_format
      check (
        account_tag is null
        or account_tag ~ '^[a-z0-9_]{3,20}$'
      );
  end if;
end;
$$;

create unique index if not exists player_profiles_account_tag_unique_idx
  on public.player_profiles(lower(account_tag))
  where account_tag is not null;

create index if not exists player_profiles_registered_idx
  on public.player_profiles(registered_at desc)
  where account_tag is not null;

-- =========================================================
-- 2. SOLO ACCOUNT PERMANENTI NEL MULTIPLAYER
-- =========================================================

create or replace function public.jjk_require_user()
returns uuid
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_anonymous boolean := false;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  begin
    v_is_anonymous := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  exception when others then
    v_is_anonymous := false;
  end;

  if v_is_anonymous then
    raise exception 'REGISTERED_ACCOUNT_REQUIRED' using errcode = 'P0001';
  end if;

  return v_user_id;
end;
$$;

create or replace function public.jjk_account_tag_available(p_account_tag text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    lower(btrim(coalesce(p_account_tag, ''))) ~ '^[a-z0-9_]{3,20}$'
    and not exists (
      select 1
      from public.player_profiles pp
      where lower(pp.account_tag) = lower(btrim(p_account_tag))
        and (auth.uid() is null or pp.user_id <> auth.uid())
    );
$$;

create or replace function public.jjk_set_registered_profile(
  p_account_tag text,
  p_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.jjk_require_user();
  v_tag text := lower(btrim(coalesce(p_account_tag, '')));
  v_name text := left(btrim(coalesce(p_display_name, '')), 30);
  v_email_confirmed boolean := false;
  v_existing_tag text;
begin
  if v_tag !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'INVALID_ACCOUNT_TAG' using errcode = 'P0001';
  end if;

  if char_length(v_name) < 2 then
    raise exception 'INVALID_DISPLAY_NAME' using errcode = 'P0001';
  end if;

  select u.email_confirmed_at is not null
  into v_email_confirmed
  from auth.users u
  where u.id = v_user_id;

  if not coalesce(v_email_confirmed, false) then
    raise exception 'EMAIL_NOT_VERIFIED' using errcode = 'P0001';
  end if;

  select pp.account_tag
  into v_existing_tag
  from public.player_profiles pp
  where pp.user_id = v_user_id;

  if v_existing_tag is not null and lower(v_existing_tag) <> v_tag then
    raise exception 'ACCOUNT_TAG_LOCKED' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.player_profiles pp
    where lower(pp.account_tag) = v_tag
      and pp.user_id <> v_user_id
  ) then
    raise exception 'ACCOUNT_TAG_TAKEN' using errcode = 'P0001';
  end if;

  insert into public.player_profiles(
    user_id,
    display_name,
    account_tag,
    first_seen_at,
    last_seen_at,
    registered_at,
    updated_at
  ) values (
    v_user_id,
    v_name,
    v_tag,
    now(),
    now(),
    now(),
    now()
  )
  on conflict (user_id) do update
  set display_name = excluded.display_name,
      account_tag = excluded.account_tag,
      last_seen_at = now(),
      registered_at = coalesce(public.player_profiles.registered_at, now()),
      updated_at = now();

  update public.room_players
  set player_name = v_name,
      last_seen = now()
  where user_id = v_user_id
    and left_at is null
    and kicked_at is null;

  perform public.jjk_refresh_progress_for_user(v_user_id);
  perform public.jjk_stats_pulse('registered_profile');

  return jsonb_build_object(
    'user_id', v_user_id,
    'display_name', v_name,
    'account_tag', v_tag,
    'registered_at', now()
  );
end;
$$;

create or replace function public.jjk_my_account_profile()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.jjk_require_user();
  v_result jsonb;
begin
  select jsonb_build_object(
    'user_id', pp.user_id,
    'display_name', pp.display_name,
    'account_tag', pp.account_tag,
    'registered_at', pp.registered_at,
    'first_seen_at', pp.first_seen_at,
    'last_seen_at', pp.last_seen_at
  )
  into v_result
  from public.player_profiles pp
  where pp.user_id = v_user_id;

  return coalesce(v_result, jsonb_build_object(
    'user_id', v_user_id,
    'display_name', null,
    'account_tag', null,
    'registered_at', null
  ));
end;
$$;

-- Le vecchie chiamate del sito non possono piu' cambiare il nome account
-- entrando in una stanza. Aggiornano soltanto la presenza.
create or replace function public.jjk_set_profile_name(p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := public.jjk_require_user();
  v_profile public.player_profiles;
begin
  select * into v_profile
  from public.player_profiles pp
  where pp.user_id = v_user_id
    and pp.account_tag is not null;

  if not found then
    raise exception 'ACCOUNT_PROFILE_REQUIRED' using errcode = 'P0001';
  end if;

  update public.player_profiles
  set last_seen_at = now(),
      updated_at = now()
  where user_id = v_user_id;

  return jsonb_build_object(
    'display_name', v_profile.display_name,
    'account_tag', v_profile.account_tag,
    'updated_at', now()
  );
end;
$$;

-- Il nome nella stanza viene sempre preso dal profilo registrato.
create or replace function public.jjk_enforce_registered_room_player()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  select pp.display_name
  into v_name
  from public.player_profiles pp
  where pp.user_id = new.user_id
    and pp.account_tag is not null;

  if v_name is null then
    raise exception 'ACCOUNT_PROFILE_REQUIRED' using errcode = 'P0001';
  end if;

  new.player_name := v_name;
  return new;
end;
$$;

drop trigger if exists aa_room_players_registered_account_insert on public.room_players;
create trigger aa_room_players_registered_account_insert
before insert on public.room_players
for each row execute function public.jjk_enforce_registered_room_player();

drop trigger if exists aa_room_players_registered_account_update on public.room_players;
create trigger aa_room_players_registered_account_update
before update of user_id, player_name on public.room_players
for each row execute function public.jjk_enforce_registered_room_player();

-- Evita che il trigger storico sovrascriva un profilo registrato.
create or replace function public.jjk_sync_player_profile_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null and char_length(btrim(new.player_name)) between 1 and 30 then
    insert into public.player_profiles(
      user_id,
      display_name,
      first_seen_at,
      last_seen_at,
      updated_at
    ) values (
      new.user_id,
      btrim(new.player_name),
      coalesce(new.joined_at, now()),
      coalesce(new.last_seen, now()),
      now()
    )
    on conflict (user_id) do update
    set display_name = case
          when public.player_profiles.account_tag is null then excluded.display_name
          else public.player_profiles.display_name
        end,
        last_seen_at = greatest(public.player_profiles.last_seen_at, excluded.last_seen_at),
        updated_at = now();
  end if;

  return new;
end;
$$;

-- =========================================================
-- 3. STATISTICHE GLOBALI SOLO DI ACCOUNT REGISTRATI
-- =========================================================

create or replace function public.jjk_global_statistics()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_totals jsonb;
  v_top_players jsonb;
  v_characters jsonb;
  v_techniques jsonb;
  v_resources jsonb;
  v_matches_by_day jsonb;
begin
  perform public.jjk_require_user();

  select jsonb_build_object(
    'matches_played', (
      select count(*)
      from public.matches m
      where exists (
        select 1
        from public.match_participants mp
        join public.player_profiles pp on pp.user_id = mp.user_id
        where mp.match_id = m.id
          and pp.account_tag is not null
      )
    ),
    'unique_players', (
      select count(*)
      from public.player_profiles pp
      where pp.account_tag is not null
    ),
    'active_matches', (
      select count(*)
      from public.rooms r
      where r.status = 'playing'
        and exists (
          select 1
          from public.room_players rp
          join public.player_profiles pp on pp.user_id = rp.user_id
          where rp.room_id = r.id
            and pp.account_tag is not null
            and rp.left_at is null
            and rp.kicked_at is null
        )
    ),
    'online_players', (
      select count(distinct rp.user_id)
      from public.room_players rp
      join public.rooms r on r.id = rp.room_id
      join public.player_profiles pp on pp.user_id = rp.user_id
      where pp.account_tag is not null
        and r.status in ('lobby', 'selection', 'playing')
        and rp.is_host = false
        and rp.left_at is null
        and rp.kicked_at is null
        and rp.is_connected = true
        and rp.last_seen >= now() - interval '120 seconds'
    ),
    'boss_rush_matches', (
      select count(*)
      from public.matches m
      where m.boss_rush_used = true
        and exists (
          select 1
          from public.match_participants mp
          join public.player_profiles pp on pp.user_id = mp.user_id
          where mp.match_id = m.id
            and pp.account_tag is not null
        )
    ),
    'techniques_used', (
      select count(*)
      from public.technique_usage tu
      join public.player_profiles pp on pp.user_id = tu.user_id
      where pp.account_tag is not null
    ),
    'average_duration_seconds', coalesce((
      select round(avg(m.duration_seconds))::bigint
      from public.matches m
      where exists (
        select 1
        from public.match_participants mp
        join public.player_profiles pp on pp.user_id = mp.user_id
        where mp.match_id = m.id
          and pp.account_tag is not null
      )
    ), 0),
    'total_play_seconds', coalesce((
      select sum(m.duration_seconds)::bigint
      from public.matches m
      where exists (
        select 1
        from public.match_participants mp
        join public.player_profiles pp on pp.user_id = mp.user_id
        where mp.match_id = m.id
          and pp.account_tag is not null
      )
    ), 0)
  ) into v_totals;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'player_name', q.player_name,
      'account_tag', q.account_tag,
      'matches', q.matches_played,
      'wins', q.wins,
      'win_rate', q.win_rate,
      'total_play_seconds', q.total_play_seconds
    ) order by q.wins desc, q.win_rate desc, q.matches_played desc, q.account_tag asc
  ), '[]'::jsonb)
  into v_top_players
  from (
    select
      pp.display_name as player_name,
      pp.account_tag,
      count(*)::integer as matches_played,
      count(*) filter (where mp.is_winner)::integer as wins,
      round(
        (100.0 * count(*) filter (where mp.is_winner)) / nullif(count(*), 0),
        1
      ) as win_rate,
      coalesce(sum(m.duration_seconds), 0)::bigint as total_play_seconds
    from public.match_participants mp
    join public.matches m on m.id = mp.match_id
    join public.player_profiles pp on pp.user_id = mp.user_id
    where pp.account_tag is not null
    group by mp.user_id, pp.display_name, pp.account_tag
    order by wins desc, win_rate desc, matches_played desc
    limit 100
  ) q;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'character_id', q.character_id,
      'selections', q.selections,
      'wins', q.wins,
      'win_rate', q.win_rate
    ) order by q.selections desc, q.wins desc, q.character_id asc
  ), '[]'::jsonb)
  into v_characters
  from (
    select
      mp.character_id,
      count(*)::integer as selections,
      count(*) filter (where mp.is_winner)::integer as wins,
      round(
        (100.0 * count(*) filter (where mp.is_winner)) / nullif(count(*), 0),
        1
      ) as win_rate
    from public.match_participants mp
    join public.player_profiles pp on pp.user_id = mp.user_id
    where pp.account_tag is not null
    group by mp.character_id
  ) q;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'character_id', q.character_id,
      'technique_key', q.technique_key,
      'technique_name', q.technique_name,
      'uses', q.uses,
      'energy_spent', q.energy_spent,
      'average_combat_value', q.average_combat_value
    ) order by q.uses desc, q.technique_name asc
  ), '[]'::jsonb)
  into v_techniques
  from (
    select
      tu.character_id,
      tu.technique_key,
      max(tu.technique_name) as technique_name,
      count(*)::integer as uses,
      coalesce(sum(tu.energy_spent), 0)::bigint as energy_spent,
      round(avg(tu.combat_value) filter (where tu.combat_value is not null), 1) as average_combat_value
    from public.technique_usage tu
    join public.player_profiles pp on pp.user_id = tu.user_id
    where pp.account_tag is not null
    group by tu.character_id, tu.technique_key
    order by uses desc
    limit 100
  ) q;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'character_id', q.character_id,
      'resource_type', q.resource_type,
      'spent', q.spent,
      'recovered', q.recovered,
      'net_change', q.net_change,
      'events', q.events
    ) order by q.character_id asc, q.resource_type asc
  ), '[]'::jsonb)
  into v_resources
  from (
    select
      coalesce(re.character_id, 'unknown') as character_id,
      re.resource_type,
      coalesce(sum(abs(re.delta)) filter (where re.delta < 0), 0)::bigint as spent,
      coalesce(sum(re.delta) filter (where re.delta > 0), 0)::bigint as recovered,
      coalesce(sum(re.delta), 0)::bigint as net_change,
      count(*)::integer as events
    from public.resource_events re
    join public.player_profiles pp on pp.user_id = re.player_user_id
    where pp.account_tag is not null
    group by coalesce(re.character_id, 'unknown'), re.resource_type
  ) q;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'day', q.day,
      'matches', q.matches,
      'average_duration_seconds', q.average_duration_seconds
    ) order by q.day asc
  ), '[]'::jsonb)
  into v_matches_by_day
  from (
    select
      (date_trunc('day', m.ended_at))::date as day,
      count(*)::integer as matches,
      round(avg(m.duration_seconds))::bigint as average_duration_seconds
    from public.matches m
    where m.ended_at >= now() - interval '30 days'
      and exists (
        select 1
        from public.match_participants mp
        join public.player_profiles pp on pp.user_id = mp.user_id
        where mp.match_id = m.id
          and pp.account_tag is not null
      )
    group by (date_trunc('day', m.ended_at))::date
    order by day asc
  ) q;

  return jsonb_build_object(
    'totals', v_totals,
    'top_players', v_top_players,
    'characters', v_characters,
    'techniques', v_techniques,
    'resources', v_resources,
    'matches_by_day', v_matches_by_day,
    'registered_only', true,
    'server_time', now()
  );
end;
$$;

create or replace function public.jjk_global_level_leaderboard(p_limit integer default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  v_result jsonb;
begin
  perform public.jjk_require_user();

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'rank', q.position,
      'player_name', q.player_name,
      'account_tag', q.account_tag,
      'level', q.level,
      'xp', q.xp,
      'title', q.title,
      'matches', q.total_matches,
      'wins', q.wins,
      'win_rate', q.win_rate,
      'achievements', q.achievements
    ) order by q.position
  ), '[]'::jsonb)
  into v_result
  from (
    select
      row_number() over (order by ap.level desc, ap.xp desc, ap.wins desc, ap.updated_at asc) as position,
      pp.display_name as player_name,
      pp.account_tag,
      ap.level,
      ap.xp,
      ap.title,
      ap.total_matches,
      ap.wins,
      case when ap.total_matches > 0
        then round(100.0 * ap.wins / ap.total_matches, 1)
        else 0
      end as win_rate,
      count(pa.achievement_code) filter (where pa.unlocked_at is not null)::integer as achievements
    from public.account_progression ap
    join public.player_profiles pp
      on pp.user_id = ap.user_id
     and pp.account_tag is not null
    left join public.player_achievements pa on pa.user_id = ap.user_id
    group by ap.user_id, pp.display_name, pp.account_tag, ap.level, ap.xp, ap.title,
             ap.total_matches, ap.wins, ap.updated_at
    order by ap.level desc, ap.xp desc, ap.wins desc, ap.updated_at asc
    limit v_limit
  ) q;

  return v_result;
end;
$$;


-- =========================================================
-- 4. API ACCOUNT USATA DAL SITO V2.1
-- =========================================================

create or replace function public.jjk_username_available(p_display_name text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_name text := left(regexp_replace(btrim(coalesce(p_display_name, '')), '[[:space:]]+', ' ', 'g'), 30);
  v_tag text := lower(regexp_replace(replace(v_name, ' ', '_'), '[^a-zA-Z0-9_]', '', 'g'));
  v_valid boolean;
  v_available boolean;
begin
  v_tag := left(v_tag, 20);
  v_valid := char_length(v_name) between 3 and 30
    and v_tag ~ '^[a-z0-9_]{3,20}$';

  if not v_valid then
    return jsonb_build_object(
      'available', false,
      'valid', false,
      'display_name', v_name,
      'account_tag', v_tag,
      'reason', 'INVALID_USERNAME'
    );
  end if;

  v_available := public.jjk_account_tag_available(v_tag);
  return jsonb_build_object(
    'available', v_available,
    'valid', true,
    'display_name', v_name,
    'account_tag', v_tag,
    'reason', case when v_available then null else 'USERNAME_TAKEN' end
  );
end;
$$;

create or replace function public.jjk_account_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.player_profiles;
  v_email text;
  v_email_confirmed_at timestamptz;
  v_is_anonymous boolean := true;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;

  begin
    v_is_anonymous := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
  exception when others then
    v_is_anonymous := true;
  end;

  select * into v_profile
  from public.player_profiles pp
  where pp.user_id = v_user_id;

  select u.email, u.email_confirmed_at
  into v_email, v_email_confirmed_at
  from auth.users u
  where u.id = v_user_id;

  return jsonb_build_object(
    'user_id', v_user_id,
    'is_anonymous', v_is_anonymous,
    'is_registered', (not v_is_anonymous and v_profile.account_tag is not null),
    'display_name', v_profile.display_name,
    'account_tag', v_profile.account_tag,
    'registered_at', v_profile.registered_at,
    'first_seen_at', v_profile.first_seen_at,
    'last_seen_at', v_profile.last_seen_at,
    'email', v_email,
    'email_confirmed', v_email_confirmed_at is not null,
    'email_confirmed_at', v_email_confirmed_at
  );
end;
$$;

create or replace function public.jjk_complete_registration(p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_check jsonb;
  v_name text;
  v_tag text;
begin
  v_check := public.jjk_username_available(p_display_name);
  if not coalesce((v_check ->> 'valid')::boolean, false) then
    raise exception 'INVALID_USERNAME' using errcode = 'P0001';
  end if;
  if not coalesce((v_check ->> 'available')::boolean, false) then
    raise exception 'USERNAME_TAKEN' using errcode = 'P0001';
  end if;

  v_name := v_check ->> 'display_name';
  v_tag := v_check ->> 'account_tag';
  perform public.jjk_set_registered_profile(v_tag, v_name);
  return public.jjk_account_status();
end;
$$;

-- =========================================================
-- 4. PRIVILEGI
-- =========================================================

revoke all on function public.jjk_account_tag_available(text) from public;
revoke all on function public.jjk_username_available(text) from public;
revoke all on function public.jjk_account_status() from public, anon;
revoke all on function public.jjk_complete_registration(text) from public, anon;
revoke all on function public.jjk_set_registered_profile(text, text) from public, anon;
revoke all on function public.jjk_my_account_profile() from public, anon;
revoke all on function public.jjk_enforce_registered_room_player() from public, anon, authenticated;

grant execute on function public.jjk_account_tag_available(text) to anon, authenticated;
grant execute on function public.jjk_username_available(text) to anon, authenticated;
grant execute on function public.jjk_account_status() to authenticated;
grant execute on function public.jjk_complete_registration(text) to authenticated;
grant execute on function public.jjk_set_registered_profile(text, text) to authenticated;
grant execute on function public.jjk_my_account_profile() to authenticated;

commit;

-- =========================================================
-- 5. CONTROLLO FINALE
-- =========================================================

select 'column' as object_type, column_name as object_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'player_profiles'
  and column_name in ('account_tag', 'registered_at')

union all

select 'function' as object_type, p.proname as object_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'jjk_require_user',
    'jjk_account_tag_available',
    'jjk_username_available',
    'jjk_account_status',
    'jjk_complete_registration',
    'jjk_set_registered_profile',
    'jjk_my_account_profile',
    'jjk_global_statistics',
    'jjk_global_level_leaderboard'
  )

union all

select 'trigger' as object_type, t.tgname as object_name
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'room_players'
  and not t.tgisinternal
  and t.tgname in ('aa_room_players_registered_account_insert', 'aa_room_players_registered_account_update')

order by object_type, object_name;
