-- JJK ENERGY - PASSO 11 / V36.1
-- Ripristina la classifica completa, rende visibili tutti i trofei personali
-- e abilita i profili pubblici in sola lettura degli altri giocatori.
-- Eseguire dopo i Passi 2-10. Rieseguibile e non distruttivo.

begin;

-- =========================================================
-- 1. CLASSIFICA GLOBALE ARRICCHITA
-- =========================================================

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

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'rank', q.position,
        'user_id', q.user_id,
        'player_name', q.player_name,
        'display_name', q.player_name,
        'account_tag', q.account_tag,
        'level', q.level,
        'xp', q.xp,
        'title', q.title,
        'matches', q.total_matches,
        'wins', q.wins,
        'win_rate', q.win_rate,
        'achievements', q.achievements,
        'total_play_seconds', q.total_play_seconds,
        'techniques_used', q.techniques_used,
        'boss_rush_matches', q.boss_rush_matches,
        'unique_characters', q.unique_characters
      ) order by q.position
    ),
    '[]'::jsonb
  )
  into v_result
  from (
    select
      row_number() over (
        order by ap.level desc, ap.xp desc, ap.wins desc, ap.updated_at asc
      ) as position,
      ap.user_id,
      coalesce(pp.display_name, pp.account_tag, 'Giocatore') as player_name,
      pp.account_tag,
      ap.level,
      ap.xp,
      ap.title,
      ap.total_matches,
      ap.wins,
      ap.total_play_seconds,
      ap.techniques_used,
      ap.boss_rush_matches,
      ap.unique_characters,
      case
        when ap.total_matches > 0 then round(100.0 * ap.wins / ap.total_matches, 1)
        else 0
      end as win_rate,
      count(pa.achievement_code) filter (where pa.unlocked_at is not null)::integer as achievements
    from public.account_progression ap
    left join public.player_profiles pp on pp.user_id = ap.user_id
    left join public.player_achievements pa on pa.user_id = ap.user_id
    left join public.jjk_account_controls ctl on ctl.user_id = ap.user_id
    where coalesce(ctl.is_blocked, false) = false
      and coalesce(ctl.is_deleted, false) = false
    group by
      ap.user_id,
      pp.display_name,
      pp.account_tag,
      ap.level,
      ap.xp,
      ap.title,
      ap.total_matches,
      ap.wins,
      ap.total_play_seconds,
      ap.techniques_used,
      ap.boss_rush_matches,
      ap.unique_characters,
      ap.updated_at
    order by ap.level desc, ap.xp desc, ap.wins desc, ap.updated_at asc
    limit v_limit
  ) q;

  return v_result;
end;
$$;

-- =========================================================
-- 2. PROFILO PUBBLICO DI UN GIOCATORE
-- =========================================================

