import React, { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useData } from '../context/DataContext';
import type { Product } from '../types/database.types';

export const StockAdjustment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: productId } = useParams<{ id: string }>();
  const { products, productsLoading, updateProductQuantity, createTransaction, deleteProduct } = useData();

  // NOTE: 优先从 products 列表实时查找（避免过时数据），回退到 location.state
  const stateProduct = location.state?.product as Product | undefined;
  const product = products.find(p => p.id === (productId || stateProduct?.id)) || stateProduct;

  const [inputVal, setInputVal] = useState<string>('0');
  const [operation, setOperation] = useState<'add' | 'subtract'>('add');
  const [notes, setNotes] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // NOTE: 支持滞后录入，默认当前时间
  const [customDate, setCustomDate] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  // 产品详情卡片展开/收起
  const [showDetail, setShowDetail] = useState(false);

  // 加载中
  if (productsLoading && !product) {
    return (
      <div className="p-4 min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-4 min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="text-center">
          <Icon name="error" className="text-4xl text-slate-400 mb-2" />
          <p className="text-slate-600 dark:text-slate-400">产品未找到</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-full"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const currentStock = product.quantity;
  const adjustAmount = parseInt(inputVal) || 0;

  const finalStock = operation === 'add'
    ? currentStock + adjustAmount
    : Math.max(0, currentStock - adjustAmount);

  const handleNumClick = (num: string) => {
    if (inputVal === '0') {
      setInputVal(num);
    } else {
      if (inputVal.length < 5) {
        setInputVal(inputVal + num);
      }
    }
  };

  const handleBackspace = () => {
    if (inputVal.length > 1) {
      setInputVal(inputVal.slice(0, -1));
    } else {
      setInputVal('0');
    }
  };

  const handleClear = () => {
    setInputVal('0');
  };

  const handleUpdateClick = () => {
    if (adjustAmount === 0) return;
    setShowConfirmation(true);
  };

  /**
   * 确认删除产品
   */
  const handleDeleteProduct = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const success = await deleteProduct(product.id);
      if (success) {
        navigate('/', { replace: true });
      } else {
        alert('删除失败，请重试');
      }
    } catch {
      alert('删除失败，请重试');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * 确认库存调整
   */
  const handleConfirmAction = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      // NOTE: 出库时实际扣减量 = min(输入量, 当前库存)
      // 避免超量出库破坏 baseStock 算法不变量 (current_qty = baseStock + txNetTotal)
      const actualAmount = operation === 'subtract'
        ? Math.min(adjustAmount, currentStock)
        : adjustAmount;

      // 1. 更新产品库存
      const updateSuccess = await updateProductQuantity(product.id, finalStock);
      if (!updateSuccess) {
        throw new Error('更新库存失败');
      }

      // 2. 创建交易记录
      const newTx = await createTransaction({
        product_id: product.id,
        product_name: product.name,
        brand: product.brand,
        type: operation === 'add' ? 'in' : 'out',
        amount: actualAmount,
        notes: notes.trim(),
        // NOTE: 支持滞后录入
        created_at: new Date(customDate).toISOString(),
      });

      // NOTE: 交易创建失败时回滚库存，保证数据一致性
      if (!newTx) {
        await updateProductQuantity(product.id, currentStock);
        throw new Error('交易记录创建失败，库存已回滚');
      }

      setShowConfirmation(false);
      navigate(-1);
    } catch (error) {
      console.error('库存调整失败:', error);
      alert(error instanceof Error ? error.message : '操作失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative mx-auto h-screen w-full max-w-md overflow-hidden bg-background-light dark:bg-background-dark shadow-2xl flex flex-col">
      <div className="bg-background-light dark:bg-background-dark z-10 shrink-0">
        <div className="pt-2 pb-1 w-full flex justify-center cursor-pointer" onClick={() => navigate(-1)}>
          <div className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-600"></div>
        </div>

        <div className="relative flex items-center justify-center px-4 py-2">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-4 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-slate-900 dark:text-white z-20"
          >
            <Icon name="arrow_back" className="text-2xl" />
          </button>

          <div className="text-center w-full px-12">
            <h1 className="text-slate-900 dark:text-white text-lg font-semibold tracking-tight">库存调整</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium truncate">{product.name} {product.variant}</p>
          </div>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="absolute right-4 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-slate-400 hover:text-red-500 z-20"
          >
            <Icon name="delete" className="text-xl" />
          </button>
        </div>
      </div>

      {/* 产品详情卡片 */}
      <div className="px-4 pt-1 shrink-0">
        <button
          onClick={() => setShowDetail(!showDetail)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-white dark:bg-card-dark rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 text-sm"
        >
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Icon name="info" className="text-[18px] text-primary" />
            <span className="font-medium">产品详情</span>
          </div>
          <Icon name={showDetail ? 'expand_less' : 'expand_more'} className="text-slate-400 text-[20px]" />
        </button>
        {showDetail && (
          <div className="mt-2 bg-white dark:bg-card-dark rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-4 space-y-2.5 animate-fade-in">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">品牌</span>
              <span className="font-medium text-slate-900 dark:text-white">{product.brand || '未设置'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">规格</span>
              <span className="font-medium text-slate-900 dark:text-white">{product.variant || '未设置'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">备注</span>
              <span className="font-medium text-slate-900 dark:text-white truncate max-w-[60%] text-right">{product.notes || '无'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">创建时间</span>
              <span className="font-medium text-slate-900 dark:text-white">{new Date(product.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">低库存阈值</span>
              <span className="font-medium text-slate-900 dark:text-white">{product.low_stock_threshold}</span>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 shrink-0">
        <div className="bg-white dark:bg-card-dark rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center space-y-4">
          <div className="flex w-full justify-between px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>当前</span>
            <span>调整</span>
            <span>新总量</span>
          </div>
          <div className="flex w-full items-center justify-between">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-slate-400 dark:text-slate-500">{currentStock}</span>
            </div>

            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${operation === 'add' ? 'bg-calculator-orange/10 text-calculator-orange' : 'bg-calculator-orange/10 text-calculator-orange'}`}>
              <Icon name={operation === 'add' ? "add" : "remove"} className="text-xl font-bold" />
            </div>

            <div className="flex flex-col items-center relative group">
              <span className="text-5xl font-bold text-slate-900 dark:text-white transition-all">{adjustAmount}</span>
              <div className="absolute -bottom-2 h-1 w-full rounded-full bg-calculator-orange opacity-100 animate-pulse"></div>
            </div>

            <span className="text-2xl font-medium text-slate-300 dark:text-slate-600">=</span>

            <div className="flex flex-col items-center">
              <span className="text-5xl font-bold text-primary dark:text-blue-400 transition-all">{finalStock}</span>
            </div>
          </div>

          <div className="w-full pt-1">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon name="edit_note" className="text-slate-400 group-focus-within:text-primary transition-colors text-[20px]" />
              </div>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white dark:focus:bg-slate-800 transition-all"
                placeholder="添加备注 (可选)..."
              />
            </div>
            {/* 时间选择器 */}
            <div className="relative mt-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon name="schedule" className="text-slate-400 group-focus-within:text-primary transition-colors text-[20px]" />
              </div>
              <input
                type="datetime-local"
                value={customDate}
                max={(() => { const n = new Date(); n.setMinutes(n.getMinutes() - n.getTimezoneOffset()); return n.toISOString().slice(0, 16); })()}
                onChange={(e) => setCustomDate(e.target.value)}
                className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1 ml-1">滞后录入时请选择实际日期</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-end px-4 pb-6 pt-1">
        <div className="grid grid-cols-4 gap-3 w-full max-w-[360px] mx-auto">
          {['7', '8', '9'].map(num => (
            <button key={num} onClick={() => handleNumClick(num)} className="aspect-square w-full rounded-full bg-calculator-gray dark:bg-calculator-dark-gray hover:brightness-90 active:scale-95 transition-transform flex items-center justify-center shadow-sm">
              <span className="text-3xl font-medium text-slate-900 dark:text-white">{num}</span>
            </button>
          ))}
          <button
            onClick={() => setOperation('add')}
            className={`aspect-square w-full rounded-full ${operation === 'add' ? 'bg-calculator-orange text-white ring-4 ring-orange-100 dark:ring-orange-900/30' : 'bg-calculator-orange text-white opacity-80'} active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-orange-500/30`}
          >
            <Icon name="add" className="text-4xl" />
          </button>

          {['4', '5', '6'].map(num => (
            <button key={num} onClick={() => handleNumClick(num)} className="aspect-square w-full rounded-full bg-calculator-gray dark:bg-calculator-dark-gray hover:brightness-90 active:scale-95 transition-transform flex items-center justify-center shadow-sm">
              <span className="text-3xl font-medium text-slate-900 dark:text-white">{num}</span>
            </button>
          ))}
          <button
            onClick={() => setOperation('subtract')}
            className={`aspect-square w-full rounded-full ${operation === 'subtract' ? 'bg-calculator-orange text-white ring-4 ring-orange-100 dark:ring-orange-900/30' : 'bg-calculator-orange text-white opacity-80'} active:scale-95 transition-transform flex items-center justify-center shadow-sm`}
          >
            <Icon name="remove" className="text-4xl" />
          </button>

          {['1', '2', '3'].map(num => (
            <button key={num} onClick={() => handleNumClick(num)} className="aspect-square w-full rounded-full bg-calculator-gray dark:bg-calculator-dark-gray hover:brightness-90 active:scale-95 transition-transform flex items-center justify-center shadow-sm">
              <span className="text-3xl font-medium text-slate-900 dark:text-white">{num}</span>
            </button>
          ))}
          <button onClick={handleBackspace} className="aspect-square w-full rounded-full bg-slate-300 dark:bg-slate-600 hover:brightness-90 active:scale-95 transition-transform flex items-center justify-center shadow-sm text-slate-800 dark:text-white">
            <Icon name="backspace" className="text-3xl" />
          </button>

          <button onClick={handleClear} className="aspect-square w-full rounded-full bg-slate-300 dark:bg-slate-600 hover:brightness-90 active:scale-95 transition-transform flex items-center justify-center shadow-sm">
            <span className="text-2xl font-medium text-slate-800 dark:text-white">C</span>
          </button>
          <button onClick={() => handleNumClick('0')} className="aspect-square w-full rounded-full bg-calculator-gray dark:bg-calculator-dark-gray hover:brightness-90 active:scale-95 transition-transform flex items-center justify-center shadow-sm">
            <span className="text-3xl font-medium text-slate-900 dark:text-white">0</span>
          </button>
          <div className="aspect-square w-full"></div>
          <div className="aspect-square w-full"></div>
        </div>
      </div>

      <div className="px-4 pb-8 pt-2">
        <button
          onClick={handleUpdateClick}
          disabled={adjustAmount === 0}
          className={`w-full rounded-full bg-primary hover:bg-blue-600 active:scale-[0.98] transition-all text-white font-bold text-xl h-16 shadow-lg shadow-primary/30 flex items-center justify-center gap-3 ${adjustAmount === 0 ? 'opacity-50 grayscale' : ''}`}
        >
          <span>确认更新</span>
          <Icon name="check_circle" className="text-2xl" />
        </button>
      </div>

      {/* 确认弹窗 */}
      {showConfirmation && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-2xl transform transition-all scale-100 border border-slate-100 dark:border-slate-800">
            <div className="flex flex-col items-center text-center gap-4">
              <div className={`flex items-center justify-center w-16 h-16 rounded-full ${operation === 'add' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'} mb-1`}>
                <Icon name={operation === 'add' ? "add_business" : "outbound"} className="text-3xl" />
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white">确认库存{operation === 'add' ? '入库' : '出库'}?</h3>

              <div className="w-full bg-background-light dark:bg-black/20 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">产品</span>
                  <span className="font-semibold text-slate-900 dark:text-white text-right truncate max-w-[60%]">{product.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">调整数量</span>
                  <span className={`font-bold ${operation === 'add' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                    {operation === 'add' ? '+' : '-'}{adjustAmount}
                  </span>
                </div>
                <div className="h-px bg-slate-200 dark:bg-slate-700"></div>
                <div className="flex justify-between text-base">
                  <span className="text-slate-500 dark:text-slate-400">更新后库存</span>
                  <span className="font-bold text-primary dark:text-blue-400">{finalStock}</span>
                </div>
              </div>

              <div className="flex gap-3 w-full mt-3">
                <button
                  onClick={() => setShowConfirmation(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 rounded-xl bg-primary text-white font-semibold shadow-lg shadow-primary/30 hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>处理中</span>
                    </>
                  ) : (
                    '确认'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 删除产品确认弹窗 */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 mb-1">
                <Icon name="delete_forever" className="text-3xl" />
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white">删除产品?</h3>

              <div className="w-full bg-background-light dark:bg-black/20 rounded-2xl p-4 space-y-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{product.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">当前库存: {product.quantity}</p>
              </div>

              <p className="text-xs text-red-500">
                ⚠️ 删除后该产品的所有交易记录也将被永久清除
              </p>

              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleDeleteProduct}
                  disabled={isDeleting}
                  className="flex-1 py-3.5 rounded-xl bg-red-500 text-white font-semibold shadow-lg shadow-red-500/30 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>删除中</span>
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
