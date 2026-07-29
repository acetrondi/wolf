-- 0009: sample curator tags for voice onboarding

alter table brand_voice_sample
  add column if not exists curator_tag text
  check (curator_tag is null or curator_tag in ('performed', 'liked', 'deleted', 'annoyed'));
