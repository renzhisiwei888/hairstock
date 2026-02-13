import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { WarehouseSelector } from '../components/WarehouseSelector';
import { useData } from '../context/DataContext';

type SortOption = 'default' | 'quantityAsc' | 'quantityDesc';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { products, productsLoading, totalIn, totalOut, transactions } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);

  // NOTE: 计算本月 vs 上月趋势百分比
  const { inTrend, outTrend } = useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    let thisMonthIn = 0, lastMonthIn = 0;
    let thisMonthOut = 0, lastMonthOut = 0;

    for (const t of transactions) {
      const date = new Date(t.created_at);
      if (date >= thisMonthStart) {
        if (t.type === 'in') thisMonthIn += t.amount;
        else thisMonthOut += t.amount;
      } else if (date >= lastMonthStart && date < thisMonthStart) {
        if (t.type === 'in') lastMonthIn += t.amount;
        else lastMonthOut += t.amount;
      }
    }

    const calcTrend = (current: number, previous: number): string | null => {
      if (previous === 0) return current > 0 ? '+' : null;
      const pct = Math.round(((current - previous) / previous) * 100);
      return `${pct > 0 ? '+' : ''}${pct}%`;
    };

    return {
      inTrend: calcTrend(thisMonthIn, lastMonthIn),
      outTrend: calcTrend(thisMonthOut, lastMonthOut),
    };
  }, [transactions]);

  const handleProductClick = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      navigate(`/adjust/${product.id}`, { state: { product } });
    }
  };

  const filteredAndSortedProducts = useMemo(() => {
    let result = products.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.variant.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortOption === 'quantityAsc') {
      result = [...result].sort((a, b) => a.quantity - b.quantity);
    } else if (sortOption === 'quantityDesc') {
      result = [...result].sort((a, b) => b.quantity - a.quantity);
    }

    return result;
  }, [products, searchQuery, sortOption]);

  const toggleSort = () => setIsSortMenuOpen(!isSortMenuOpen);

  const selectSort = (option: SortOption) => {
    setSortOption(option);
    setIsSortMenuOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen pb-24" onClick={() => setIsSortMenuOpen(false)}>
      <header className="flex flex-col gap-4 p-4 pt-12 pb-2 sticky top-0 z-20 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md">
        {/* 仓库选择器和设置 */}
        <div className="flex items-center justify-between">
          <WarehouseSelector />
          <Link to="/settings" className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
            <Icon name="settings" className="text-slate-400 dark:text-slate-500 text-[24px]" />
          </Link>
        </div>

        {/* 标题 */}
        <h1 className="text-3xl font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark">库存管理</h1>

        {/* 搜索框 */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon name="search" className="text-primary dark:text-primary-dark text-[22px]" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-[#1C1C1E] text-text-primary-light dark:text-text-primary-dark placeholder-text-secondary-light dark:placeholder-text-secondary-dark focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-[17px] leading-snug shadow-sm"
            placeholder="搜索产品、品牌..."
          />
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-6 px-4 pt-2 overflow-y-auto no-scrollbar">
        {/* 统计卡片 */}
        <section className="grid grid-cols-2 gap-3">
          <div className="bg-card-light dark:bg-card-dark p-4 rounded-xl shadow-ios flex flex-col justify-between h-[110px]">
            <div className="flex items-start justify-between">
              <span className="bg-primary/10 p-1.5 rounded-lg flex items-center justify-center">
                <Icon name="input" className="text-primary text-[20px]" />
              </span>
              {inTrend && (
                <div className={`flex items-center gap-1 ${inTrend.startsWith('-') ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'} px-2 py-0.5 rounded-full`}>
                  <Icon name={inTrend.startsWith('-') ? 'trending_down' : 'trending_up'} className={`${inTrend.startsWith('-') ? 'text-red-600 dark:text-red-400' : 'text-[#078838] dark:text-green-400'} text-[14px]`} />
                  <span className={`text-xs font-semibold ${inTrend.startsWith('-') ? 'text-red-600 dark:text-red-400' : 'text-[#078838] dark:text-green-400'}`}>{inTrend}</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-[13px] font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wide">入库总量</p>
              <p className="text-2xl font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark">{totalIn}</p>
            </div>
          </div>
          <div className="bg-card-light dark:bg-card-dark p-4 rounded-xl shadow-ios flex flex-col justify-between h-[110px]">
            <div className="flex items-start justify-between">
              <span className="bg-primary/10 p-1.5 rounded-lg flex items-center justify-center">
                <Icon name="exit_to_app" className="text-primary text-[20px]" />
              </span>
              {outTrend && (
                <div className={`flex items-center gap-1 ${outTrend.startsWith('-') ? 'bg-green-100 dark:bg-green-900/30' : 'bg-orange-100 dark:bg-orange-900/30'} px-2 py-0.5 rounded-full`}>
                  <Icon name={outTrend.startsWith('-') ? 'trending_down' : 'trending_up'} className={`${outTrend.startsWith('-') ? 'text-green-600 dark:text-green-400' : 'text-[#e73908] dark:text-orange-400'} text-[14px]`} />
                  <span className={`text-xs font-semibold ${outTrend.startsWith('-') ? 'text-green-600 dark:text-green-400' : 'text-[#e73908] dark:text-orange-400'}`}>{outTrend}</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-[13px] font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wide">消耗总量</p>
              <p className="text-2xl font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark">{totalOut}</p>
            </div>
          </div>
        </section>

        {/* 产品列表 */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1 relative">
            <h2 className="text-lg font-semibold text-text-primary-light dark:text-text-primary-dark">产品列表</h2>
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); toggleSort(); }}
                className="text-primary text-sm font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
              >
                <span>
                  {sortOption === 'default' && '默认排序'}
                  {sortOption === 'quantityAsc' && '库存: 低到高'}
                  {sortOption === 'quantityDesc' && '库存: 高到低'}
                </span>
                <Icon name="sort" className="text-[18px]" />
              </button>

              {isSortMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-[#2C2C2E] rounded-xl shadow-floating ring-1 ring-black/5 dark:ring-white/10 overflow-hidden z-30">
                  <div className="py-1">
                    <button
                      onClick={() => selectSort('default')}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-white/10 transition-colors ${sortOption === 'default' ? 'text-primary font-medium' : 'text-gray-700 dark:text-gray-200'}`}
                    >
                      默认排序
                    </button>
                    <button
                      onClick={() => selectSort('quantityAsc')}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-white/10 transition-colors ${sortOption === 'quantityAsc' ? 'text-primary font-medium' : 'text-gray-700 dark:text-gray-200'}`}
                    >
                      库存: 低到高
                    </button>
                    <button
                      onClick={() => selectSort('quantityDesc')}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-white/10 transition-colors ${sortOption === 'quantityDesc' ? 'text-primary font-medium' : 'text-gray-700 dark:text-gray-200'}`}
                    >
                      库存: 高到低
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 pb-8">
            {productsLoading ? (
              <div className="flex flex-col items-center justify-center py-10 text-text-secondary-light dark:text-text-secondary-dark">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                <p>加载中...</p>
              </div>
            ) : filteredAndSortedProducts.length > 0 ? (
              filteredAndSortedProducts.map((product) => {
                const isLowStock = product.quantity <= product.low_stock_threshold;
                return (
                  <div
                    key={product.id}
                    onClick={() => handleProductClick(product.id)}
                    className={`bg-card-light dark:bg-card-dark p-3 rounded-2xl shadow-ios flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform ${isLowStock ? 'ring-1 ring-orange-500/20' : ''}`}
                  >
                    <div className="shrink-0 relative">
                      <div
                        className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 bg-cover bg-center border border-gray-100 dark:border-gray-700"
                        style={{ backgroundImage: product.image_url ? `url('${product.image_url}')` : 'none' }}
                      >
                        {!product.image_url && (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Icon name="inventory_2" className="text-2xl" />
                          </div>
                        )}
                      </div>
                      {isLowStock && (
                        <div className="absolute -top-2 -left-2 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">LOW</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                      <h3 className="text-[16px] font-semibold text-text-primary-light dark:text-text-primary-dark truncate">{product.name}</h3>
                      <div className="flex items-center gap-1">
                        <p className="text-[14px] text-text-secondary-light dark:text-text-secondary-dark truncate">{product.variant || product.brand}</p>
                        {isLowStock && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-orange-500"></span>
                            <p className="text-[12px] font-medium text-orange-500">尽快补货</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-center bg-background-light dark:bg-[#2C2C2E] h-10 min-w-[3.5rem] px-2 rounded-xl">
                      <span className={`text-xl font-bold tabular-nums ${isLowStock ? 'text-orange-500' : 'text-text-primary-light dark:text-text-primary-dark'}`}>
                        {product.quantity}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-text-secondary-light dark:text-text-secondary-dark">
                <Icon name="search_off" className="text-[48px] opacity-20 mb-2" />
                <p>未找到相关产品</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
