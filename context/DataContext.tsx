import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { supabase, isSupabaseConfigured, testConnection } from '../lib/supabase';
import { useAuth } from './AuthContext';

/**
 * 仓库类型定义
 */
interface Warehouse {
    id: string;
    user_id: string;
    name: string;
    description: string;
    color: string;
    is_default: boolean;
    created_at: string;
}

interface WarehouseInsert {
    name: string;
    description?: string;
    color?: string;
    is_default?: boolean;
}

/**
 * 产品类型定义
 */
interface Product {
    id: string;
    user_id: string;
    warehouse_id?: string;
    name: string;
    brand: string;
    variant: string;
    quantity: number;
    image_url: string;
    low_stock_threshold: number;
    notes: string;
    created_at: string;
    updated_at: string;
}

/**
 * 交易类型定义
 */
interface Transaction {
    id: string;
    user_id: string;
    warehouse_id?: string;
    product_id: string;
    product_name: string;
    brand: string;
    type: 'in' | 'out';
    amount: number;
    notes: string;
    created_at: string;
}

interface ProductInsert {
    name: string;
    brand?: string;
    variant?: string;
    quantity?: number;
    image_url?: string;
    low_stock_threshold?: number;
    notes?: string;
    // NOTE: 支持滞后录入，前端传入 created_at 覆盖 DB DEFAULT now()
    created_at?: string;
}

interface TransactionInsert {
    product_id: string;
    product_name: string;
    brand?: string;
    type: 'in' | 'out';
    amount: number;
    notes?: string;
    // NOTE: 支持滞后录入，前端传入 created_at 覆盖 DB DEFAULT now()
    created_at?: string;
}

interface DataContextType {
    // 仓库（可选功能，数据库迁移后可用）
    warehouses: Warehouse[];
    warehousesLoading: boolean;
    warehouseEnabled: boolean;
    currentWarehouse: Warehouse | null;
    setCurrentWarehouseId: (id: string) => void;
    fetchWarehouses: () => Promise<void>;
    createWarehouse: (warehouse: WarehouseInsert) => Promise<{ data: Warehouse | null; error: string | null }>;
    updateWarehouse: (id: string, updates: Partial<WarehouseInsert>) => Promise<boolean>;
    deleteWarehouse: (id: string) => Promise<{ success: boolean; error: string | null }>;
    // 产品
    products: Product[];
    productsLoading: boolean;
    fetchProducts: () => Promise<void>;
    createProduct: (product: ProductInsert) => Promise<{ data: Product | null; error: string | null }>;
    updateProductQuantity: (productId: string, newQuantity: number) => Promise<boolean>;
    deleteProduct: (productId: string) => Promise<boolean>;
    // 交易（当前仓库）
    transactions: Transaction[];
    transactionsLoading: boolean;
    fetchTransactions: () => Promise<void>;
    createTransaction: (transaction: TransactionInsert) => Promise<Transaction | null>;
    deleteTransaction: (transactionId: string) => Promise<{ success: boolean; error: string | null }>;
    // NOTE: 全量交易（跨仓库，供月初数统计等全局分析使用）
    allTransactions: Transaction[];
    fetchAllTransactions: () => Promise<void>;
    // 统计
    totalIn: number;
    totalOut: number;
    totalStock: number;
    // 连接
    connectionStatus: 'unknown' | 'connected' | 'error';
    checkConnection: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// 本地存储 key
const CURRENT_WAREHOUSE_KEY = 'hairstock_current_warehouse';

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();

    // 仓库状态
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [warehousesLoading, setWarehousesLoading] = useState(false);
    const [warehouseEnabled, setWarehouseEnabled] = useState(false);
    const [currentWarehouseId, setCurrentWarehouseIdState] = useState<string>(() => {
        return localStorage.getItem(CURRENT_WAREHOUSE_KEY) || '';
    });
    // NOTE: 用 ref 持有当前仓库 ID，供 fetchWarehouses 内部读取，
    // 避免将其作为 useCallback 依赖导致循环重建
    const currentWarehouseIdRef = useRef(currentWarehouseId);
    currentWarehouseIdRef.current = currentWarehouseId;