create or replace function public.jjk_public_player_profile_v361(
  p_user_id uuid default null,
  p_account_tag text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requester uuid := public.jjk_require_user();
  v_target uuid;
  v_account jsonb;
  v_progression jsonb;
  v_achievements jsonb := '[]'::jsonb;
  v_techniques jsonb := '[]'::jsonb;
  v_characters jsonb := '[]'::jsonb;
  v_recent jsonb := '[]'::jsonb;
  v_level integer := 1;
  v_xp bigint := 0;
  v_level_start bigint := 0;
  v_next_level bigint := 120;
  v_progress numeric := 0;
begin
  if p_user_id is not null then
    v_target := p_user_id;
  elsif nullif(btrim(coalesce(p_account_tag, '')), '') is not null then
    select pp.user_id
      into v_target
    from public.player_profiles pp
    where lower(pp.account_tag) = lower(btrim(p_account_tag))
    limit 1;
  else
    v_target := v_requester;
  end if;

  if v_target is null then
    raise exception 'PUBLIC_PROFILE_NOT_FOUND' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.jjk_account_controls ctl
    where ctl.user_id = v_target
      and (ctl.is_blocked or ctl.is_deleted)
  ) then
    raise exception 'PUBLIC_PROFILE_NOT_AVAILABLE' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.player_profiles pp where pp.user_id = v_target
  ) then
    raise exception 'PUBLIC_PROFILE_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- Aggiorna i conteggi ufficiali prima di mostrare il profilo.
  perform public.jjk_refresh_progress_for_user(v_target);

  select jsonb_build_object(
    'user_id', pp.user_id,
    'display_name', pp.display_name,
    'account_tag', pp.account_tag,
    'registered_at', pp.registered_at,
    'last_seen_at', pp.last_seen_at
  )
  into v_account
  from public.player_profiles pp
  where pp.user_id = v_target;

  select ap.level, ap.xp
    into v_level, v_xp
  from public.account_progression ap
  where ap.user_id = v_target;

  v_level := coalesce(v_level, 1);
  v_xp := coalesce(v_xp, 0);
  v_level_start := 120 * ((v_level - 1)::bigint * (v_level - 1)::bigint);
  v_next_level := case
    when v_level >= 100 then v_xp
    else 120 * (v_level::bigint * v_level::bigint)
  end;
  v_progress := case
    when v_level >= 100 then 100
    when v_next_level <= v_level_start then 100
    else round(100.0 * (v_xp - v_level_start) / nullif(v_next_level - v_level_start, 0), 1)
  end;

  select jsonb_build_object(
    'level', ap.level,
    'xp', ap.xp,
    'title', ap.title,
    'level_start_xp', v_level_start,
    'next_level_xp', v_next_level,
    'progress_percent', v_progress,
    'total_matches', ap.total_matches,
    'wins', ap.wins,
    'techniques_used', ap.techniques_used,
    'boss_rush_matches', ap.boss_rush_matches,
    'total_play_seconds', ap.total_play_seconds,
    'unique_characters', ap.unique_characters,
    'achievements_unlocked', (
      select count(*)::integer
      from public.player_achievements pa
      where pa.user_id = v_target
        and pa.unlocked_at is not null
    )
  )
  into v_progression
  from public.account_progression ap
  where ap.user_id = v_target;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'code', ad.code,
        'name', ad.name,
        'description', ad.description,
        'icon', ad.icon,
        'category', ad.category,
        'xp_reward', ad.xp_reward,
        'unlocked_at', pa.unlocked_at
      ) order by pa.unlocked_at desc, ad.sort_order
    ),
    '[]'::jsonb
  )
  into v_achievements
  from public.player_achievements pa
  join public.achievement_definitions ad on ad.code = pa.achievement_code
  where pa.user_id = v_target
    and pa.unlocked_at is not null;

  -- to_jsonb mantiene la funzione compatibile anche con vecchie versioni
  -- della tabella technique_usage che possono avere colonne aggiuntive.
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'technique_name', q.technique_name,
        'character_id', q.character_id,
        'uses', q.uses
      ) order by q.uses desc, q.technique_name
    ),
    '[]'::jsonb
  )
  into v_techniques
  from (
    select
      coalesce(
        nullif(to_jsonb(tu) ->> 'technique_name', ''),
        nullif(to_jsonb(tu) ->> 'technique_key', ''),
        'Tecnica'
      ) as technique_name,
      coalesce(
        nullif(to_jsonb(tu) ->> 'character_id', ''),
        nullif((to_jsonb(tu) -> 'details') ->> 'source_character', ''),
        'unknown'
      ) as character_id,
      count(*)::integer as uses
    from public.technique_usage tu
    where tu.user_id = v_target
    group by 1, 2
    order by count(*) desc
    limit 10
  ) q;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'character_id', q.character_id,
        'matches', q.matches,
        'wins', q.wins
      ) order by q.matches desc, q.wins desc, q.character_id
    ),
    '[]'::jsonb
  )
  into v_characters
  from (
    select
      mp.character_id,
      count(*)::integer as matches,
      count(*) filter (where mp.is_winner)::integer as wins
    from public.match_participants mp
    where mp.user_id = v_target
      and mp.character_id is not null
    group by mp.character_id
    order by count(*) desc, count(*) filter (where mp.is_winner) desc
    limit 9
  ) q;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'match_id', q.match_id,
        'ended_at', q.ended_at,
        'duration_seconds', q.duration_seconds,
        'character_id', q.character_id,
        'is_winner', q.is_winner,
        'boss_rush_used', q.boss_rush_used
      ) order by q.ended_at desc
    ),
    '[]'::jsonb
  )
  into v_recent
  from (
    select
      m.id as match_id,
      m.ended_at,
      m.duration_seconds,
      mp.character_id,
      mp.is_winner,
      m.boss_rush_used
    from public.match_participants mp
    join public.matches m on m.id = mp.match_id
    where mp.user_id = v_target
      and m.ended_at is not null
    order by m.ended_at desc
    limit 8
  ) q;

  return jsonb_build_object(
    'account', coalesce(v_account, '{}'::jsonb),
    'progression', coalesce(v_progression, '{}'::jsonb),
    'achievements', v_achievements,
    'top_techniques', v_techniques,
    'favorite_characters', v_characters,
    'recent_matches', v_recent,
    'viewer_is_owner', v_requester = v_target,
    'server_time', now()
  );
end;
$$;

revoke all on function public.jjk_global_level_leaderboard(integer) from public, anon;
revoke all on function public.jjk_public_player_profile_v361(uuid, text) from public, anon;
grant execute on function public.jjk_global_level_leaderboard(integer) to authenticated;
grant execute on function public.jjk_public_player_profile_v361(uuid, text) to authenticated;

commit;

select
  'V36.1 pronta' as stato,
  (select count(*) from public.account_progression) as profili_in_classifica,
  (select count(*) from public.player_achievements where unlocked_at is not null) as trofei_sbloccati;
