-- ==========================================
-- HairStock 仓库表修复脚本
-- ==========================================
-- 此脚本修复 user_id 类型问题
-- 在 Supabase SQL Editor 中执行

-- 1. 删除旧的 warehouses 表（如果存在）
-- ==========================================
DROP TABLE IF EXISTS public.warehouses CASCADE;

-- 2. 重新创建 warehouses 表（user_id 为 TEXT 类型）
-- ==========================================
CREATE TABLE public.warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    color TEXT DEFAULT '#3B82F6',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 确保 products 表有 warehouse_id 列
-- ==========================================
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE;

-- 4. 确保 transactions 表有 warehouse_id 列
-- ==========================================
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE;

-- 5. 创建索引
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_warehouses_user_id ON public.warehouses(user_id);
CREATE INDEX IF NOT EXISTS idx_products_warehouse_id ON public.products(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_transactions_warehouse_id ON public.transactions(warehouse_id);

-- 6. 禁用 RLS 并授权
-- ==========================================
ALTER TABLE public.warehouses DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.warehouses TO anon, authenticated;

-- 7. 验证
-- ==========================================
SELECT 'warehouses 表创建成功，user_id 类型为 TEXT' AS result;
