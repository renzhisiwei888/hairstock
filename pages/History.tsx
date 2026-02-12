import React, { useState, useMemo } from 'react';
import { Icon } from '../components/Icon';
import { useData } from '../context/DataContext';

export const History: React.FC = () => {
  const { transactions, products, transactionsLoading, deleteTransaction } = useData();

  const [filterType, setFilterType] = useState<'all' | 'in' | 'out'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Tab 状态：交易记录 or 月初库存
  const [activeTab, setActiveTab] = useState<'transactions' | 'opening'>('transactions');
  // 月初库存的月份选择器
  const [openingMonth, setOpeningMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // 删除确认状态
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; type: string; amount: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 日期选择器状态
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [exportMode, setExportMode] = useState<'daily' | 'monthly'>('daily');

  /**
   * 格式化日期为分类标签（今天/昨天/具体日期）
   */
  const getDateCategory = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return '今天';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨天';
    } else {
      return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    }
  };

  /**
   * 格式化时间
   */
  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes <= 1 ? '刚刚' : `${diffMinutes}分钟前`;
    } else if (diffHours < 24) {
      return `${diffHours}小时前`;
    } else {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
  };

  const groupedHistory = useMemo(() => {
    // 1. 筛选
    const filtered = transactions.filter(item => {
      const matchesType = filterType === 'all' || item.type === filterType;
      const q = searchQuery.toLowerCase();
      const matchesSearch = item.product_name.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });

    // 2. 按日期分组
    const groups = new Map<string, typeof transactions>();

    filtered.forEach(item => {
      const dateCategory = getDateCategory(item.created_at);
      if (!groups.has(dateCategory)) {
        groups.set(dateCategory, []);
      }
      groups.get(dateCategory)?.push(item);
    });

    return Array.from(groups.entries());
  }, [transactions, filterType, searchQuery]);

  /**
   * 月初库存反向推算
   * NOTE: 根据当前库存和从选定月份到现在的交易记录反向计算
   */
  const openingStockData = useMemo(() => {
    const monthStart = openingMonth;

    return products.map(product => {
      let stockChange = 0;
      for (const t of transactions) {
        const tDate = new Date(t.created_at);
        if (t.product_id === product.id && tDate >= monthStart) {
          stockChange += t.type === 'in' ? t.amount : -t.amount;
        }
      }
      // 月初库存 = 当前库存 - 本月及以后的净变动
      const openingQty = Math.max(0, product.quantity - stockChange);
      return {
        id: product.id,
        name: product.name,
        brand: product.brand,
        variant: product.variant,
        currentQty: product.quantity,
        openingQty,
        change: stockChange,
      };
    });
  }, [products, transactions, openingMonth]);

  /**
   * 处理删除交易
   */
  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setIsDeleting(true);
    const result = await deleteTransaction(deleteConfirm.id);
    setIsDeleting(false);

    if (result.success) {
      setDeleteConfirm(null);
    } else {
      alert(`删除失败：${result.error}`);
    }
  };

  /**
   * 打开日期选择器
   */
  const openDatePicker = (mode: 'daily' | 'monthly') => {
    setExportMode(mode);
    setIsDatePickerOpen(true);
    setIsExportMenuOpen(false);
  };

  /**
   * 导出数据
   */
  const handleExport = () => {
    setIsDatePickerOpen(false);

    let dataToExport = transactions;
    let fileName = '';

    // 应用当前筛选
    if (filterType !== 'all') {
      dataToExport = dataToExport.filter(t => t.type === filterType);
    }

    if (exportMode === 'daily') {
      dataToExport = dataToExport.filter(t =>
        new Date(t.created_at).toDateString() === selectedDate.toDateString()
      );
      fileName = `hairstock_${filterType === 'all' ? '全部' : filterType === 'in' ? '入库' : '出库'}_${selectedDate.toISOString().split('T')[0]}.csv`;
    } else {
      const selectedMonth = selectedDate.getMonth();
      const selectedYear = selectedDate.getFullYear();
      dataToExport = dataToExport.filter(t => {
        const d = new Date(t.created_at);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      });
      const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
      fileName = `hairstock_${filterType === 'all' ? '全部' : filterType === 'in' ? '入库' : '出库'}_${monthStr}.csv`;
    }

    if (dataToExport.length === 0) {
      alert("所选时间段无数据可导出");
      return;
    }

    const headers = ['ID', '日期', '时间', '类型', '产品名称', '品牌', '数量', '备注'];
    const rows = dataToExport.map(item => {
      const date = new Date(item.created_at);
      return [
        item.id,
        date.toLocaleDateString('zh-CN'),
        date.toLocaleTimeString('zh-CN'),
        item.type === 'in' ? '入库' : '出库',
        `"${item.product_name}"`,
        `"${item.brand}"`,
        item.amount,
        `"${item.notes || ''}"`
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 生成日期选择器的日期
  const generateDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const days: (number | null)[] = [];
    // 填充月初空白
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // 填充日期
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-background-light dark:bg-background-dark" onClick={() => setIsExportMenuOpen(false)}>
      <header className="flex items-center justify-between px-6 pt-12 pb-4 bg-background-light dark:bg-background-dark sticky top-0 z-10">
        <h2 className="text-2xl font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark">交易日志</h2>

        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setIsExportMenuOpen(!isExportMenuOpen); }}
            className="flex items-center justify-center size-10 rounded-full bg-white dark:bg-card-dark shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors active:scale-95 text-primary"
          >
            <Icon name="ios_share" className="text-[20px]" />
          </button>

          {isExportMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-[#2C2C2E] rounded-xl shadow-floating ring-1 ring-black/5 dark:ring-white/10 overflow-hidden z-30 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
              <div className="py-1">
                <button
                  onClick={() => openDatePicker('daily')}
                  className="w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <Icon name="today" className="text-[18px] text-slate-400" />
                  <span>选择日期导出</span>
                </button>
                <div className="h-px bg-gray-100 dark:bg-gray-700 mx-3"></div>
                <button
                  onClick={() => openDatePicker('monthly')}
                  className="w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <Icon name="calendar_month" className="text-[18px] text-slate-400" />
                  <span>选择月份导出</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="px-6 pb-2 space-y-4">
        <div className="relative w-full group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <Icon name="search" className="text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full p-4 pl-12 text-sm text-slate-900 border border-transparent rounded-full bg-white dark:bg-card-dark dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-card-dark shadow-sm transition-all"
            placeholder="搜索产品、货号..."
          />
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setFilterType('all')}
            className={`flex shrink-0 items-center justify-center px-5 h-9 rounded-full text-sm font-medium shadow-sm transition-all active:scale-95 ${filterType === 'all'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
              : 'bg-white dark:bg-card-dark text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
          >
            全部
          </button>
          <button
            onClick={() => setFilterType('in')}
            className={`flex shrink-0 items-center justify-center px-5 h-9 rounded-full text-sm font-medium shadow-sm transition-all active:scale-95 ${filterType === 'in'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
              : 'bg-white dark:bg-card-dark text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
          >
            入库
          </button>
          <button
            onClick={() => setFilterType('out')}
            className={`flex shrink-0 items-center justify-center px-5 h-9 rounded-full text-sm font-medium shadow-sm transition-all active:scale-95 ${filterType === 'out'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md'
              : 'bg-white dark:bg-card-dark text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
          >
            出库
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'transactions'
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'bg-white dark:bg-card-dark text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
          >
            交易记录
          </button>
          <button
            onClick={() => setActiveTab('opening')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'opening'
              ? 'bg-primary text-white shadow-md shadow-primary/20'
              : 'bg-white dark:bg-card-dark text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
          >
            月初库存
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pt-2 space-y-6 no-scrollbar">
        {activeTab === 'transactions' ? (
          <>
            {transactionsLoading ? (
              <div className="flex flex-col items-center justify-center pt-20 text-slate-400">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-medium">加载中...</p>
              </div>
            ) : groupedHistory.length > 0 ? (
              groupedHistory.map(([date, items]) => (
                <div key={date}>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 ml-1">{date}</h3>
                  <div className="flex flex-col gap-3">
                    {items.map((item) => (
                      <div key={item.id} className="group flex flex-col p-4 bg-white dark:bg-card-dark rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className={`flex items-center justify-center size-12 rounded-full shrink-0 ${item.type === 'in' ? 'bg-success-bg dark:bg-emerald-900/30' : 'bg-danger-bg dark:bg-red-900/30'}`}>
                              <Icon name={item.type === 'in' ? 'arrow_upward' : 'arrow_downward'} className={item.type === 'in' ? 'text-success dark:text-emerald-400' : 'text-danger dark:text-red-400'} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <p className="text-slate-900 dark:text-white text-base font-semibold leading-tight truncate">{item.product_name}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-slate-500 dark:text-slate-400 text-xs font-medium truncate">{item.brand}</span>
                                <span className="size-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0"></span>
                                <span className="text-slate-400 text-xs shrink-0">{formatTime(item.created_at)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex flex-col items-end gap-1">
                              <p className={`text-lg font-bold leading-none ${item.type === 'in' ? 'text-success dark:text-emerald-400' : 'text-danger dark:text-red-400'}`}>
                                {item.type === 'in' ? '+' : '-'}{item.amount}
                              </p>
                              <p className="text-xs text-slate-400">{item.type === 'in' ? '补货' : '使用'}</p>
                            </div>
                            {/* 删除按钮 - 移动端始终可见 */}
                            <button
                              onClick={() => setDeleteConfirm({ id: item.id, name: item.product_name, type: item.type, amount: item.amount })}
                              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-all"
                              title="删除此记录"
                            >
                              <Icon name="delete_outline" className="text-[18px]" />
                            </button>
                          </div>
                        </div>
                        {item.notes && (
                          <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-800 flex items-start gap-2">
                            <Icon name="sticky_note_2" className="text-slate-400 text-[16px] mt-0.5" />
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{item.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center pt-20 text-slate-400">
                <Icon name="history_toggle_off" className="text-6xl mb-4 opacity-50" />
                <p className="text-sm font-medium">没有找到相关记录</p>
              </div>
            )}
          </>
        ) : (
          /* 月初库存视图 */
          <div className="space-y-4">
            {/* 月份选择器 */}
            <div className="flex items-center justify-between bg-white dark:bg-card-dark rounded-xl p-3 shadow-sm border border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setOpeningMonth(new Date(openingMonth.getFullYear(), openingMonth.getMonth() - 1, 1))}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Icon name="chevron_left" className="text-[20px] text-slate-600 dark:text-slate-300" />
              </button>
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {openingMonth.getFullYear()}年 {openingMonth.getMonth() + 1}月初
              </span>
              <button
                onClick={() => {
                  const next = new Date(openingMonth.getFullYear(), openingMonth.getMonth() + 1, 1);
                  if (next <= new Date()) setOpeningMonth(next);
                }}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Icon name="chevron_right" className="text-[20px] text-slate-600 dark:text-slate-300" />
              </button>
            </div>

            {/* 总览 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-card-dark rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 text-center">
                <p className="text-xs text-slate-400 mb-1">月初总库存</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{openingStockData.reduce((s, p) => s + p.openingQty, 0)}</p>
              </div>
              <div className="bg-white dark:bg-card-dark rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 text-center">
                <p className="text-xs text-slate-400 mb-1">当前总库存</p>
                <p className="text-2xl font-bold text-primary">{openingStockData.reduce((s, p) => s + p.currentQty, 0)}</p>
              </div>
            </div>

            {/* 产品列表 */}
            {openingStockData.length > 0 ? (
              <div className="flex flex-col gap-3">
                {openingStockData.map(item => (
                  <div key={item.id} className="bg-white dark:bg-card-dark rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col min-w-0 flex-1">
                        <p className="text-slate-900 dark:text-white text-sm font-semibold truncate">{item.name}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{item.brand} {item.variant}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-center">
                          <p className="text-xs text-slate-400">月初</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white">{item.openingQty}</p>
                        </div>
                        <Icon name="arrow_forward" className="text-slate-300 text-[16px]" />
                        <div className="text-center">
                          <p className="text-xs text-slate-400">现在</p>
                          <p className="text-lg font-bold text-primary">{item.currentQty}</p>
                        </div>
                        <div className={`text-center px-2 py-1 rounded-lg ${item.change > 0 ? 'bg-green-50 dark:bg-green-900/20' : item.change < 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-800'}`}>
                          <p className={`text-xs font-bold ${item.change > 0 ? 'text-green-600 dark:text-green-400' : item.change < 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-400'}`}>
                            {item.change > 0 ? '+' : ''}{item.change}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center pt-20 text-slate-400">
                <Icon name="inventory_2" className="text-6xl mb-4 opacity-50" />
                <p className="text-sm font-medium">暂无产品数据</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <Icon name="delete" className="text-red-600 dark:text-red-400 text-[24px]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">确认删除?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                删除「{deleteConfirm.name}」的{deleteConfirm.type === 'in' ? '入库' : '出库'}记录 ({deleteConfirm.type === 'in' ? '+' : '-'}{deleteConfirm.amount})？
              </p>
              <p className="text-xs text-orange-500 mt-2">
                库存将自动 {deleteConfirm.type === 'in' ? '减少' : '增加'} {deleteConfirm.amount}
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

      {/* 日期选择器弹窗 */}
      {isDatePickerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsDatePickerOpen(false)}
          ></div>

          <div className="relative bg-white dark:bg-[#1C1C1E] rounded-t-3xl shadow-2xl p-6 animate-slide-up flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {exportMode === 'daily' ? '选择日期' : '选择月份'}
              </h3>
              <button
                onClick={() => setIsDatePickerOpen(false)}
                className="p-2 -mr-2 text-slate-400 hover:text-slate-600"
              >
                <Icon name="close" className="text-[24px]" />
              </button>
            </div>

            {/* 月份导航 */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <Icon name="chevron_left" className="text-[20px] text-slate-600 dark:text-slate-300" />
              </button>
              <span className="text-base font-bold text-slate-900 dark:text-white">
                {selectedDate.getFullYear()}年 {selectedDate.getMonth() + 1}月
              </span>
              <button
                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <Icon name="chevron_right" className="text-[20px] text-slate-600 dark:text-slate-300" />
              </button>
            </div>

            {exportMode === 'daily' ? (
              <>
                {/* 星期标题 */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-slate-400 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* 日期网格 */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {generateDays().map((day, index) => (
                    <button
                      key={index}
                      disabled={day === null}
                      onClick={() => day && setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day))}
                      className={`py-3 rounded-xl text-sm font-medium transition-all ${day === null
                        ? 'invisible'
                        : day === selectedDate.getDate()
                          ? 'bg-primary text-white shadow-lg shadow-primary/30'
                          : 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              /* 月份网格 */
              <div className="grid grid-cols-3 gap-3 mb-4">
                {months.map((month, index) => (
                  <button
                    key={month}
                    onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), index, 1))}
                    className={`py-4 rounded-2xl text-sm font-semibold transition-all ${index === selectedDate.getMonth()
                      ? 'bg-primary text-white shadow-lg shadow-primary/30'
                      : 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                  >
                    {month}
                  </button>
                ))}
              </div>
            )}

            {/* 当前筛选提示 */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 mb-4 text-center">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                将导出 <span className="font-bold text-slate-900 dark:text-white">
                  {filterType === 'all' ? '全部' : filterType === 'in' ? '入库' : '出库'}
                </span> 记录
              </span>
            </div>

            {/* 导出按钮 */}
            <button
              onClick={handleExport}
              className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base shadow-lg shadow-primary/30 hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="download" className="text-[20px]" />
              导出 {exportMode === 'daily'
                ? selectedDate.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
                : selectedDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
              } 数据
            </button>

            <div className="h-6"></div>
          </div>
        </div>
      )}
    </div>
  );
};