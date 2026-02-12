import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useData } from '../context/DataContext';

export const AddProduct: React.FC = () => {
  const navigate = useNavigate();
  const { createProduct } = useData();

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [variant, setVariant] = useState('');
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState<string>('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleIncrement = () => {
    setQuantity(prev => String((parseInt(prev) || 0) + 1));
  };

  const handleDecrement = () => {
    setQuantity(prev => {
      const val = parseInt(prev) || 0;
      return String(val > 0 ? val - 1 : 0);
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/^\d*$/.test(val)) {
      setQuantity(val);
    }
  };

  const handleBlur = () => {
    if (quantity === '') {
      setQuantity('0');
    }
  };

  /**
   * 提交创建产品
   */
  const handleSubmit = async () => {
    if (!name.trim()) {
      alert('请输入产品名称');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createProduct({
        name: name.trim(),
        brand: brand.trim(),
        variant: variant.trim(),
        notes: notes.trim(),
        quantity: parseInt(quantity) || 0,
      });

      if (result.data) {
        // 创建成功
        navigate(-1);
      } else {
        // 创建失败，显示详细错误
        const errorMsg = result.error || '创建失败，请重试';
        console.error('[AddProduct] 创建失败:', errorMsg);
        alert(`创建产品失败：${errorMsg}`);
      }
    } catch (error) {
      console.error('[AddProduct] 异常:', error);
      const message = error instanceof Error ? error.message : '未知错误';
      alert(`创建产品失败：${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-black/50 font-display antialiased h-screen w-full overflow-hidden flex flex-col justify-end fixed inset-0 z-50">
      <div className="absolute inset-0 -z-10 backdrop-blur-[2px]" onClick={() => navigate(-1)}></div>

      <div className="relative w-full max-w-md mx-auto h-auto max-h-[90vh] flex flex-col rounded-t-[2rem] bg-card-light dark:bg-card-dark shadow-[0_-4px_24px_rgba(0,0,0,0.15)] animate-slide-up transform transition-transform duration-300 ease-out">
        <div className="pt-3 pb-2 w-full flex justify-center cursor-grab active:cursor-grabbing touch-none" onClick={() => navigate(-1)}>
          <div className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-600"></div>
        </div>

        <div className="px-6 pb-4 flex items-center justify-between border-b border-transparent">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">添加新产品</h2>
          <button onClick={() => navigate(-1)} className="text-sm font-medium text-primary hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            取消
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pt-2 pb-6 no-scrollbar space-y-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1" htmlFor="product-name">产品名称 *</label>
            <div className="relative">
              <input
                id="product-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-14 pl-5 pr-4 rounded-full bg-background-light dark:bg-gray-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-base transition-all duration-200"
                placeholder="例如：修复洗发水"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <Icon name="inventory_2" className="text-xl" />
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1" htmlFor="brand-name">品牌</label>
            <div className="relative">
              <input
                id="brand-name"
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full h-14 pl-5 pr-4 rounded-full bg-background-light dark:bg-gray-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-base transition-all duration-200"
                placeholder="例如：品牌名称"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <Icon name="branding_watermark" className="text-xl" />
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1" htmlFor="variant">产品规格</label>
            <div className="relative">
              <input
                id="variant"
                type="text"
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                className="w-full h-14 pl-5 pr-4 rounded-full bg-background-light dark:bg-gray-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-base transition-all duration-200"
                placeholder="例如：500ml, 红色"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <Icon name="style" className="text-xl" />
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 ml-1" htmlFor="notes">备注 / 描述</label>
            <div className="relative">
              <input
                id="notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full h-14 pl-5 pr-4 rounded-full bg-background-light dark:bg-gray-800 border-transparent focus:border-primary focus:ring-2 focus:ring-primary/20 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-base transition-all duration-200"
                placeholder="例如：供应商联系方式、使用说明..."
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <Icon name="edit_note" className="text-xl" />
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="flex flex-col">
              <span className="text-base font-semibold text-gray-900 dark:text-white">初始库存</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">现有初始数量</span>
            </div>
            <div className="flex items-center bg-background-light dark:bg-gray-800 rounded-full p-1.5 gap-4 shadow-inner">
              <button
                onClick={handleDecrement}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-card-dark text-primary shadow-sm hover:scale-105 active:scale-95 transition-transform duration-150 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <Icon name="remove" className="font-bold text-lg" />
              </button>
              <input
                type="text"
                inputMode="numeric"
                className="w-16 text-center bg-transparent border-none text-xl font-bold text-gray-900 dark:text-white p-0 focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none font-display selection:bg-primary/20"
                value={quantity}
                onChange={handleChange}
                onBlur={handleBlur}
              />
              <button
                onClick={handleIncrement}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-md shadow-primary/30 hover:bg-blue-600 hover:scale-105 active:scale-95 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-card-dark"
              >
                <Icon name="add" className="font-bold text-lg" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 pt-2 pb-8 bg-card-light dark:bg-card-dark rounded-b-[2rem]">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !name.trim()}
            className="w-full h-14 bg-primary text-white text-lg font-semibold rounded-full shadow-lg shadow-primary/30 hover:bg-blue-600 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-md transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>创建中...</span>
              </>
            ) : (
              <>
                <span>创建产品</span>
                <Icon name="check" className="text-xl" />
              </>
            )}
          </button>
        </div>
        <div className="h-2 w-full bg-card-light dark:bg-card-dark"></div>
      </div>
    </div>
  );
};
