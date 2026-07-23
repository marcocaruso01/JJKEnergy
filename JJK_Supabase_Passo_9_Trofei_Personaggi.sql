-- JJK ENERGY - PASSO 9
-- Trofei specifici per personaggio: 10, 25 e 50 partite + 20 vittorie.
-- Eseguire dopo il Passo 6. Lo script e' rieseguibile e non cancella dati.

begin;

-- =========================================================
-- 1. CATALOGO DEI 36 NUOVI TROFEI
-- =========================================================

insert into public.achievement_definitions
  (code, name, description, icon, category, rule_key, threshold, xp_reward, sort_order)
values
  -- GOJO
  ('gojo_matches_10', 'Principiante dei sei occhi', 'Gioca Gojo per 10 partite.', '六', 'personaggi', 'matches_gojo', 10, 150, 1000),
  ('gojo_matches_25', 'Esperto dei sei occhi', 'Gioca Gojo per 25 partite.', '眼', 'personaggi', 'matches_gojo', 25, 300, 1010),
  ('gojo_matches_50', 'Maestro dei sei occhi', 'Gioca Gojo per 50 partite.', '∞', 'personaggi', 'matches_gojo', 50, 650, 1020),
  ('gojo_wins_20', 'Stregone più forte dell''era Moderna', 'Vinci 20 partite con Gojo.', '最', 'personaggi', 'wins_gojo', 20, 800, 1030),

  -- SUKUNA
  ('sukuna_matches_10', 'Guida delle Maledizioni', 'Gioca Sukuna per 10 partite.', '呪', 'personaggi', 'matches_sukuna', 10, 150, 1040),
  ('sukuna_matches_25', 'Principe delle Maledizioni', 'Gioca Sukuna per 25 partite.', '災', 'personaggi', 'matches_sukuna', 25, 300, 1050),
  ('sukuna_matches_50', 'Re delle Maledizioni', 'Gioca Sukuna per 50 partite.', '王', 'personaggi', 'matches_sukuna', 50, 650, 1060),
  ('sukuna_wins_20', 'Stregone più forte dell''era Antica', 'Vinci 20 partite con Sukuna.', '古', 'personaggi', 'wins_sukuna', 20, 800, 1070),

  -- TOJI
  ('toji_matches_10', 'Principiante Assassino', 'Gioca Toji per 10 partite.', '刃', 'personaggi', 'matches_toji', 10, 150, 1080),
  ('toji_matches_25', 'Esperto Assassino', 'Gioca Toji per 25 partite.', '殺', 'personaggi', 'matches_toji', 25, 300, 1090),
  ('toji_matches_50', 'Maestro Assassino', 'Gioca Toji per 50 partite.', '影', 'personaggi', 'matches_toji', 50, 650, 1100),
  ('toji_wins_20', 'Ammazza Stregoni', 'Vinci 20 partite con Toji.', '断', 'personaggi', 'wins_toji', 20, 800, 1110),

  -- YUTA
  ('yuta_matches_10', 'Ragazzo Fragile', 'Gioca Yuta per 10 partite.', '乙', 'personaggi', 'matches_yuta', 10, 150, 1120),
  ('yuta_matches_25', 'Il "Protetto" dalla Regina delle Maledizioni', 'Gioca Yuta per 25 partite.', '愛', 'personaggi', 'matches_yuta', 25, 300, 1130),
  ('yuta_matches_50', 'Il "Mostro"', 'Gioca Yuta per 50 partite.', '怪', 'personaggi', 'matches_yuta', 50, 650, 1140),
  ('yuta_wins_20', 'Il Successore di Satoru Gojo', 'Vinci 20 partite con Yuta.', '継', 'personaggi', 'wins_yuta', 20, 800, 1150),

  -- ITADORI
  ('itadori_matches_10', 'Ragazzo dal cuore D''oro', 'Gioca Itadori per 10 partite.', '心', 'personaggi', 'matches_itadori', 10, 150, 1160),
  ('itadori_matches_25', 'Ricettacolo Perfetto', 'Gioca Itadori per 25 partite.', '器', 'personaggi', 'matches_itadori', 25, 300, 1170),
  ('itadori_matches_50', '"L''IMMORTALE"', 'Gioca Itadori per 50 partite.', '不', 'personaggi', 'matches_itadori', 50, 650, 1180),
  ('itadori_wins_20', '¿Stregone più forte del futuro?', 'Vinci 20 partite con Itadori.', '未', 'personaggi', 'wins_itadori', 20, 800, 1190),

  -- JOGO
  ('jogo_matches_10', 'Nabbo Vulcanino', 'Gioca Jogo per 10 partite.', '火', 'personaggi', 'matches_jogo', 10, 150, 1200),
  ('jogo_matches_25', 'Vulcanino Navigato', 'Gioca Jogo per 25 partite.', '炎', 'personaggi', 'matches_jogo', 25, 300, 1210),
  ('jogo_matches_50', 'Sapiente Vulcanino', 'Gioca Jogo per 50 partite.', '山', 'personaggi', 'matches_jogo', 50, 650, 1220),
  ('jogo_wins_20', 'Asso Vulcaninico', 'Vinci 20 partite con Jogo.', '爆', 'personaggi', 'wins_jogo', 20, 800, 1230),

  -- GETO
  ('geto_matches_10', 'Raduna Maledizioni', 'Gioca Geto per 10 partite.', '群', 'personaggi', 'matches_geto', 10, 150, 1240),
  ('geto_matches_25', 'Comandante delle Maledizioni', 'Gioca Geto per 25 partite.', '将', 'personaggi', 'matches_geto', 25, 300, 1250),
  ('geto_matches_50', 'Sovrano delle Maledizioni', 'Gioca Geto per 50 partite.', '統', 'personaggi', 'matches_geto', 50, 650, 1260),
  ('geto_wins_20', 'Il Messia degli Stregoni', 'Vinci 20 partite con Geto.', '救', 'personaggi', 'wins_geto', 20, 800, 1270),

  -- MAHITO
  ('mahito_matches_10', 'Maledizione Nascente', 'Gioca Mahito per 10 partite.', '魂', 'personaggi', 'matches_mahito', 10, 150, 1280),
  ('mahito_matches_25', 'Artista dell''Anima', 'Gioca Mahito per 25 partite.', '形', 'personaggi', 'matches_mahito', 25, 300, 1290),
  ('mahito_matches_50', 'Scultore di Anime', 'Gioca Mahito per 50 partite.', '彫', 'personaggi', 'matches_mahito', 50, 650, 1300),
  ('mahito_wins_20', 'Incubo dell''Umanità', 'Vinci 20 partite con Mahito.', '悪', 'personaggi', 'wins_mahito', 20, 800, 1310),

  -- MEGUMI FUSHIGURO
  ('megumi_matches_10', 'Evocatore delle Dieci Ombre', 'Gioca Megumi per 10 partite.', '影', 'personaggi', 'matches_megumi', 10, 150, 1320),
  ('megumi_matches_25', 'Maestro delle Dieci Ombre', 'Gioca Megumi per 25 partite.', '十', 'personaggi', 'matches_megumi', 25, 300, 1330),
  ('megumi_matches_50', 'Erede del Clan Zenin', 'Gioca Megumi per 50 partite.', '禪', 'personaggi', 'matches_megumi', 50, 650, 1340),
  ('megumi_wins_20', 'Colui che Domò Mahoraga', 'Vinci 20 partite con Megumi.', '輪', 'personaggi', 'wins_megumi', 20, 800, 1350)
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
-- 2. PROGRESSIONE: CONTEGGIO PARTITE E VITTORIE PER PERSONAGGIO
-- =========================================================

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
  v_character_matches jsonb := '{}'::jsonb;
  v_character_wins jsonb := '{}'::jsonb;
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

  select
    coalesce(jsonb_object_agg(q.character_id, q.matches), '{}'::jsonb),
    coalesce(jsonb_object_agg(q.character_id, q.wins), '{}'::jsonb)
  into v_character_matches, v_character_wins
  from (
    select
      mp.character_id,
      count(*)::bigint as matches,
      count(*) filter (where mp.is_winner)::bigint as wins
    from public.match_participants mp
    where mp.user_id = p_user_id
      and mp.character_id is not null
    group by mp.character_id
  ) q;

  select count(*)::integer
  into v_techniques
  from public.technique_usage tu
  where tu.user_id = p_user_id;

  for v_definition in
    select *
    from public.achievement_definitions
    order by sort_order, code
  loop
    v_metric := case
      when v_definition.rule_key = 'matches' then v_matches
      when v_definition.rule_key = 'wins' then v_wins
      when v_definition.rule_key = 'techniques' then v_techniques
      when v_definition.rule_key = 'boss_rush' then v_boss_rush
      when v_definition.rule_key = 'play_seconds' then v_play_seconds
      when v_definition.rule_key = 'unique_characters' then v_unique_characters
      when left(v_definition.rule_key, 8) = 'matches_'
        then coalesce((v_character_matches ->> substring(v_definition.rule_key from 9))::bigint, 0)
      when left(v_definition.rule_key, 5) = 'wins_'
        then coalesce((v_character_wins ->> substring(v_definition.rule_key from 6))::bigint, 0)
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

-- La funzione interna resta non eseguibile direttamente dagli utenti.
revoke all on function public.jjk_refresh_progress_for_user(uuid) from public, anon, authenticated;

-- Aggiorna subito i progressi degli account gia' presenti.
do $$
declare
  v_user_id uuid;
begin
  for v_user_id in
    select distinct source.user_id
    from (
      select mp.user_id from public.match_participants mp where mp.user_id is not null
      union
      select pp.user_id from public.player_profiles pp where pp.user_id is not null
    ) source
  loop
    perform public.jjk_refresh_progress_for_user(v_user_id);
  end loop;
end;
$$;

commit;

-- Controllo finale: devono comparire 36 righe.
select code, name, rule_key, threshold
from public.achievement_definitions
where category = 'personaggi'
order by sort_order, code;
