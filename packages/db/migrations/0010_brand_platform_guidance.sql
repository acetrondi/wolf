-- 0010: brand-level writing guidance for each platform profile

alter table brand_platform_profile
  add column if not exists content_guidance jsonb not null default '{}'::jsonb;
