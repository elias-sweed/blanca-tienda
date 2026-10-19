-- ============================================================================
-- Blanca Tienda - esquema inicial en Supabase
--
-- Una sola persona (una cuenta maestra). Cada fila guarda su `user_id` y las
-- politicas RLS impiden que cualquier otra cuenta lea o escriba.
--
-- Como pegar este script:
--   1) Entra a tu proyecto de Supabase.
--   2) Menu izquierdo: "SQL Editor" -> "New query".
--   3) Pega TODO este archivo y pulsa "Run".
--   4) Ve a "Table Editor": deben aparecer las tablas.
--
-- Se puede ejecutar mas de una vez sin duplicar nada (usa IF NOT EXISTS).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Columnas comunes a todas las tablas del negocio:
--   id          texto (lo genera la app, sirve para sincronizar sin choques)
--   user_id     dueno de la fila (llave para RLS)
--   created_at  cuando se creo
--   updated_at  ultima modificacion (para resolver conflictos)
--   deleted     borrado logico (nunca se borra de verdad, para poder sincronizar)
-- ---------------------------------------------------------------------------

-- Productos
create table if not exists public.products (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted     boolean not null default false,
  name        text not null,
  code        text,
  category    text,
  price       numeric(12,2) not null default 0,
  cost        numeric(12,2),
  stock_min   integer not null default 0,
  active      boolean not null default true
);

-- Tallas y colores de cada producto (variantes)
create table if not exists public.product_variants (
  id          text primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted     boolean not null default false,
  product_id  text not null,
  size        text,
  color       text,
  quantity    integer not null default 0,
  code        text
);

-- Ventas
create table if not exists public.sales (
  id                text primary key,
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted           boolean not null default false,
  total             numeric(12,2) not null default 0,
  payment_method    text not null,
  date              date not null,
  note              text,
  register_id       text,
  amount_paid       numeric(12,2),
  change_amount     numeric(12,2),
  anulada           boolean not null default false,
  anulada_at        timestamptz,
  anulada_motivo    text,
  client_request_id text
);

-- Detalle de cada venta (que se vendio)
create table if not exists public.sale_items (
  id           text primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted      boolean not null default false,
  sale_id      text not null,
  variant_id   text not null,
  product_name text not null,
  quantity     integer not null default 0,
  unit_price   numeric(12,2) not null default 0,
  subtotal     numeric(12,2) not null default 0
);

-- Movimientos de inventario (entradas, ventas, ajustes...)
create table if not exists public.inventory_movements (
  id           text primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted      boolean not null default false,
  variant_id   text not null,
  product_name text not null,
  reason       text not null,
  quantity     integer not null default 0,
  note         text
);

-- Apertura y cierre de caja
create table if not exists public.cash_registers (
  id             text primary key,
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted        boolean not null default false,
  date           date not null,
  opening_amount numeric(12,2) not null default 0,
  opened_at      timestamptz,
  closed_at      timestamptz,
  status         text not null default 'abierta'
);

-- Cuadre de caja
create table if not exists public.cash_closures (
  id            text primary key,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted       boolean not null default false,
  register_id   text not null,
  date          date not null,
  total_cash    numeric(12,2) not null default 0,
  total_yape    numeric(12,2) not null default 0,
  total_plin    numeric(12,2) not null default 0,
  total_tarjeta numeric(12,2) not null default 0,
  total_otro    numeric(12,2) not null default 0,
  expected_cash numeric(12,2) not null default 0,
  counted_cash  numeric(12,2) not null default 0,
  difference    numeric(12,2) not null default 0
);

-- Compras al por mayor
create table if not exists public.compras (
  id                   text primary key,
  user_id              uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted              boolean not null default false,
  producto_id          text not null,
  variante_id          text not null,
  nombre               text not null,
  detalle_variante     text not null default '',
  mayorista            text not null,
  fecha                date not null,
  paquetes             integer not null default 0,
  precio_paquete       numeric(12,2) not null default 0,
  unidades_por_paquete integer not null default 0,
  costo_total          numeric(12,2) not null default 0,
  unidades_total       integer not null default 0,
  costo_unitario       numeric(12,2) not null default 0,
  precio_venta         numeric(12,2),
  ganancia_unitaria    numeric(12,2),
  ganancia_total       numeric(12,2),
  estado               text not null default 'calculada',
  pago                 text not null default 'no-pagada',
  sumado_al_inventario boolean not null default false
);

-- ---------------------------------------------------------------------------
-- Indices: aceleran la sincronizacion (buscar por dueno y por fecha).
-- ---------------------------------------------------------------------------
create index if not exists products_user_updated        on public.products (user_id, updated_at);
create index if not exists product_variants_user_updated on public.product_variants (user_id, updated_at);
create index if not exists product_variants_product      on public.product_variants (product_id);
create index if not exists sales_user_updated            on public.sales (user_id, updated_at);
create index if not exists sale_items_sale               on public.sale_items (sale_id);
create index if not exists movements_user_updated        on public.inventory_movements (user_id, updated_at);
create index if not exists movements_variant             on public.inventory_movements (variant_id);
create index if not exists registers_user_updated        on public.cash_registers (user_id, updated_at);
create index if not exists closures_user_updated         on public.cash_closures (user_id, updated_at);
create index if not exists closures_register             on public.cash_closures (register_id);
create index if not exists compras_user_updated          on public.compras (user_id, updated_at);

-- Anti-duplicados: la misma venta no puede entrar dos veces.
create unique index if not exists sales_client_request_unique
  on public.sales (user_id, client_request_id)
  where client_request_id is not null;

-- ---------------------------------------------------------------------------
-- Seguridad (RLS): cada cuenta solo ve y toca sus propias filas.
-- El bloqueo visual del telefono NO sustituye esto: el servidor manda.
-- ---------------------------------------------------------------------------
alter table public.products            enable row level security;
alter table public.product_variants    enable row level security;
alter table public.sales               enable row level security;
alter table public.sale_items          enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.cash_registers      enable row level security;
alter table public.cash_closures       enable row level security;
alter table public.compras             enable row level security;

drop policy if exists "own rows" on public.products;
create policy "own rows" on public.products
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows" on public.product_variants;
create policy "own rows" on public.product_variants
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows" on public.sales;
create policy "own rows" on public.sales
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows" on public.sale_items;
create policy "own rows" on public.sale_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows" on public.inventory_movements;
create policy "own rows" on public.inventory_movements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows" on public.cash_registers;
create policy "own rows" on public.cash_registers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows" on public.cash_closures;
create policy "own rows" on public.cash_closures
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own rows" on public.compras;
create policy "own rows" on public.compras
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
