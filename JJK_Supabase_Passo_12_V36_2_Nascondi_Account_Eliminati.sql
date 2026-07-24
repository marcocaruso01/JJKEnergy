-- JJK ENERGY - PASSO 12 / V36.2
-- Gli account eliminati dall'amministratore non compaiono piu
-- nell'elenco degli account attivi.
--
-- Script rieseguibile e non distruttivo.
-- Eseguire dopo il Passo 10 V36.

begin;

create or replace function public.jjk_admin_dashboard_v36(
  p_search text default null,
  p_limit integer default 200
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_admin uuid := public.jjk_require_site_admin();
  v_result jsonb;
  v_term text := '%' || lower(btrim(coalesce(p_search, ''))) || '%';
begin
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id', pp.user_id,
        'display_name', pp.display_name,
        'account_tag', pp.account_tag,
        'registered_at', pp.registered_at,
        'last_seen_at', pp.last_seen_at,
        'is_blocked', coalesce(ctl.is_blocked, false),
        'is_deleted', false,
        'block_reason', ctl.block_reason,
        'allowed_character_ids', ctl.allowed_character_ids,
        'online', exists(
          select 1
          from public.jjk_site_presence sp
          where sp.user_id = pp.user_id
            and sp.last_seen >= now() - interval '90 seconds'
        ),
        'matches', (
          select count(*)
          from public.match_participants mp
          where mp.user_id = pp.user_id
        ),
        'wins', (
          select count(*)
          from public.match_participants mp
          where mp.user_id = pp.user_id
            and mp.is_winner
        )
      )
      order by pp.registered_at desc nulls last, pp.account_tag
    ),
    '[]'::jsonb
  )
  into v_result
  from public.player_profiles pp
  left join public.jjk_account_controls ctl on ctl.user_id = pp.user_id
  where coalesce(ctl.is_deleted, false) = false
    and (
      p_search is null
      or btrim(p_search) = ''
      or lower(coalesce(pp.account_tag, '')) like v_term
      or lower(coalesce(pp.display_name, '')) like v_term
    )
  limit greatest(1, least(coalesce(p_limit, 200), 500));

  return v_result;
end;
$$;

revoke all on function public.jjk_admin_dashboard_v36(text, integer)
from public, anon;

grant execute on function public.jjk_admin_dashboard_v36(text, integer)
to authenticated;

commit;

select
  'V36.2 pronta' as stato,
  (
    select count(*)
    from public.player_profiles pp
    left join public.jjk_account_controls ctl on ctl.user_id = pp.user_id
    where coalesce(ctl.is_deleted, false) = false
  ) as account_attivi_visibili,
  (
    select count(*)
    from public.jjk_account_controls ctl
    where ctl.is_deleted = true
  ) as account_eliminati_nascosti;
