import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useData } from '../context/DataContext';

interface ProductStat {
  id: string;
  name: string;
  brand: string;
  variant: string;
  consumed: number;
  inStock: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  turnoverRate: 'High' | 'Med' | 'Low';
}

export const ProductPerformance: React.FC = () => {
  const navigate = useNavigate();
  const { products, transactions, productsLoading } = useData();
  const [searchQuery, setSearchQuery] = useState('');

  /**
   * 计算每个产品的表现统计数据
   */
  const productStats: ProductStat[] = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // 上个月
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    return products.map(product => {
      // 计算本月消耗
      const thisMonthOut = transactions
        .filter(t =>
          t.product_id === product.id &&
          t.type === 'out' &&
          new Date(t.created_at).getMonth() === currentMonth &&
          new Date(t.created_at).getFullYear() === currentYear
        )
        .reduce((sum, t) => sum + t.amount, 0);

      // 计算上月消耗
      const lastMonthOut = transactions
        .filter(t =>
          t.product_id === product.id &&
          t.type === 'out' &&
          new Date(t.created_at).getMonth() === lastMonth &&
          new Date(t.created_at).getFullYear() === lastMonthYear
        )
        .reduce((sum, t) => sum + t.amount, 0);

      // 计算总消耗（所有时间）
      const totalConsumed = transactions
        .filter(t => t.product_id === product.id && t.type === 'out')
        .reduce((sum, t) => sum + t.amount, 0);

      // 计算趋势
      let trend: 'up' | 'down' | 'stable' = 'stable';
      let trendValue = 0;

      if (lastMonthOut > 0) {
        const change = ((thisMonthOut - lastMonthOut) / lastMonthOut) * 100;
        trendValue = Math.abs(Math.round(change));

        if (change > 5) {
          trend = 'up';
        } else if (change < -5) {
          trend = 'down';
        }
      } else if (thisMonthOut > 0) {
        trend = 'up';
        trendValue = 100;
      }

      // 计算周转率
      let turnoverRate: 'High' | 'Med' | 'Low' = 'Low';
      // NOTE: 根据最早消耗记录到现在的实际月数计算平均月消耗
      const outTransactions = transactions.filter(t => t.product_id === product.id && t.type === 'out');
      let actualMonths = 1;
      if (outTransactions.length > 0) {
        const earliest = new Date(outTransactions[outTransactions.length - 1].created_at);
        const diffMs = Date.now() - earliest.getTime();
        actualMonths = Math.max(1, diffMs / (1000 * 60 * 60 * 24 * 30));
      }
      const avgMonthlyConsumption = totalConsumed / actualMonths;

      if (product.quantity > 0) {
        const monthsOfStock = product.quantity / (avgMonthlyConsumption || 1);
        if (monthsOfStock < 2) {
          turnoverRate = 'High';
        } else if (monthsOfStock < 6) {
          turnoverRate = 'Med';
        }
      } else if (avgMonthlyConsumption > 10) {
        turnoverRate = 'High';
      }

      return {
        id: product.id,
        name: product.name,
        brand: product.brand || '',
        variant: product.variant || '',
        consumed: totalConsumed,
        inStock: product.quantity,
        trend,
        trendValue,
        turnoverRate
      };
    });
  }, [products, transactions]);

  // 按消耗量排序
  const sortedStats = useMemo(() => {
    return [...productStats]
      .sort((a, b) => b.consumed - a.consumed)
      .filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.variant.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [productStats, searchQuery]);

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      <header className="pt-8 pb-2 px-4 sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md z-10 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            <Icon name="arrow_back_ios_new" className="text-text-primary-light dark:text-text-primary-dark" />
          </button>
          <h1 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark">产品表现明细</h1>
        </div>

        <div className="relative mb-2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon name="search" className="text-slate-400 text-[20px]" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2.5 bg-white dark:bg-[#1C1C1E] border border-gray-200 dark:border-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-white"
            placeholder="搜索产品..."
          />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar p-4">
        <div className="flex flex-col gap-3">
          {/* Table Header (Visual) */}
          <div className="grid grid-cols-12 gap-2 px-3 pb-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            <div className="col-span-6">产品</div>
            <div className="col-span-3 text-center">消耗</div>
            <div className="col-span-3 text-right">库存</div>
          </div>

          {productsLoading ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4"></div>
              <p className="text-sm">加载中...</p>
            </div>
          ) : sortedStats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Icon name={searchQuery ? "search_off" : "inventory_2"} className="text-4xl mb-2 opacity-30" />
              <p className="text-sm">{searchQuery ? '未找到相关数据' : '暂无产品数据'}</p>
            </div>
          ) : (
            sortedStats.map((stat) => (
              <div key={stat.id} className="bg-white dark:bg-card-dark p-3.5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 grid grid-cols-12 gap-2 items-center active:bg-gray-50 dark:active:bg-gray-800 transition-colors">

                {/* Product Info */}
                <div className="col-span-6 min-w-0 pr-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {stat.brand ? `${stat.brand} ${stat.name}` : stat.name}
                  </p>
                  {stat.variant && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{stat.variant}</p>
                  )}
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${stat.turnoverRate === 'High' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      stat.turnoverRate === 'Med' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                      {stat.turnoverRate === 'High' ? '高周转' : stat.turnoverRate === 'Med' ? '一般' : '低周转'}
                    </span>
                  </div>
                </div>

                {/* Consumption Stats */}
                <div className="col-span-3 flex flex-col items-center justify-center border-l border-gray-100 dark:border-gray-800 pl-2">
                  <span className="text-base font-bold text-slate-900 dark:text-white">{stat.consumed}</span>
                  <div className="flex items-center gap-0.5">
                    {stat.trend === 'up' && <Icon name="trending_up" className="text-green-500 text-[12px]" />}
                    {stat.trend === 'down' && <Icon name="trending_down" className="text-red-500 text-[12px]" />}
                    {stat.trend === 'stable' && <Icon name="remove" className="text-gray-400 text-[12px]" />}
                    {stat.trend !== 'stable' && (
                      <span className={`text-[10px] font-medium ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                        {stat.trendValue}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Stock Level */}
                <div className="col-span-3 flex flex-col items-end justify-center pl-2">
                  <span className={`text-base font-bold ${stat.inStock < 5 ? 'text-orange-500' : 'text-slate-900 dark:text-white'}`}>
                    {stat.inStock}
                  </span>
                  <span className="text-[10px] text-slate-400">剩余</span>
                </div>

              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};
