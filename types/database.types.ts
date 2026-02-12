/**
 * Supabase 数据库类型定义
 * 与数据库表结构一一对应
 */

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    name: string;
                    role: string;
                    avatar_url: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    name?: string;
                    role?: string;
                    avatar_url?: string | null;
                };
                Update: {
                    name?: string;
                    role?: string;
                    avatar_url?: string | null;
                    updated_at?: string;
                };
                Relationships: [];
            };
            warehouses: {
                Row: {
                    id: string;
                    user_id: string;
                    name: string;
                    description: string;
                    color: string;
                    is_default: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    name: string;
                    description?: string;
                    color?: string;
                    is_default?: boolean;
                };
                Update: {
                    name?: string;
                    description?: string;
                    color?: string;
                    is_default?: boolean;
                };
                Relationships: [];
            };
            products: {
                Row: {
                    id: string;
                    user_id: string;
                    warehouse_id: string;
                    name: string;
                    brand: string;
                    variant: string;
                    quantity: number;
                    image_url: string;
                    low_stock_threshold: number;
                    notes: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    warehouse_id?: string;
                    name: string;
                    brand?: string;
                    variant?: string;
                    quantity?: number;
                    image_url?: string;
                    low_stock_threshold?: number;
                    notes?: string;
                };
                Update: {
                    name?: string;
                    brand?: string;
                    variant?: string;
                    quantity?: number;
                    image_url?: string;
                    low_stock_threshold?: number;
                    notes?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            transactions: {
                Row: {
                    id: string;
                    user_id: string;
                    warehouse_id: string;
                    product_id: string;
                    product_name: string;
                    brand: string;
                    type: 'in' | 'out';
                    amount: number;
                    notes: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    warehouse_id?: string;
                    product_id: string;
                    product_name: string;
                    brand?: string;
                    type: 'in' | 'out';
                    amount: number;
                    notes?: string;
                };
                Update: {
                    notes?: string;
                };
                Relationships: [];
            };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: Record<string, never>;
        CompositeTypes: Record<string, never>;
    };
}

/**
 * 便捷类型别名
 */
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type Warehouse = Database['public']['Tables']['warehouses']['Row'];
export type WarehouseInsert = Database['public']['Tables']['warehouses']['Insert'];
export type WarehouseUpdate = Database['public']['Tables']['warehouses']['Update'];
export type Product = Database['public']['Tables']['products']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];

export type ProductInsert = Database['public']['Tables']['products']['Insert'];
export type ProductUpdate = Database['public']['Tables']['products']['Update'];
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
