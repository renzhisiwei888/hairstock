import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useData } from '../context/DataContext';

// 预设颜色选项
const colorOptions = [
    '#3B82F6', // 蓝色
    '#10B981', // 绿色
    '#F59E0B', // 橙色
    '#EF4444', // 红色
    '#8B5CF6', // 紫色
    '#EC4899', // 粉色
    '#06B6D4', // 青色
    '#6B7280', // 灰色
];

export const WarehouseManage: React.FC = () => {
    const navigate = useNavigate();
    const {
        warehouses,
        warehousesLoading,
        createWarehouse,
        updateWarehouse,
        deleteWarehouse,
        currentWarehouse,
        fetchWarehouses
    } = useData();

    // 页面加载时刷新仓库数据
    useEffect(() => {
        fetchWarehouses();
    }, [fetchWarehouses]);

    // 编辑/新建模态框状态
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState<{ id: string; name: string; description: string; color: string } | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '', color: '#3B82F6' });
    const [isSaving, setIsSaving] = useState(false);

    // 删除确认状态
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    /**
     * 打开新建模态框
     */
    const openCreateModal = () => {
        setEditingWarehouse(null);
        setFormData({ name: '', description: '', color: '#3B82F6' });
        setIsModalOpen(true);
    };

    /**
     * 打开编辑模态框
     */
    const openEditModal = (warehouse: typeof warehouses[0]) => {
        setEditingWarehouse({
            id: warehouse.id,
            name: warehouse.name,
            description: warehouse.description,
            color: warehouse.color
        });
        setFormData({
            name: warehouse.name,
            description: warehouse.description,
            color: warehouse.color
        });
        setIsModalOpen(true);
    };

    /**
     * 保存仓库
     */
    const handleSave = async () => {
        if (!formData.name.trim()) {
            alert('请输入仓库名称');
            return;
        }

        setIsSaving(true);

        if (editingWarehouse) {
            // 编辑模式
            const success = await updateWarehouse(editingWarehouse.id, {
                name: formData.name.trim(),
                description: formData.description.trim(),
                color: formData.color
            });
            if (success) {
                setIsModalOpen(false);
            } else {
                alert('更新失败，请重试');
            }
        } else {
            // 新建模式
            const result = await createWarehouse({
                name: formData.name.trim(),
                description: formData.description.trim(),
                color: formData.color
            });
            if (result.data) {
                setIsModalOpen(false);
            } else {
                alert(`创建失败：${result.error}`);
            }
        }

        setIsSaving(false);
    };

    /**
     * 删除仓库
     */
    const handleDelete = async () => {
        if (!deleteConfirm) return;

        setIsDeleting(true);
        const result = await deleteWarehouse(deleteConfirm.id);
        setIsDeleting(false);

        if (result.success) {
            setDeleteConfirm(null);
        } else {
            alert(`删除失败：${result.error}`);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
            <header className="pt-8 pb-4 px-4 sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md z-10 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    >
                        <Icon name="arrow_back_ios_new" className="text-text-primary-light dark:text-text-primary-dark" />
                    </button>
                    <h1 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">仓库管理</h1>
                </div>
            </header>

            <main className="flex-1 p-4 space-y-4">
                {warehousesLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4"></div>
                        <p className="text-sm">加载中...</p>
                    </div>
                ) : (
                    <>
                        {/* 仓库列表 */}
                        <div className="space-y-3">
                            {warehouses.map(warehouse => (
                                <div
                                    key={warehouse.id}
                                    className={`flex items-center gap-4 p-4 bg-white dark:bg-card-dark rounded-2xl shadow-sm border transition-all ${warehouse.id === currentWarehouse?.id
                                        ? 'border-primary ring-2 ring-primary/20'
                                        : 'border-slate-100 dark:border-slate-800'
                                        }`}
                                >
                                    <div
                                        className="size-10 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: warehouse.color + '20' }}
                                    >
                                        <Icon
                                            name="warehouse"
                                            className="text-[20px]"
                                            style={{ color: warehouse.color }}
                                        />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-base font-semibold text-slate-900 dark:text-white truncate">
                                                {warehouse.name}
                                            </p>
                                            {warehouse.is_default && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium shrink-0">
                                                    默认
                                                </span>
                                            )}
                                            {warehouse.id === currentWarehouse?.id && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-medium shrink-0">
                                                    当前
                                                </span>
                                            )}
                                        </div>
                                        {warehouse.description && (
                                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                {warehouse.description}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={() => openEditModal(warehouse)}
                                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                                        >
                                            <Icon name="edit" className="text-[18px]" />
                                        </button>
                                        {!warehouse.is_default && (
                                            <button
                                                onClick={() => setDeleteConfirm({ id: warehouse.id, name: warehouse.name })}
                                                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <Icon name="delete" className="text-[18px]" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 新建按钮 */}
                        <button
                            onClick={openCreateModal}
                            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                        >
                            <Icon name="add" className="text-[24px]" />
                            <span className="font-semibold">新建仓库</span>
                        </button>
                    </>
                )}
            </main>

            {/* 新建/编辑模态框 */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                            {editingWarehouse ? '编辑仓库' : '新建仓库'}
                        </h3>

                        <div className="space-y-4">
                            {/* 名称 */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    仓库名称 *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="例如：分店A库存"
                                />
                            </div>

                            {/* 描述 */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    描述（可选）
                                </label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="简短描述"
                                />
                            </div>

                            {/* 颜色选择 */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    标识颜色
                                </label>
                                <div className="flex gap-2 flex-wrap">
                                    {colorOptions.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setFormData(prev => ({ ...prev, color }))}
                                            className={`size-10 rounded-xl transition-all ${formData.color === color
                                                ? 'ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110'
                                                : 'hover:scale-105'
                                                }`}
                                            style={{ backgroundColor: color }}
                                        >
                                            {formData.color === color && (
                                                <Icon name="check" className="text-white text-[18px]" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                disabled={isSaving}
                                className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !formData.name.trim()}
                                className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold shadow-lg shadow-primary/30 hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        保存中
                                    </>
                                ) : (
                                    '保存'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 删除确认对话框 */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-2xl">
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                                <Icon name="delete" className="text-red-600 dark:text-red-400 text-[24px]" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">删除仓库?</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                                确定删除「{deleteConfirm.name}」吗？
                            </p>
                            <p className="text-xs text-red-500 mt-2">
                                ⚠️ 该仓库下的所有产品和交易记录将被永久删除
                            </p>
                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold shadow-lg shadow-red-500/30 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            删除中
                                        </>
                                    ) : (
                                        '确认删除'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
