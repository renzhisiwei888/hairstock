import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useData } from '../context/DataContext';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, Tooltip
} from 'recharts';

export const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const { products, transactions, totalStock, productsLoading, transactionsLoading } = useData();

  // Manage current month selection
  const [currentDate, setCurrentDate] = useState(new Date());

  // Default to the first product in the list, will update when products load
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Update selected product when products load
  useEffect(() => {
    if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  // Date Picker State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  // Sync picker year when modal opens
  useEffect(() => {
    if (isDatePickerOpen) {
      setPickerYear(currentDate.getFullYear());
    }
  }, [isDatePickerOpen, currentDate]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => {
      const now = new Date();
      if (prev.getMonth() === now.getMonth() && prev.getFullYear() === now.getFullYear()) {
        return prev;
      }
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(pickerYear, monthIndex, 1);
    const now = new Date();
    if (newDate > now) {
      return;
    }
    setCurrentDate(newDate);
    setIsDatePickerOpen(false);
  };

  const isCurrentMonth = new Date().getMonth() === currentDate.getMonth() &&
    new Date().getFullYear() === currentDate.getFullYear();

  /**
   * 计算消耗排行榜（基于真实交易数据）
   * 统计当月每个产品的 'out' 类型交易总量
   */
  const consumptionRanking = useMemo(() => {
    const consumption = new Map<string, {
      productId: string;
      name: string;
      brand: string;
      usage: number;
      imageUrl: string;
    }>();

    // 筛选当月的出库交易
    const monthTransactions = transactions.filter(t => {
      const tDate = new Date(t.created_at);
      return t.type === 'out' &&
        tDate.getMonth() === currentDate.getMonth() &&
        tDate.getFullYear() === currentDate.getFullYear();
    });

    monthTransactions.forEach(t => {
      const current = consumption.get(t.product_id) || {
        productId: t.product_id,
        name: t.product_name,
        brand: t.brand || '',
        usage: 0,
        imageUrl: ''
      };

      // 尝试从产品列表获取图片
      const product = products.find(p => p.id === t.product_id);

      consumption.set(t.product_id, {
        productId: t.product_id,
        name: t.product_name,
        brand: t.brand || '',
        usage: current.usage + t.amount,
        imageUrl: product?.image_url || ''
      });
    });

    const sorted = Array.from(consumption.values())
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 5);  // Top 5

    // 计算最大值用于百分比
    const maxUsage = sorted.length > 0 ? sorted[0].usage : 1;

    return sorted.map(item => ({
      ...item,
      percentage: Math.round((item.usage / maxUsage) * 100)
    }));
  }, [transactions, products, currentDate]);

  /**
   * 基于真实交易数据生成图表数据
   */
  const chartData = useMemo(() => {
    const data = [];

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date().getDate();

    // 筛选选中产品在当前月份的交易
    const productTransactions = transactions.filter(t =>
      t.product_id === selectedProductId &&
      new Date(t.created_at).getMonth() === month &&
      new Date(t.created_at).getFullYear() === year
    );

    // 按日期聚合
    const dailyData = new Map<number, { in: number; out: number }>();

    productTransactions.forEach(t => {
      const day = new Date(t.created_at).getDate();
      const current = dailyData.get(day) || { in: 0, out: 0 };

      if (t.type === 'in') {
        current.in += t.amount;
      } else {
        current.out += t.amount;
      }

      dailyData.set(day, current);
    });

    // 生成所有日期的数据
    for (let i = 1; i <= daysInMonth; i++) {
      const isFuture = isCurrentMonth && i > today;

      if (isFuture) {
        data.push({
          name: `${month + 1}/${i}`,
          in: null,
          out: null,
        });
      } else {
        const dayData = dailyData.get(i) || { in: 0, out: 0 };
        data.push({
          name: `${month + 1}/${i}`,
          in: dayData.in,
          out: dayData.out,
        });
      }
    }
    return data;
  }, [selectedProductId, currentDate, isCurrentMonth, transactions]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      if (payload[0].value == null && payload[1].value == null) return null;

      return (
        <div className="bg-white dark:bg-[#2C2C2E] p-3 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 text-xs z-50">
          <p className="font-bold text-gray-900 dark:text-white mb-1">{label}</p>
          {payload[0].value != null && (
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-gray-600 dark:text-gray-300">入库: {payload[0].value}</span>
            </div>
          )}
          {payload[1].value != null && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              <span className="text-gray-600 dark:text-gray-300">消耗: {payload[1].value}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // Generate years for the picker
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 4 + i);
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  const isLoading = productsLoading || transactionsLoading;

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-background-light dark:bg-background-dark">
      <header className="pt-8 pb-2 px-4 sticky top-0 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md z-10">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            <Icon name="arrow_back_ios_new" className="text-text-primary-light dark:text-text-primary-dark" />
          </button>
        </div>
        <h1 className="text-text-primary-light dark:text-text-primary-dark tracking-tight text-[34px] font-bold leading-tight text-left">数据分析</h1>
      </header>

      <main className="flex-1 px-4 py-2 space-y-6 overflow-y-auto no-scrollbar pb-10">

        {/* Month Selector */}
        <div className="flex items-center justify-between bg-white dark:bg-card-dark rounded-xl p-1.5 shadow-sm border border-gray-100 dark:border-gray-800 relative z-0">
          <button
            onClick={handlePrevMonth}
            className="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 active:bg-gray-200 dark:active:bg-white/10 transition-colors text-slate-600 dark:text-slate-300 z-10"
          >
            <Icon name="chevron_left" className="text-[20px]" />
          </button>

          <button
            onClick={() => setIsDatePickerOpen(true)}
            className="relative flex-1 flex items-center justify-center mx-1 h-12 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-1 z-10">
              <span className="text-sm font-bold text-slate-900 dark:text-white font-display">
                {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
              </span>
              <Icon name="arrow_drop_down" className="text-slate-400 text-[18px] group-hover:text-primary transition-colors" />
            </div>
          </button>

          <button
            onClick={handleNextMonth}
            disabled={isCurrentMonth}
            className={`p-3 rounded-lg transition-colors ${isCurrentMonth ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-white/5 active:bg-gray-200 dark:active:bg-white/10 cursor-pointer'} text-slate-600 dark:text-slate-300 z-10`}
          >
            <Icon name="chevron_right" className="text-[20px]" />
          </button>
        </div>

        {/* KPI Cards - 使用真实库存总数 */}
        <div className="grid grid-cols-1 gap-3">
          <div
            onClick={() => navigate('/analytics/products')}
            className="bg-card-light dark:bg-card-dark p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center text-center cursor-pointer active:scale-95 transition-transform"
          >
            <span className="p-2 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500 mb-2">
              <Icon name="inventory" className="text-[20px]" />
            </span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {isLoading ? '...' : totalStock.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">当前库存</span>
          </div>
        </div>

        {/* Main Chart: In vs Out */}
        <div className="bg-card-light dark:bg-card-dark rounded-[24px] p-5 shadow-sm border border-gray-200/50 dark:border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white whitespace-nowrap">库存变动</h3>
              <div className="relative">
                {products.length > 0 ? (
                  <>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="appearance-none bg-transparent text-xs font-bold text-primary border-none focus:ring-0 cursor-pointer pr-6 py-0 pl-1 max-w-[140px] truncate"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.brand ? `${p.brand} ${p.name}` : p.name}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-primary">
                      <Icon name="expand_more" className="text-[16px]" />
                    </div>
                  </>
                ) : (
                  <span className="text-xs text-slate-400">暂无产品</span>
                )}
              </div>
            </div>

            <div className="flex gap-3 text-[10px] font-medium shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                <span className="text-slate-500 dark:text-slate-400">入库</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                <span className="text-slate-500 dark:text-slate-400">消耗</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
            <div className="h-[220px] min-w-[700px]">
              {products.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <div className="text-center">
                    <Icon name="show_chart" className="text-4xl opacity-30 mb-2" />
                    <p className="text-sm">添加产品后查看库存变动</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      dy={10}
                      minTickGap={20}
                      interval="preserveStartEnd"
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '3 3' }} />
                    <Area type="natural" dataKey="in" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIn)" />
                    <Area type="natural" dataKey="out" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorOut)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className="text-center mt-[-5px]">
            <span className="text-[10px] text-slate-300 dark:text-slate-600">
              <Icon name="drag_handle" className="rotate-90 text-[14px]" />
            </span>
          </div>
        </div>

        {/* Ranking List - 使用真实消耗排行 */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-slate-900 dark:text-white text-lg font-bold">Top 消耗排行</h2>
            <button
              onClick={() => navigate('/analytics/products')}
              className="text-xs font-medium text-primary hover:opacity-80 transition-colors"
            >
              查看全部
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {consumptionRanking.length === 0 ? (
              <div className="bg-card-light dark:bg-card-dark p-6 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-800 text-center">
                <Icon name="trending_up" className="text-4xl text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-400">
                  {isLoading ? '加载中...' : '本月暂无消耗记录'}
                </p>
              </div>
            ) : (
              consumptionRanking.map((item, index) => (
                <div key={item.productId} className="flex items-center gap-4 bg-card-light dark:bg-card-dark p-3 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-800">
                  <div className="shrink-0">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-xl size-12 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-gray-700">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-slate-400">
                          {index + 1}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col flex-1 gap-1.5">
                    <div className="flex justify-between items-center">
                      <p className="text-slate-900 dark:text-white text-sm font-bold truncate pr-2">
                        {item.brand ? `${item.brand} ${item.name}` : item.name}
                      </p>
                      <span className="text-slate-900 dark:text-white text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{item.usage} 单位</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Date Picker Modal */}
      {isDatePickerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsDatePickerOpen(false)}
          ></div>

          {/* Bottom Sheet */}
          <div className="relative bg-white dark:bg-[#1C1C1E] rounded-t-3xl shadow-2xl p-6 animate-slide-up flex flex-col max-h-[70vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">选择日期</h3>
              <button
                onClick={() => setIsDatePickerOpen(false)}
                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Icon name="close" className="text-[24px]" />
              </button>
            </div>

            {/* Year Selector */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-2">
              {years.map(year => (
                <button
                  key={year}
                  onClick={() => setPickerYear(year)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${pickerYear === year
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                >
                  {year}年
                </button>
              ))}
            </div>

            {/* Month Grid */}
            <div className="grid grid-cols-3 gap-3">
              {months.map((month, index) => {
                const isSelected = pickerYear === currentDate.getFullYear() && index === currentDate.getMonth();
                const isFuture = pickerYear > new Date().getFullYear() || (pickerYear === new Date().getFullYear() && index > new Date().getMonth());

                return (
                  <button
                    key={month}
                    disabled={isFuture}
                    onClick={() => handleMonthSelect(index)}
                    className={`py-4 rounded-2xl text-sm font-semibold transition-all ${isSelected
                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                        : isFuture
                          ? 'bg-transparent text-slate-300 dark:text-slate-700 cursor-not-allowed'
                          : 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                  >
                    {month}
                  </button>
                );
              })}
            </div>

            {/* Safe Area Spacer for iOS Home Bar */}
            <div className="h-6"></div>
          </div>
        </div>
      )}
    </div>
  );
};