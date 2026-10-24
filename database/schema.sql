-- Clean local starter schema; no production records or migrations.
BEGIN;
CREATE TABLE IF NOT EXISTS dogs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  size text NOT NULL DEFAULT 'medium' CHECK (size IN ('small','small-medium','medium','medium-large','large')),
  sex text CHECK (sex IN ('male','female')),
  age text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  photo_url text NOT NULL DEFAULT '',
  is_adopted boolean NOT NULL DEFAULT false,
  traits jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(traits) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dogs_adopted_idx ON dogs (is_adopted, name);
CREATE TABLE IF NOT EXISTS dog_photos (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  dog_id text NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  filename text NOT NULL CHECK (filename ~ '^photo-[0-9]+\.jpg$'),
  sort_order integer NOT NULL CHECK (sort_order > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dog_id, filename)
);
CREATE TABLE IF NOT EXISTS form_submissions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  kind text NOT NULL CHECK (kind IN ('contact','sponsorship','visit','adoption_interest','volunteer','supply_donation','foster_home')),
  locale text NOT NULL DEFAULT 'pt' CHECK (locale IN ('pt','en')),
  source text NOT NULL DEFAULT '', page_url text NOT NULL DEFAULT '',
  context_label text NOT NULL DEFAULT '', context_value text NOT NULL DEFAULT '',
  name text NOT NULL, email text NOT NULL, phone text NOT NULL DEFAULT '',
  preferred_time text NOT NULL DEFAULT '', amount text NOT NULL DEFAULT '',
  business text NOT NULL DEFAULT '', contribution_method text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '', payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  email_sent boolean NOT NULL DEFAULT false,
  email_dry_run boolean NOT NULL DEFAULT true,
  email_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS form_submissions_created_idx ON form_submissions (created_at DESC);
COMMIT;
