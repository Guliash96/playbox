-- PlayBox database. Run once in Supabase → SQL Editor → New query → Run.
-- Players sign in anonymously (one account per device / Telegram app). All writes go through the
-- functions below (SECURITY DEFINER), so the public anon key cannot edit tables directly.

create table if not exists public.players (
  id uuid primary key references auth.users(id) on delete cascade,
  nick text not null,
  renames int not null default 0,          -- changes after the first nickname
  rename_credits int not null default 0,   -- paid changes (added later by the payment webhook)
  created_at timestamptz not null default now()
);
create unique index if not exists players_nick_lower on public.players (lower(nick));

create table if not exists public.scores (
  player_id uuid not null references public.players(id) on delete cascade,
  game text not null,
  points bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (player_id, game)
);
create index if not exists scores_game_points on public.scores (game, points desc);

create table if not exists public.bad_words (w text primary key);

alter table public.players enable row level security;
alter table public.scores enable row level security;
alter table public.bad_words enable row level security;
drop policy if exists "players readable" on public.players;
drop policy if exists "scores readable" on public.scores;
create policy "players readable" on public.players for select using (true);
create policy "scores readable" on public.scores for select using (true);
-- bad_words: no policies → not readable from the app, only by the functions below.

-- nickname rules: 6–16 chars, no spaces/symbols except _ . -, not digits only, no banned words
create or replace function public.nick_check(n text) returns text
language plpgsql stable security definer set search_path = public as $$
declare l text := lower(coalesce(n, ''));
begin
  if char_length(n) < 6 or char_length(n) > 16 or n ~ '[[:space:][:cntrl:]<>"''`/\\|{}()\[\]#@!?,;:+=*&%$^~]' then return 'format'; end if;
  if n ~ '^[0-9._-]+$' then return 'digits'; end if;
  if exists (select 1 from bad_words b where position(b.w in l) > 0) then return 'bad'; end if;
  return 'ok';
end $$;

create or replace function public.nick_free(n text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from players where lower(nick) = lower(n) and id is distinct from auth.uid());
$$;

-- returns ok | format | digits | bad | taken | pay | auth
create or replace function public.set_nick(n text) returns text
language plpgsql security definer set search_path = public as $$
declare r text := nick_check(n); p players;
begin
  if auth.uid() is null then return 'auth'; end if;
  if r <> 'ok' then return r; end if;
  if exists (select 1 from players where lower(nick) = lower(n) and id <> auth.uid()) then return 'taken'; end if;
  select * into p from players where id = auth.uid();
  if not found then insert into players (id, nick) values (auth.uid(), n); return 'ok'; end if;
  if lower(p.nick) = lower(n) then update players set nick = n where id = p.id; return 'ok'; end if;
  if p.renames >= 1 and p.rename_credits < 1 then return 'pay'; end if;
  update players set nick = n, renames = renames + 1,
    rename_credits = case when p.renames >= 1 then rename_credits - 1 else rename_credits end
  where id = p.id;
  return 'ok';
end $$;

create or replace function public.my_profile() returns table (nick text, renames int, rename_credits int)
language sql stable security definer set search_path = public as $$
  select nick, renames, rename_credits from players where id = auth.uid();
$$;

-- adds points to this player's total for a game (basic sanity limit against tampering)
create or replace function public.add_points(g text, pts int) returns bigint
language plpgsql security definer set search_path = public as $$
declare total bigint;
begin
  if auth.uid() is null or not exists (select 1 from players where id = auth.uid()) then return null; end if;
  if pts is null or pts <= 0 or pts > 200000 or g !~ '^[a-z]{2,16}$' then return null; end if;
  insert into scores (player_id, game, points) values (auth.uid(), g, pts)
  on conflict (player_id, game) do update set points = scores.points + excluded.points, updated_at = now()
  returning points into total;
  return total;
end $$;

create or replace function public.top_scores(g text, lim int default 50)
returns table (nick text, points bigint, me boolean)
language sql stable security definer set search_path = public as $$
  select p.nick, s.points, s.player_id = auth.uid()
  from scores s join players p on p.id = s.player_id
  where s.game = g order by s.points desc, s.updated_at asc limit least(lim, 100);
$$;

create or replace function public.my_rank(g text) returns table (rank bigint, points bigint)
language sql stable security definer set search_path = public as $$
  select (select count(*) + 1 from scores o where o.game = g and o.points > s.points), s.points
  from scores s where s.game = g and s.player_id = auth.uid();
$$;

grant execute on function public.nick_check(text), public.nick_free(text), public.set_nick(text), public.my_profile(),
  public.add_points(text, int), public.top_scores(text, int), public.my_rank(text) to anon, authenticated;

-- starter list of banned fragments (add more any time: insert into bad_words values ('word');)
insert into public.bad_words (w) values
  ('fuck'),('shit'),('cunt'),('nigger'),('nigga'),('faggot'),('whore'),('slut'),('retard'),('hitler'),('rapist'),('pedo'),
  ('хуй'),('хуе'),('хуё'),('хуи'),('пизд'),('ебат'),('ебал'),('ёб'),('бля'),('сука'),('пидор'),('пидар'),('підар'),('підор'),('гандон'),('шлюх'),('мудак'),('залуп'),
  ('kurwa'),('chuj'),('jebac'),('jebać'),('pierdol'),('pedał'),
  ('scheisse'),('scheiße'),('fotze'),('hurensohn'),('wichser'),
  ('mierda'),('cabron'),('cabrón'),('maricon'),('maricón'),('pendejo'),('gilipollas'),
  ('orospu'),('siktir'),('yarrak'),('pezevenk'),
  ('caralho'),('buceta'),('viado'),('filhodaputa'),
  ('salope'),('connard'),('encule'),('enculé')
on conflict do nothing;
