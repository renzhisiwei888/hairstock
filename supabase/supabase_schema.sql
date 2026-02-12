-- ==========================================
-- HairStock 数据库 Schema（简化版 - 共享访问）
-- ==========================================
-- 适用于个人使用或信任用户间共享
-- 不依赖 Supabase Auth，使用固定 user_id

-- 1. 产品表
-- ==========================================
create table if not exists public.products (
    id uuid primary key default gen_random_uuid(),
    user_id text not null default 'shared-user-hairstock',
    name text not null,
    brand text default '',
    variant text default '',
    quantity integer default 0 check (quantity >= 0),
    image_url text default '',
    low_stock_threshold integer default 5,
    notes text default '',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 2. 交易记录表
-- ==========================================
create table if not exists public.transactions (
    id uuid primary key default gen_random_uuid(),
    user_id text not null default 'shared-user-hairstock',
    product_id uuid references public.products on delete set null,
    product_name text not null,
    brand text default '',
    type text not null check (type in ('in', 'out')),
    amount integer not null check (amount > 0),
    notes text default '',
    created_at timestamptz default now()
);

-- 3. 创建索引以提高查询性能
-- ==========================================
create index if not exists idx_products_user_id on public.products(user_id);
create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_transactions_product_id on public.transactions(product_id);
create index if not exists idx_transactions_created_at on public.transactions(created_at desc);

-- 4. 禁用 RLS（允许所有访问）
-- ==========================================
-- 注意：这适用于个人/信任用户使用
-- 如需更严格的安全性，请启用 RLS 并配置策略

alter table public.products disable row level security;
alter table public.transactions disable row level security;

-- 5. 授予公开访问权限
-- ==========================================
grant all on public.products to anon, authenticated;
grant all on public.transactions to anon, authenticated;
grant usage on schema public to anon, authenticated;
