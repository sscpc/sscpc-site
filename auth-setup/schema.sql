-- SSCPC authentication tables (PostgreSQL / Neon). Safe to run more than once.
-- Run with:  DATABASE_URL=... npm run setup-db     (or paste into the Neon SQL editor)

create table if not exists users (
  id                bigserial primary key,
  username          text        not null check (username = lower(username) and char_length(username) between 3 and 24),
  full_name         text        not null check (char_length(full_name) between 2 and 60),
  role              text        not null default 'general' check (role in ('super_admin', 'admin', 'editor', 'general')),
  status            text        not null default 'active'  check (status in ('active', 'pending', 'suspended')),
  terms_accepted_at timestamptz not null,
  created_at        timestamptz not null default now(),
  last_login_at     timestamptz
);

-- One account per username, case-insensitively.
create unique index if not exists users_username_lower_idx on users (lower(username));

-- Short-lived counters used for rate limiting (failed passkeys, availability checks, sign-ups).
create table if not exists auth_attempts (
  id         bigserial primary key,
  bucket     text        not null,
  created_at timestamptz not null default now()
);
create index if not exists auth_attempts_bucket_idx on auth_attempts (bucket, created_at);

-- Step 2: server-side sessions. Only a SHA-256 hash of the cookie token is stored, never the token itself.
create table if not exists sessions (
  id           bigserial primary key,
  token_hash   text        not null unique,
  user_id      bigint      not null references users(id) on delete cascade,
  pk_epoch     text        not null,           -- fingerprint of the shared passkey the session was created under
  created_at   timestamptz not null,
  last_seen_at timestamptz not null,
  expires_at   timestamptz not null,
  ip_hash      text,
  user_agent   text
);
create index if not exists sessions_user_idx on sessions (user_id);

-- Step 2: audit trail of sign-ins (kept 90 days). No passkeys, no raw IP addresses.
create table if not exists auth_events (
  id         bigserial primary key,
  type       text        not null,             -- signin_ok | signin_fail | signin_blocked | logout
  username   text,
  user_id    bigint,
  ip_hash    text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists auth_events_created_idx on auth_events (created_at);

-- Step 3: email, verification, four roles, magic-link tokens, settings.
-- Upgrading from Step 1/2 is automatic: this block adds what is missing and keeps every existing account.
alter table users add column if not exists email             text;
alter table users add column if not exists email_verified_at timestamptz;
alter table users add column if not exists updated_at        timestamptz;
alter table users drop constraint if exists users_role_check;
alter table users add  constraint users_role_check check (role in ('super_admin', 'admin', 'editor', 'general'));
-- One account per email address, case-insensitively (older accounts without an email are allowed).
create unique index if not exists users_email_lower_idx on users (lower(email)) where email is not null;

-- Magic-link email verification. A new registration is a users row with status 'pending'; it becomes 'active'
-- only when its link is used. Only the SHA-256 hash of each token is stored, never the token itself.
create table if not exists email_verification_tokens (
  id         bigserial primary key,
  user_id    bigint      not null references users(id) on delete cascade,
  token_hash text        not null unique,
  created_at timestamptz not null,
  expires_at timestamptz not null,               -- 15 minutes after creation
  used_at    timestamptz,                        -- set when used, or when a newer link replaced it
  ip_hash    text
);
create index if not exists email_tokens_user_idx on email_verification_tokens (user_id);

-- Server-side settings. 'shared_passkey_hash' holds the hash set from the portal (never the passkey itself).
create table if not exists settings (
  key        text        primary key,
  value      text        not null,
  updated_at timestamptz not null default now(),
  updated_by bigint      references users(id) on delete set null
);

alter table auth_events add column if not exists detail text;

-- Existing accounts: your Step 2 'admin' row stays an Admin. To make yourself Super Admin (needed to manage roles,
-- delete users and change the passkey), run once, with your own username:
--   update users set role = 'super_admin' where username = 'your.username';
