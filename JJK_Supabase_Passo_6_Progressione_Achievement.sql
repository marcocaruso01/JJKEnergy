-- JJK ENERGY - PASSO 6
-- Livelli account, titoli, badge, achievement e classifica progressione.
-- Eseguire dopo i Passi 2, 3, 4 e 5.
-- Lo script e' rieseguibile e non cancella dati esistenti.

begin;

-- =========================================================
-- 1. TABELLE DI PROGRESSIONE
-- =========================================================

create table if not exists public.account_progression (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp bigint not null default 0 check (xp >= 0),
  level integer not null default 1 check (level between 1 and 100),
  title text not null default 'Iniziato',
  total_matches integer not null default 0 check (total_matches >= 0),
  wins integer not null default 0 check (wins >= 0),
  techniques_used integer not null default 0 check (techniques_used >= 0),
  boss_rush_matches integer not null default 0 check (boss_rush_matches >= 0),
  total_play_seconds bigint not null default 0 check (total_play_seconds >= 0),
  unique_characters integer not null default 0 check (unique_characters >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.achievement_definitions (
  code text primary key,
  name text not null,
  description text not null,
  icon text not null default '✦',
  category text not null default 'general',
  rule_key text not null,
  threshold bigint not null check (threshold > 0),
  xp_reward integer not null default 0 check (xp_reward >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint achievement_code_format check (code ~ '^[a-z0-9_]{2,60}$'),
  constraint achievement_rule_format check (rule_key ~ '^[a-z0-9_]{2,60}$')
);

create table if not exists public.player_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_code text not null references public.achievement_definitions(code) on delete cascade,
  progress_value bigint not null default 0 check (progress_value >= 0),
  unlocked_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, achievement_code)
);

create index if not exists account_progression_level_idx
  on public.account_progression(level desc, xp desc);

create index if not exists player_achievements_user_unlocked_idx
  on public.player_achievements(user_id, unlocked_at desc);

-- =========================================================
-- 2. CATALOGO ACHIEVEMENT
-- =========================================================

insert into public.achievement_definitions
  (code, name, description, icon, category, rule_key, threshold, xp_reward, sort_order)
values
  ('first_match', 'Primo Scontro', 'Concludi la tua prima partita.', '⚔', 'partite', 'matches', 1, 50, 10),
  ('challenger_10', 'Contendente', 'Concludi 10 partite.', '十', 'partite', 'matches', 10, 180, 20),
  ('veteran_50', 'Veterano Jujutsu', 'Concludi 50 partite.', '章', 'partite', 'matches', 50, 650, 30),
  ('first_win', 'Prima Vittoria', 'Vinci la tua prima partita.', '冠', 'vittorie', 'wins', 1, 80, 40),
  ('winner_10', 'Stregone Vincente', 'Ottieni 10 vittorie.', '勝', 'vittorie', 'wins', 10, 280, 50),
  ('winner_50', 'Dominatore', 'Ottieni 50 vittorie.', '王', 'vittorie', 'wins', 50, 900, 60),
  ('technique_25', 'Apprendista delle Tecniche', 'Utilizza 25 tecniche.', '術', 'tecniche', 'techniques', 25, 120, 70),
  ('technique_100', 'Maestro delle Tecniche', 'Utilizza 100 tecniche.', '極', 'tecniche', 'techniques', 100, 400, 80),
  ('technique_500', 'Archivio Vivente', 'Utilizza 500 tecniche.', '書', 'tecniche', 'techniques', 500, 1200, 90),
  ('boss_rush_1', 'Sopravvissuto alla Boss Rush', 'Concludi una partita con Boss Rush attiva.', '∞', 'boss_rush', 'boss_rush', 1, 120, 100),
  ('boss_rush_10', 'Cacciatore di Boss', 'Concludi 10 partite con Boss Rush attiva.', '鬼', 'boss_rush', 'boss_rush', 10, 550, 110),
  ('playtime_1h', 'Un Ora nel Regno Maledetto', 'Accumula un ora di gioco.', '時', 'tempo', 'play_seconds', 3600, 120, 120),
  ('playtime_10h', 'Maratona Jujutsu', 'Accumula dieci ore di gioco.', '刻', 'tempo', 'play_seconds', 36000, 700, 130),
  ('versatile_5', 'Stregone Versatile', 'Concludi partite con 5 personaggi diversi.', '五', 'roster', 'unique_characters', 5, 350, 140),
  ('master_roster', 'Maestro del Roster', 'Concludi partite con tutti i 9 personaggi.', '九', 'roster', 'unique_characters', 9, 1000, 150)
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    icon = excluded.icon,
    category = excluded.category,
    rule_key = excluded.rule_key,
    threshold = excluded.threshold,
    xp_reward = excluded.xp_reward,
    sort_order = excluded.sort_order,
    updated_at = now();

-- =========================================================
-- 3. FUNZIONI DI SUPPORTO
-- =========================================================

create or replace function public.jjk_account_title(p_level integer)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when coalesce(p_level, 1) >= 100 then 'Leggenda Jujutsu'
    when coalesce(p_level, 1) >= 75 then 'Maestro dell''Energia Maledetta'
    when coalesce(p_level, 1) >= 55 then 'Special Grade'
    when coalesce(p_level, 1) >= 40 then 'Semi Special Grade'
    when coalesce(p_level, 1) >= 28 then 'Stregone di Grado 1'
    when coalesce(p_level, 1) >= 18 then 'Stregone di Grado 2'
    when coalesce(p_level, 1) >= 10 then 'Stregone di Grado 3'
    when coalesce(p_level, 1) >= 5 then 'Stregone di Grado 4'
    else 'Iniziato'
  end;
$$;

create or replace function public.jjk_refresh_progress_for_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_matches integer := 0;
  v_wins integer := 0;
  v_techniques integer := 0;
  v_boss_rush integer := 0;
  v_play_seconds bigint := 0;
  v_unique_characters integer := 0;
  v_reward_xp bigint := 0;
  v_xp bigint := 0;
  v_level integer := 1;
  v_title text := 'Iniziato';
  v_level_start bigint := 0;
  v_level_end bigint := 120;
  v_progress numeric := 0;
  v_metric bigint := 0;
  v_previous_unlock timestamptz;
  v_achievements jsonb := '[]'::jsonb;
  v_newly_unlocked jsonb := '[]'::jsonb;
  v_unlocked_count integer := 0;
  v_total_achievements integer := 0;
  v_definition record;
begin
  if p_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select
    count(*)::integer,
    count(*) filter (where mp.is_winner)::integer,
    coalesce(sum(m.duration_seconds), 0)::bigint,
    count(distinct mp.character_id)::integer,
    count(*) filter (where m.boss_rush_used)::integer
  into v_matches, v_wins, v_play_seconds, v_unique_characters, v_boss_rush
  from public.match_participants mp
  join public.matches m on m.id = mp.match_id
  where mp.user_id = p_user_id;

  select count(*)::integer
  into v_techniques
  from public.technique_usage tu
  where tu.user_id = p_user_id;

  for v_definition in
    select *
    from public.achievement_definitions
    order by sort_order, code
  loop
    v_metric := case v_definition.rule_key
      when 'matches' then v_matches
      when 'wins' then v_wins
      when 'techniques' then v_techniques
      when 'boss_rush' then v_boss_rush
      when 'play_seconds' then v_play_seconds
      when 'unique_characters' then v_unique_characters
      else 0
    end;

    select pa.unlocked_at
    into v_previous_unlock
    from public.player_achievements pa
    where pa.user_id = p_user_id
      and pa.achievement_code = v_definition.code;

    if v_metric >= v_definition.threshold then
      if v_previous_unlock is null then
        v_newly_unlocked := v_newly_unlocked || jsonb_build_array(v_definition.code);
      end if;

      insert into public.player_achievements(
        user_id, achievement_code, progress_value, unlocked_at, updated_at
      ) values (
        p_user_id, v_definition.code, v_metric, coalesce(v_previous_unlock, now()), now()
      )
      on conflict (user_id, achievement_code) do update
      set progress_value = excluded.progress_value,
          unlocked_at = coalesce(public.player_achievements.unlocked_at, excluded.unlocked_at),
          updated_at = now();
    else
      insert into public.player_achievements(
        user_id, achievement_code, progress_value, unlocked_at, updated_at
      ) values (
        p_user_id, v_definition.code, v_metric, v_previous_unlock, now()
      )
      on conflict (user_id, achievement_code) do update
      set progress_value = excluded.progress_value,
          updated_at = now();
    end if;
  end loop;

  select coalesce(sum(ad.xp_reward), 0)::bigint
  into v_reward_xp
  from public.player_achievements pa
  join public.achievement_definitions ad on ad.code = pa.achievement_code
  where pa.user_id = p_user_id
    and pa.unlocked_at is not null;

  v_xp :=
      (v_matches::bigint * 60)
    + (v_wins::bigint * 120)
    + (v_techniques::bigint * 3)
    + greatest(0, floor(v_play_seconds::numeric / 60))::bigint
    + (v_boss_rush::bigint * 50)
    + (v_unique_characters::bigint * 30)
    + v_reward_xp;

  v_level := least(100, greatest(1, floor(sqrt(v_xp::numeric / 120))::integer + 1));
  v_title := public.jjk_account_title(v_level);
  v_level_start := 120 * ((v_level - 1)::bigint * (v_level - 1)::bigint);
  v_level_end := case when v_level >= 100 then v_xp else 120 * (v_level::bigint * v_level::bigint) end;
  v_progress := case
    when v_level >= 100 then 100
    when v_level_end <= v_level_start then 100
    else round(100.0 * (v_xp - v_level_start) / nullif(v_level_end - v_level_start, 0), 1)
  end;

  insert into public.account_progression(
    user_id, xp, level, title, total_matches, wins, techniques_used,
    boss_rush_matches, total_play_seconds, unique_characters, updated_at
  ) values (
    p_user_id, v_xp, v_level, v_title, v_matches, v_wins, v_techniques,
    v_boss_rush, v_play_seconds, v_unique_characters, now()
  )
  on conflict (user_id) do update
  set xp = excluded.xp,
      level = excluded.level,
      title = excluded.title,
      total_matches = excluded.total_matches,
      wins = excluded.wins,
      techniques_used = excluded.techniques_used,
      boss_rush_matches = excluded.boss_rush_matches,
      total_play_seconds = excluded.total_play_seconds,
      unique_characters = excluded.unique_characters,
      updated_at = now();

  select
    count(*) filter (where pa.unlocked_at is not null)::integer,
    count(*)::integer,
    coalesce(jsonb_agg(
      jsonb_build_object(
        'code', ad.code,
        'name', ad.name,
        'description', ad.description,
        'icon', ad.icon,
        'category', ad.category,
        'threshold', ad.threshold,
        'xp_reward', ad.xp_reward,
        'progress', least(coalesce(pa.progress_value, 0), ad.threshold),
        'unlocked', pa.unlocked_at is not null,
        'unlocked_at', pa.unlocked_at
      ) order by ad.sort_order, ad.code
    ), '[]'::jsonb)
  into v_unlocked_count, v_total_achievements, v_achievements
  from public.achievement_definitions ad
  left join public.player_achievements pa
    on pa.achievement_code = ad.code
   and pa.user_id = p_user_id;

  return jsonb_build_object(
    'progression', jsonb_build_object(
      'xp', v_xp,
      'level', v_level,
      'title', v_title,
      'level_start_xp', v_level_start,
      'next_level_xp', v_level_end,
      'progress_percent', v_progress,
      'matches', v_matches,
      'wins', v_wins,
      'techniques_used', v_techniques,
      'boss_rush_matches', v_boss_rush,
      'total_play_seconds', v_play_seconds,
      'unique_characters', v_unique_characters,
      'achievements_unlocked', v_unlocked_count,
      'achievements_total', v_total_achievements
    ),
    'achievements', v_achievements,
    'newly_unlocked', v_newly_unlocked,
    'server_time', now()
  );
end;
$$;

create or replace function public.jjk_my_progression()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.jjk_refresh_progress_for_user(public.jjk_require_user());
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
      coalesce(pp.display_name, 'Giocatore') as player_name,
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
    left join public.player_profiles pp on pp.user_id = ap.user_id
    left join public.player_achievements pa on pa.user_id = ap.user_id
    group by ap.user_id, pp.display_name, ap.level, ap.xp, ap.title,
             ap.total_matches, ap.wins, ap.updated_at
    order by ap.level desc, ap.xp desc, ap.wins desc, ap.updated_at asc
    limit v_limit
  ) q;

  return v_result;