    // 产品和交易状态
    const [products, setProducts] = useState<Product[]>([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [transactionsLoading, setTransactionsLoading] = useState(false);
    // NOTE: 全量交易记录，不受仓库筛选限制，供月初数等跨时间统计使用
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');

    // 当前仓库
    const currentWarehouse = warehouses.find(w => w.id === currentWarehouseId) || warehouses.find(w => w.is_default) || warehouses[0] || null;

    // 设置当前仓库并持久化
    const setCurrentWarehouseId = useCallback((id: string) => {
        setCurrentWarehouseIdState(id);
        localStorage.setItem(CURRENT_WAREHOUSE_KEY, id);
    }, []);

    /**
     * 检查 Supabase 连接状态
     */
    const checkConnection = useCallback(async () => {
        if (!isSupabaseConfigured()) {
            setConnectionStatus('error');
            console.error('[DataContext] Supabase 未配置');
            return;
        }

        const result = await testConnection();
        setConnectionStatus(result.ok ? 'connected' : 'error');
        if (!result.ok) {
            console.error('[DataContext] 连接失败:', result.error);
        }
    }, []);

    // ==========================================
    // 仓库操作（可选功能）
    // ==========================================

    /**
     * 加载仓库列表
     * 如果表不存在，则禁用仓库功能
     */
    const fetchWarehouses = useCallback(async () => {
        if (!user) {
            console.debug('[fetchWarehouses] 用户未登录，跳过');
            return;
        }

        console.debug('[fetchWarehouses] 开始加载仓库列表...');
        setWarehousesLoading(true);

        try {
            const { data, error } = await supabase
                .from('warehouses')
                .select('*')
                .eq('user_id', user.id)
                .order('is_default', { ascending: false })
                .order('created_at', { ascending: true });

            console.debug('[fetchWarehouses] 查询结果:', { data, error });

            if (error) {
                // 如果表不存在，禁用仓库功能
                if (error.code === '42P01' || error.message?.includes('does not exist')) {
                    console.warn('[fetchWarehouses] warehouses 表不存在，仓库功能已禁用');
                    setWarehouseEnabled(false);
                    setWarehouses([]);
                    return;
                }
                // 其他错误也记录详细信息
                console.error('[fetchWarehouses] 查询错误:', error.code, error.message);
                throw error;
            }

            console.debug('[fetchWarehouses] 仓库功能已启用');
            setWarehouseEnabled(true);
            const warehouseList = (data as Warehouse[]) || [];
            console.debug('[fetchWarehouses] 找到仓库数量:', warehouseList.length);
            setWarehouses(warehouseList);

            // 如果没有仓库，自动创建默认仓库
            if (warehouseList.length === 0) {
                console.debug('[fetchWarehouses] 没有仓库，创建默认仓库...');
                try {
                    const { data: newWarehouse, error: createError } = await supabase
                        .from('warehouses')
                        .insert({
                            user_id: user.id,
                            name: '默认仓库',
                            description: '自动创建的默认仓库',
                            color: '#3B82F6',
                            is_default: true
                        } as any)
                        .select()
                        .single();

                    console.debug('[fetchWarehouses] 创建默认仓库结果:', { newWarehouse, createError });

                    if (!createError && newWarehouse) {
                        setWarehouses([newWarehouse as Warehouse]);
                        setCurrentWarehouseId((newWarehouse as any).id);
                        console.debug('[fetchWarehouses] 默认仓库创建成功');
                    } else if (createError) {
                        console.error('[fetchWarehouses] 创建默认仓库失败:', createError.message);
                    }
                } catch (e) {
                    console.error('[fetchWarehouses] 创建默认仓库异常:', e);
                }
            } else if (!currentWarehouseIdRef.current || !warehouseList.find(w => w.id === currentWarehouseIdRef.current)) {
                // 设置默认仓库为当前仓库
                const defaultWarehouse = warehouseList.find(w => w.is_default) || warehouseList[0];
                if (defaultWarehouse) {
                    console.debug('[fetchWarehouses] 设置当前仓库:', defaultWarehouse.id);
                    setCurrentWarehouseId(defaultWarehouse.id);
                }
            }
        } catch (error) {
            console.error('[fetchWarehouses] 获取仓库列表失败:', error);
            setWarehouseEnabled(false);
            setWarehouses([]);
        } finally {
            setWarehousesLoading(false);
            console.debug('[fetchWarehouses] 加载完成');
        }
        // NOTE: 不依赖 currentWarehouseId，通过 ref 读取，避免 fetchWarehouses→setCurrentWarehouseId→重建→useEffect 循环
    }, [user, setCurrentWarehouseId]);

    /**
     * 创建仓库
     * 添加详细日志用于调试
     */
    const createWarehouse = async (warehouseData: WarehouseInsert): Promise<{ data: Warehouse | null; error: string | null }> => {
        console.log('[createWarehouse] 开始创建仓库:', warehouseData.name);

        if (!user) {
            console.error('[createWarehouse] 用户未登录');
            return { data: null, error: '请先登录' };
        }

        if (!isSupabaseConfigured()) {
            console.error('[createWarehouse] Supabase 未配置');
            return { data: null, error: 'Supabase 未正确配置，请检查环境变量' };
        }

        const insertPayload = {
            user_id: user.id,
            name: warehouseData.name,
            description: warehouseData.description || '',
            color: warehouseData.color || '#3B82F6',
            is_default: warehouseData.is_default || false
        };

        console.log('[createWarehouse] 插入数据:', JSON.stringify(insertPayload, null, 2));

        try {
            const { data, error } = await supabase
                .from('warehouses')
                .insert(insertPayload as any)
                .select()
                .single();

            console.log('[createWarehouse] Supabase 响应:', { data, error });

            if (error) {
                console.error('[createWarehouse] Supabase 错误:', error);

                // 表不存在
                if (error.code === '42P01' || error.message?.includes('does not exist')) {
                    return { data: null, error: '仓库表不存在，请在 Supabase SQL Editor 执行数据库迁移脚本' };
                }

                // RLS 权限问题
                if (error.code === '42501' || error.message?.includes('permission denied')) {
                    return { data: null, error: '权限不足，请检查 RLS 策略设置' };
                }

                // 其他错误
                return { data: null, error: error.message || `数据库错误 (${error.code})` };
            }

            if (!data) {
                console.error('[createWarehouse] 返回数据为空');
                return { data: null, error: '创建成功但未返回数据' };
            }

            const newWarehouse = data as Warehouse;
            console.log('[createWarehouse] 创建成功:', newWarehouse.id);

            setWarehouses(prev => [...prev, newWarehouse]);

            // 如果是第一个仓库，自动设为当前仓库并启用功能
            if (warehouses.length === 0) {
                setCurrentWarehouseId(newWarehouse.id);
                setWarehouseEnabled(true);
            }

            return { data: newWarehouse, error: null };
        } catch (err: unknown) {
            console.error('[createWarehouse] 异常:', err);

            // 处理各种错误类型
            let errorMessage = '网络错误，请检查网络连接';

            if (err instanceof Error) {
                errorMessage = err.message;
            } else if (typeof err === 'object' && err !== null) {
                // Supabase 错误对象
                const supaError = err as { message?: string; code?: string; details?: string };
                errorMessage = supaError.message || supaError.details || JSON.stringify(err);
            } else if (typeof err === 'string') {
                errorMessage = err;
            }

            return { data: null, error: errorMessage };
        }
    };

    /**
     * 更新仓库
     */
    const updateWarehouse = async (id: string, updates: Partial<WarehouseInsert>): Promise<boolean> => {
        if (!warehouseEnabled) return false;

        try {
            const { error } = await supabase
                .from('warehouses')
                .update(updates)
                .eq('id', id);

            if (error) throw error;

            setWarehouses(prev => prev.map(w =>
                w.id === id ? { ...w, ...updates } : w
            ));
            return true;
        } catch (error) {
            console.error('更新仓库失败:', error);
            return false;
        }
    };

    /**
     * 删除仓库
     */
    const deleteWarehouse = async (id: string): Promise<{ success: boolean; error: string | null }> => {
        if (!warehouseEnabled) {
            return { success: false, error: '仓库功能未启用' };
        }

        const warehouse = warehouses.find(w => w.id === id);
        if (!warehouse) {
            return { success: false, error: '仓库不存在' };
        }

        if (warehouse.is_default) {
            return { success: false, error: '无法删除默认仓库' };
        }

        if (warehouses.length <= 1) {
            return { success: false, error: '至少需要保留一个仓库' };
        }

        try {
            // NOTE: 级联删除 — 先删交易记录，再删产品，最后删仓库
            // 顺序不能颠倒，否则引用关系会导致孤儿数据
            const { error: txError } = await supabase
                .from('transactions')
                .delete()
                .eq('warehouse_id', id);

            if (txError) {
                console.error('删除仓库关联交易失败:', txError);
                throw txError;
            }

            const { error: prodError } = await supabase
                .from('products')
                .delete()
                .eq('warehouse_id', id);

            if (prodError) {
                console.error('删除仓库关联产品失败:', prodError);
                throw prodError;
            }

            const { error } = await supabase
                .from('warehouses')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // 同步更新本地状态
            setWarehouses(prev => prev.filter(w => w.id !== id));
            setProducts(prev => prev.filter(p => p.warehouse_id !== id));
            setTransactions(prev => prev.filter(t => t.warehouse_id !== id));
            // NOTE: 同步清理全量交易，避免月初数残留已删除仓库的数据
            setAllTransactions(prev => prev.filter(t => t.warehouse_id !== id));

            // 如果删除的是当前仓库，切换到默认仓库
            if (currentWarehouseId === id) {
                const defaultWarehouse = warehouses.find(w => w.is_default && w.id !== id);
                if (defaultWarehouse) {
                    setCurrentWarehouseId(defaultWarehouse.id);
                }
            }

            return { success: true, error: null };
        } catch (error) {
            console.error('删除仓库失败:', error);
            const message = error instanceof Error ? error.message : '删除失败';
            return { success: false, error: message };
        }
    };

    // ==========================================
    // 产品操作
    // ==========================================

    /**
     * 从 Supabase 加载产品
     * 如果仓库功能启用，按当前仓库筛选
     */
    const fetchProducts = useCallback(async () => {
        if (!user) return;

        setProductsLoading(true);
        try {
            let query = supabase
                .from('products')
                .select('*')
                .eq('user_id', user.id)
                .order('name', { ascending: true });

            // 如果仓库功能启用且有当前仓库，按仓库筛选
            if (warehouseEnabled && currentWarehouse) {
                query = query.eq('warehouse_id', currentWarehouse.id);
            }

            const { data, error } = await query;

            if (error) throw error;
            setProducts((data as Product[]) || []);
        } catch (error) {
            console.error('获取产品失败:', error);
            setProducts([]);
        } finally {
            setProductsLoading(false);
        }
    }, [user, warehouseEnabled, currentWarehouse]);

    /**
     * 创建产品
     */
    const createProduct = async (productData: ProductInsert): Promise<{ data: Product | null; error: string | null }> => {
        if (!user) {
            return { data: null, error: '请先登录' };
        }

        if (!isSupabaseConfigured()) {
            return { data: null, error: 'Supabase 未正确配置，请检查环境变量' };
        }

        try {
            const insertData: Record<string, unknown> = {
                user_id: user.id,
                name: productData.name,
                brand: productData.brand || '',
                variant: productData.variant || '',
                quantity: productData.quantity || 0,
                image_url: productData.image_url || '',
                low_stock_threshold: productData.low_stock_threshold || 5,
                notes: productData.notes || '',
                // NOTE: 支持滞后录入，前端传入则覆盖 DB DEFAULT now()
                ...(productData.created_at ? { created_at: productData.created_at } : {}),
            };

            // 如果仓库功能启用，添加 warehouse_id
            if (warehouseEnabled && currentWarehouse) {
                insertData.warehouse_id = currentWarehouse.id;
            }

            const { data, error } = await supabase
                .from('products')
                .insert(insertData as any)
                .select()
                .single();

            if (error) {
                console.error('[createProduct] Supabase 错误:', error);
                let errorMessage = '创建失败';
                if (error.code === '23505') {
                    errorMessage = '产品已存在';
                } else if (error.code === 'PGRST301') {
                    errorMessage = '数据库连接失败';
                } else if (error.message) {
                    errorMessage = error.message;
                }
                return { data: null, error: errorMessage };
            }

            const newProduct = data as Product;
            setProducts(prev => [...prev, newProduct]);

            // NOTE: 初始库存 > 0 时，自动创建入库交易记录
            // 确保月初库存反向推算有完整的交易历史可依赖
            const initialQty = productData.quantity || 0;
            if (initialQty > 0) {
                try {
                    const txInsert: Record<string, unknown> = {
                        user_id: user.id,
                        product_id: newProduct.id,
                        product_name: newProduct.name,
                        brand: newProduct.brand || '',
                        type: 'in',
                        amount: initialQty,
                        notes: '初始库存',
                        // NOTE: 初始库存交易的时间与产品创建时间保持一致
                        ...(productData.created_at ? { created_at: productData.created_at } : {}),
                    };
                    if (warehouseEnabled && currentWarehouse) {
                        txInsert.warehouse_id = currentWarehouse.id;
                    }
                    const { data: txData, error: txError } = await supabase
                        .from('transactions')
                        .insert(txInsert as any)
                        .select()
                        .single();

                    if (!txError && txData) {
                        const newTx = txData as Transaction;
                        setTransactions(prev => [newTx, ...prev]);
                        // NOTE: 同步全量交易，确保月初数等统计能立即反映新创建的初始库存
                        setAllTransactions(prev => [...prev, newTx]);
                    } else {
                        console.warn('[createProduct] 初始库存交易创建失败:', txError?.message);
                    }
                } catch (txErr) {
                    // 交易创建失败不影响产品创建结果
                    console.warn('[createProduct] 初始库存交易创建异常:', txErr);
                }
            }

            return { data: newProduct, error: null };
        } catch (err) {
            console.error('[createProduct] 异常:', err);
            const message = err instanceof Error ? err.message : '网络错误，请重试';
            return { data: null, error: message };
        }
    };

    /**
     * 更新产品库存
     */
    const updateProductQuantity = async (productId: string, newQuantity: number): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('products')
                .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
                .eq('id', productId);

            if (error) throw error;

            setProducts(prev => prev.map(p =>
                p.id === productId ? { ...p, quantity: newQuantity } : p
            ));
            return true;
        } catch (error) {
            console.error('更新库存失败:', error);
            return false;
        }
    };

