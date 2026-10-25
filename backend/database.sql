-- ERD: pemilik (1) -> (N) transaksi_modal; periode_laporan menyimpan
-- periode pelaporan dan modal awal untuk menghitung perubahan ekuitas.
-- Jalankan seluruh file ini di Supabase SQL Editor.

create extension if not exists pgcrypto;

do $$ begin
  create type public.jenis_transaksi_modal as enum ('setoran', 'prive', 'laba', 'rugi');
exception when duplicate_object then null;
end $$;

create table if not exists public.pemilik (
  id uuid primary key default gen_random_uuid(),
  nama text not null check (char_length(trim(nama)) >= 2),
  created_at timestamptz not null default now()
);

create table if not exists public.transaksi_modal (
  id uuid primary key default gen_random_uuid(),
  pemilik_id uuid references public.pemilik(id) on update cascade on delete restrict,
  tanggal date not null default current_date,
  jenis public.jenis_transaksi_modal not null,
  jumlah numeric(15, 2) not null check (jumlah > 0),
  keterangan text,
  no_bukti text,
  created_at timestamptz not null default now(),
  constraint transaksi_pemilik_required check (
    (jenis in ('setoran', 'prive') and pemilik_id is not null)
    or (jenis in ('laba', 'rugi') and pemilik_id is null)
  )
);

create table if not exists public.periode_laporan (
  id uuid primary key default gen_random_uuid(),
  nama_periode text not null unique check (nama_periode ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  modal_awal numeric(15, 2) not null default 0 check (modal_awal >= 0),
  created_at timestamptz not null default now()
);

create index if not exists transaksi_modal_tanggal_idx on public.transaksi_modal(tanggal desc);
create index if not exists transaksi_modal_pemilik_idx on public.transaksi_modal(pemilik_id);
create index if not exists transaksi_modal_jenis_idx on public.transaksi_modal(jenis);

alter table public.pemilik enable row level security;
alter table public.transaksi_modal enable row level security;
alter table public.periode_laporan enable row level security;

-- Policy anon hanya untuk demo/internal. Terapkan autentikasi dan policy
-- berdasarkan pengguna sebelum sistem digunakan secara publik.
drop policy if exists "anon read pemilik" on public.pemilik;
create policy "anon read pemilik" on public.pemilik for select to anon using (true);
drop policy if exists "anon insert pemilik" on public.pemilik;
create policy "anon insert pemilik" on public.pemilik for insert to anon with check (true);

drop policy if exists "anon read transaksi modal" on public.transaksi_modal;
create policy "anon read transaksi modal" on public.transaksi_modal for select to anon using (true);
drop policy if exists "anon insert transaksi modal" on public.transaksi_modal;
create policy "anon insert transaksi modal" on public.transaksi_modal for insert to anon with check (true);
drop policy if exists "anon delete transaksi modal" on public.transaksi_modal;
create policy "anon delete transaksi modal" on public.transaksi_modal for delete to anon using (true);

drop policy if exists "anon read periode laporan" on public.periode_laporan;
create policy "anon read periode laporan" on public.periode_laporan for select to anon using (true);
drop policy if exists "anon insert periode laporan" on public.periode_laporan;
create policy "anon insert periode laporan" on public.periode_laporan for insert to anon with check (true);
