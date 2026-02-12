import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * 检查 Supabase 环境变量是否已配置
 * NOTE: 在开发环境中可能会使用占位符，生产环境必须配置真实值
 */
const isConfigured = (): boolean => {
    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('[Supabase] 缺少环境变量配置');
        return false;
    }
    // 检查是否为占位符值
    if (supabaseUrl.includes('your-project-id') || supabaseAnonKey.includes('your-anon-key')) {
        console.warn('[Supabase] 检测到占位符配置，请更新为真实的 Supabase 凭据');
        return false;
    }
    return true;
};

/**
 * Supabase 客户端实例
 * NOTE: 如果环境变量未配置，客户端仍会创建但操作会失败
 */
let supabase: SupabaseClient<Database>;

if (isConfigured()) {
    supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
            // 自动刷新 token
            autoRefreshToken: true,
            // 持久化登录状态到 localStorage
            persistSession: true,
            // 检测其他标签页的登录状态变化
            detectSessionInUrl: true,
        },
    });
} else {
    // 创建一个空壳客户端，所有操作会返回配置错误
    // 这样可以避免应用崩溃，同时提供有意义的错误信息
    console.error('[Supabase] 初始化失败：环境变量未正确配置');
    // 使用虚拟 URL 创建客户端（操作会失败但不会崩溃）
    supabase = createClient<Database>(
        'https://placeholder.supabase.co',
        'placeholder-key',
        { auth: { persistSession: false } }
    );
}

/**
 * 测试 Supabase 连接是否正常
 * @returns 连接状态和错误信息
 */
export const testConnection = async (): Promise<{ ok: boolean; error?: string }> => {
    if (!isConfigured()) {
        return { ok: false, error: '环境变量未配置' };
    }

    try {
        // 尝试查询 products 表来验证连接
        const { error } = await supabase
            .from('products')
            .select('id')
            .limit(1);

        if (error) {
            console.error('[Supabase] 连接测试失败:', error);
            return { ok: false, error: error.message };
        }

        console.log('[Supabase] 连接测试成功');
        return { ok: true };
    } catch (err) {
        const message = err instanceof Error ? err.message : '未知错误';
        console.error('[Supabase] 连接测试异常:', message);
        return { ok: false, error: message };
    }
};

/**
 * 检查 Supabase 是否已正确配置
 */
export const isSupabaseConfigured = isConfigured;

export { supabase };