    /**
     * 删除产品
     */
    const deleteProduct = async (productId: string): Promise<boolean> => {
        try {
            // NOTE: 先删除关联交易记录，再删除产品，避免产生孤儿交易
            const { error: txError } = await supabase
                .from('transactions')
                .delete()
                .eq('product_id', productId);

            if (txError) {
                console.error('删除产品关联交易失败:', txError);
                throw txError;
            }

            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productId);

            if (error) throw error;

            // 同步更新本地状态
            setProducts(prev => prev.filter(p => p.id !== productId));
            setTransactions(prev => prev.filter(t => t.product_id !== productId));
            // NOTE: 同步清理全量交易，避免月初数计算残留已删除产品
            setAllTransactions(prev => prev.filter(t => t.product_id !== productId));
            return true;
        } catch (error) {
            console.error('删除产品失败:', error);
            return false;
        }
    };

    // ==========================================
    // 交易操作
    // ==========================================

    /**
     * 从 Supabase 加载交易记录
     * 如果仓库功能启用，按当前仓库筛选
     */
    const fetchTransactions = useCallback(async () => {
        if (!user) return;

        setTransactionsLoading(true);
        try {
            let query = supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            // 如果仓库功能启用且有当前仓库，按仓库筛选
            if (warehouseEnabled && currentWarehouse) {
                query = query.eq('warehouse_id', currentWarehouse.id);
            }

            const { data, error } = await query;

            if (error) throw error;
            setTransactions((data as Transaction[]) || []);
        } catch (error) {
            console.error('获取交易记录失败:', error);
            setTransactions([]);
        } finally {
            setTransactionsLoading(false);
        }
    }, [user, warehouseEnabled, currentWarehouse]);

    /**
     * 加载全量交易记录（不受仓库筛选）
     * 用于月初数统计等需要完整历史数据的场景
     */
    const fetchAllTransactions = useCallback(async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('[fetchAllTransactions] 获取全量交易失败:', error);
                return;
            }
            setAllTransactions((data as Transaction[]) || []);
        } catch (error) {
            console.error('[fetchAllTransactions] 异常:', error);
        }
    }, [user]);

    /**
     * 创建交易记录
     */
    const createTransaction = async (transactionData: TransactionInsert): Promise<Transaction | null> => {
        if (!user) return null;

        try {
            const insertData: Record<string, unknown> = {
                user_id: user.id,
                product_id: transactionData.product_id,
                product_name: transactionData.product_name,
                brand: transactionData.brand || '',
                type: transactionData.type,
                amount: transactionData.amount,
                notes: transactionData.notes || '',
                // NOTE: 支持滞后录入，前端传入则覆盖 DB DEFAULT now()
                ...(transactionData.created_at ? { created_at: transactionData.created_at } : {}),
            };

            // 如果仓库功能启用，添加 warehouse_id
            if (warehouseEnabled && currentWarehouse) {
                insertData.warehouse_id = currentWarehouse.id;
            }

            const { data, error } = await supabase
                .from('transactions')
                .insert(insertData as any)
                .select()
                .single();

            if (error) throw error;

            const newTransaction = data as Transaction;
            setTransactions(prev => [newTransaction, ...prev]);
            // NOTE: 同步全量交易
            setAllTransactions(prev => [...prev, newTransaction]);
            return newTransaction;
        } catch (error) {
            console.error('创建交易记录失败:', error);
            return null;
        }
    };

    /**
     * 删除交易记录并恢复库存
     */
    const deleteTransaction = async (transactionId: string): Promise<{ success: boolean; error: string | null }> => {
        if (!user) {
            return { success: false, error: '请先登录' };
        }

        try {
            const transaction = transactions.find(t => t.id === transactionId);
            if (!transaction) {
                return { success: false, error: '交易记录不存在' };
            }

            const product = products.find(p => p.id === transaction.product_id);
            if (product) {
                const adjustment = transaction.type === 'in'
                    ? -transaction.amount
                    : transaction.amount;

                const newQuantity = Math.max(0, product.quantity + adjustment);

                const { error: updateError } = await supabase
                    .from('products')
                    .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
                    .eq('id', product.id);

                // NOTE: 库存恢复失败时中止操作，避免数据不一致
                if (updateError) {
                    console.error('恢复库存失败:', updateError);
                    return { success: false, error: '库存恢复失败，交易记录未删除。请重试。' };
                }

                setProducts(prev => prev.map(p =>
                    p.id === product.id ? { ...p, quantity: newQuantity } : p
                ));
            }

            const { error: deleteError } = await supabase
                .from('transactions')
                .delete()
                .eq('id', transactionId);

            if (deleteError) {
                // NOTE: 删除交易失败 → 回滚已修改的库存，避免数据不一致
                if (product) {
                    await supabase
                        .from('products')
                        .update({ quantity: product.quantity, updated_at: new Date().toISOString() })
                        .eq('id', product.id);
                    setProducts(prev => prev.map(p =>
                        p.id === product.id ? { ...p, quantity: product.quantity } : p
                    ));
                }
                return { success: false, error: '删除交易记录失败，库存已回滚' };
            }

            setTransactions(prev => prev.filter(t => t.id !== transactionId));
            // NOTE: 同步全量交易
            setAllTransactions(prev => prev.filter(t => t.id !== transactionId));
            return { success: true, error: null };
        } catch (error) {
            console.error('删除交易记录失败:', error);
            const message = error instanceof Error ? error.message : '删除失败';
            return { success: false, error: message };
        }
    };

    // 计算统计数据
    const totalIn = transactions
        .filter(t => t.type === 'in')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalOut = transactions
        .filter(t => t.type === 'out')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalStock = products.reduce((sum, p) => sum + p.quantity, 0);

    // 用户登录后自动加载数据
    useEffect(() => {
        if (user) {
            // 首先尝试加载仓库
            fetchWarehouses();
            // NOTE: 全量交易只需在登录时加载一次，不受仓库切换影响
            fetchAllTransactions();
        } else {
            setWarehouses([]);
            setProducts([]);
            setTransactions([]);
            setAllTransactions([]);
            setWarehouseEnabled(false);
        }
    }, [user, fetchWarehouses, fetchAllTransactions]);

    // 仓库加载完成后，或仓库变更后，加载产品和交易
    useEffect(() => {
        if (user && !warehousesLoading) {
            fetchProducts();
            fetchTransactions();
        }
    }, [user, warehousesLoading, currentWarehouse, fetchProducts, fetchTransactions]);

    return (
        <DataContext.Provider value={{
            // 仓库
            warehouses,
            warehousesLoading,
            warehouseEnabled,
            currentWarehouse,
            setCurrentWarehouseId,
            fetchWarehouses,
            createWarehouse,
            updateWarehouse,
            deleteWarehouse,
            // 产品
            products,
            productsLoading,
            fetchProducts,
            createProduct,
            updateProductQuantity,
            deleteProduct,
            // 交易（当前仓库）
            transactions,
            transactionsLoading,
            fetchTransactions,
            createTransaction,
            deleteTransaction,
            // 全量交易（跨仓库）
            allTransactions,
            fetchAllTransactions,
            // 统计
            totalIn,
            totalOut,
            totalStock,
            // 连接
            connectionStatus,
            checkConnection,
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