end;
$$;

-- =========================================================
-- 4. AGGIORNAMENTO AUTOMATICO
-- =========================================================

create or replace function public.jjk_progression_refresh_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null then
    perform public.jjk_refresh_progress_for_user(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists progression_after_match_participant on public.match_participants;
create trigger progression_after_match_participant
after insert or update of is_winner on public.match_participants
for each row execute function public.jjk_progression_refresh_trigger();

drop trigger if exists progression_after_technique on public.technique_usage;
create trigger progression_after_technique
after insert on public.technique_usage
for each row execute function public.jjk_progression_refresh_trigger();

drop trigger if exists account_progression_set_updated_at on public.account_progression;
create trigger account_progression_set_updated_at
before update on public.account_progression
for each row execute function public.jjk_set_updated_at();

create or replace function public.jjk_progression_pulse_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.jjk_stats_pulse('account_progression:' || TG_OP);
  return new;
end;
$$;

drop trigger if exists account_progression_stats_pulse on public.account_progression;
create trigger account_progression_stats_pulse
after insert or update on public.account_progression
for each row execute function public.jjk_progression_pulse_trigger();

-- Backfill per gli utenti gia' presenti nelle statistiche.
do $$
declare
  v_user_id uuid;
begin
  for v_user_id in
    select distinct source.user_id
    from (
      select mp.user_id from public.match_participants mp where mp.user_id is not null
      union
      select pp.user_id from public.player_profiles pp
    ) source
  loop
    perform public.jjk_refresh_progress_for_user(v_user_id);
  end loop;
end;
$$;

-- =========================================================
-- 5. SICUREZZA E PERMESSI
-- =========================================================

alter table public.account_progression enable row level security;
alter table public.achievement_definitions enable row level security;
alter table public.player_achievements enable row level security;

revoke all on table public.account_progression from anon, authenticated;
revoke all on table public.achievement_definitions from anon, authenticated;
revoke all on table public.player_achievements from anon, authenticated;

revoke all on function public.jjk_account_title(integer) from public, anon, authenticated;
revoke all on function public.jjk_refresh_progress_for_user(uuid) from public, anon, authenticated;
revoke all on function public.jjk_progression_refresh_trigger() from public, anon, authenticated;
revoke all on function public.jjk_progression_pulse_trigger() from public, anon, authenticated;
revoke all on function public.jjk_my_progression() from public, anon;
revoke all on function public.jjk_global_level_leaderboard(integer) from public, anon;

grant execute on function public.jjk_my_progression() to authenticated;
grant execute on function public.jjk_global_level_leaderboard(integer) to authenticated;

commit;

-- Controllo finale: devono comparire 3 tabelle e 3 funzioni pubbliche principali.
select 'table' as object_type, table_name as object_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('account_progression', 'achievement_definitions', 'player_achievements')
union all
select 'function' as object_type, p.proname as object_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('jjk_my_progression', 'jjk_global_level_leaderboard', 'jjk_refresh_progress_for_user')
order by object_type, object_name;
