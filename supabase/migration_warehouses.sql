-- ==========================================
-- HairStock 多仓库功能 - 数据库迁移
-- ==========================================
-- 此脚本添加仓库支持，需要在 Supabase SQL Editor 中执行

-- 1. 创建仓库表
-- ==========================================
create table if not exists public.warehouses (
    id uuid primary key default gen_random_uuid(),
    user_id text not null,
    name text not null,
    description text default '',
    color text default '#3B82F6',
    is_default boolean default false,
    created_at timestamptz default now()
);

-- 2. 添加仓库外键到产品表
-- ==========================================
alter table public.products 
add column if not exists warehouse_id uuid references public.warehouses(id) on delete cascade;

-- 3. 添加仓库外键到交易表
-- ==========================================
alter table public.transactions 
add column if not exists warehouse_id uuid references public.warehouses(id) on delete cascade;

-- 4. 创建索引
-- ==========================================
create index if not exists idx_warehouses_user_id on public.warehouses(user_id);
create index if not exists idx_products_warehouse_id on public.products(warehouse_id);
create index if not exists idx_transactions_warehouse_id on public.transactions(warehouse_id);

-- 5. 权限设置
-- ==========================================
alter table public.warehouses disable row level security;
grant all on public.warehouses to anon, authenticated;

-- 6. 为现有用户创建默认仓库并迁移数据
-- ==========================================
-- 注意：此步骤需要手动调整 user_id

-- 创建默认仓库（如果不存在）
insert into public.warehouses (user_id, name, description, color, is_default)
select distinct user_id, '默认仓库', '自动创建的默认仓库', '#3B82F6', true
from public.products
where user_id is not null
on conflict do nothing;

-- 将现有产品关联到默认仓库
update public.products p
set warehouse_id = (
    select w.id from public.warehouses w 
    where w.user_id = p.user_id and w.is_default = true
    limit 1
)
where p.warehouse_id is null;

-- 将现有交易关联到默认仓库
update public.transactions t
set warehouse_id = (
    select w.id from public.warehouses w 
    where w.user_id = t.user_id and w.is_default = true
    limit 1
)
where t.warehouse_id is null;

-- 完成提示
-- ==========================================
-- 迁移完成后，请验证：
-- 1. select count(*) from public.warehouses;  -- 应该有记录
-- 2. select count(*) from public.products where warehouse_id is not null;  -- 应该全部有值
-- 3. select count(*) from public.transactions where warehouse_id is not null;  -- 应该全部有值
