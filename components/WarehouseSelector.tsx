import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { useData } from '../context/DataContext';

/**
 * 仓库选择器组件
 * 显示在页面顶部，允许用户切换不同的仓库
 * 如果仓库功能未启用，显示提示信息
 */
export const WarehouseSelector: React.FC = () => {
    const navigate = useNavigate();
    const { warehouses, currentWarehouse, setCurrentWarehouseId, warehousesLoading, warehouseEnabled } = useData();
    const [isOpen, setIsOpen] = useState(false);

    // 加载中
    if (warehousesLoading) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 dark:bg-card-dark/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700">
                <div className="size-3 rounded-full bg-slate-300 dark:bg-slate-600 animate-pulse"></div>
                <span className="text-sm text-slate-400">加载中...</span>
            </div>
        );
    }

    // 仓库功能未启用（数据库未迁移）
    if (!warehouseEnabled) {
        return (
            <button
                onClick={() => navigate('/warehouses')}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            >
                <Icon name="warehouse" className="text-[18px]" />
                <span className="text-sm font-medium">启用多仓库</span>
            </button>
        );
    }

    // 没有当前仓库（异常状态）
    if (!currentWarehouse) {
        return (
            <button
                onClick={() => navigate('/warehouses')}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/90 dark:bg-card-dark/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all"
            >
                <Icon name="add" className="text-[18px] text-primary" />
                <span className="text-sm font-semibold text-slate-900 dark:text-white">创建仓库</span>
            </button>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/90 dark:bg-card-dark/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all active:scale-98"
            >
                <div
                    className="size-3 rounded-full shrink-0"
                    style={{ backgroundColor: currentWarehouse.color }}
                ></div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white max-w-[120px] truncate">
                    {currentWarehouse.name}
                </span>
                <Icon
                    name={isOpen ? "expand_less" : "expand_more"}
                    className="text-[18px] text-slate-400 shrink-0"
                />
            </button>

            {isOpen && (
                <>
                    {/* 背景遮罩 */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    ></div>

                    {/* 下拉菜单 */}
                    <div className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-[#2C2C2E] rounded-2xl shadow-floating ring-1 ring-black/5 dark:ring-white/10 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-left">
                        <div className="p-2 max-h-[300px] overflow-y-auto">
                            {warehouses.map(warehouse => (
                                <button
                                    key={warehouse.id}
                                    onClick={() => {
                                        setCurrentWarehouseId(warehouse.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${warehouse.id === currentWarehouse.id
                                        ? 'bg-primary/10 text-primary'
                                        : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200'
                                        }`}
                                >
                                    <div
                                        className={`size-3 rounded-full shrink-0 ${warehouse.id === currentWarehouse.id ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#2C2C2E]' : ''}`}
                                        style={{
                                            backgroundColor: warehouse.color,
                                            ...(warehouse.id === currentWarehouse.id ? { outlineColor: warehouse.color } : {})
                                        }}
                                    ></div>
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-semibold truncate">{warehouse.name}</p>
                                        {warehouse.description && (
                                            <p className="text-xs text-slate-400 truncate">{warehouse.description}</p>
                                        )}
                                    </div>
                                    {warehouse.is_default && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                                            默认
                                        </span>
                                    )}
                                    {warehouse.id === currentWarehouse.id && (
                                        <Icon name="check" className="text-primary text-[18px] shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="border-t border-slate-100 dark:border-slate-700 p-2">
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    navigate('/warehouses');
                                }}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-primary hover:bg-primary/5 transition-colors"
                            >
                                <Icon name="settings" className="text-[18px]" />
                                <span className="text-sm font-semibold">管理仓库</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
