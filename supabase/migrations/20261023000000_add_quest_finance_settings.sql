-- SwimPartners Quest 財務マスタ設定初期データ登録
insert into app_configs (key, value, description)
values (
  'quest_finance_settings',
  '{"safe_reserve_cash":3000000,"total_cash_balance":5550000,"ad_spend_google_default":60000,"ad_spend_meta_default":20000,"system_tool_cost_default":19500,"insurance_cost_default":8000,"joto_friday_capacity":12,"facility_cost_per_lesson":700,"ceo_hourly_rate":3500}',
  'SwimPartners Quest 月次財務・経営指標マスタ設定（生活防衛資金、総保有キャッシュ、広告費デフォルト、城東小定員など）'
)
on conflict (key) do nothing;
