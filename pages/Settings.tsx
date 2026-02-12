import React, { useState, useEffect } from 'react';
import { Icon } from '../components/Icon';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

type ViewState = 'main' | 'profile' | 'notifications';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { profile, logout, updateProfile } = useAuth();
  const { products, fetchProducts, fetchTransactions } = useData();

  // 视图状态
  const [currentView, setCurrentView] = useState<ViewState>('main');

  // 功能状态
  const [isDark, setIsDark] = useState(() => {
    // 优先从 localStorage 读取用户偏好
    const saved = localStorage.getItem('hairstock_theme');
    if (saved) {
      return saved === 'dark';
    }
    return document.documentElement.classList.contains('dark');
  });

  // 初始化时同步 DOM class
  React.useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const [isSyncing, setIsSyncing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // 个人资料表单
  const [profileForm, setProfileForm] = useState({
    name: '',
    role: '',
  });

  // 同步表单数据
  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name,
        role: profile.role,
      });
    }
  }, [profile]);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    localStorage.setItem('hairstock_theme', newIsDark ? 'dark' : 'light');
    if (newIsDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      // NOTE: 真正从 Supabase 重新拉取数据
      await Promise.all([fetchProducts(), fetchTransactions()]);
    } catch (error) {
      console.error('同步失败:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportStock = () => {
    const headers = ['ID', '品牌', '产品名称', '规格', '数量', '状态'];
    const rows = products.map(product => [
      product.id,
      `"${product.brand}"`,
      `"${product.name}"`,
      `"${product.variant}"`,
      product.quantity,
      product.quantity <= product.low_stock_threshold ? 'Low Stock' : 'Normal'
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `hairstock_inventory_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
  };

  const handleSaveProfile = async () => {
    await updateProfile(profileForm);
    setCurrentView('main');
  };

  // 个人资料编辑视图
  if (currentView === 'profile') {
    return (
      <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark animate-slide-up">
        <header className="pt-8 pb-2 px-4 sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md z-10 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setCurrentView('main')} className="flex items-center gap-1 text-primary p-2 -ml-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
              <Icon name="arrow_back_ios_new" className="text-[20px]" />
              <span className="text-base font-medium">设置</span>
            </button>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white absolute left-1/2 -translate-x-1/2">个人资料</h1>
            <button onClick={handleSaveProfile} className="text-primary font-bold text-base px-2">保存</button>
          </div>
        </header>
        <div className="p-6 space-y-6">
          <div className="flex flex-col items-center py-4">
            <div className="relative">
              <div className="size-24 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border-4 border-white dark:border-slate-600 shadow-md flex items-center justify-center">
                <Icon name="person" className="text-[48px] text-slate-400" />
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg border-2 border-white dark:border-card-dark">
                <Icon name="photo_camera" className="text-[16px]" />
              </button>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase ml-1">姓名</label>
              <input
                type="text"
                value={profileForm.name}
                onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full p-4 rounded-xl bg-white dark:bg-card-dark border-transparent focus:border-primary focus:ring-0 text-slate-900 dark:text-white shadow-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase ml-1">职位</label>
              <input
                type="text"
                value={profileForm.role}
                onChange={e => setProfileForm({ ...profileForm, role: e.target.value })}
                className="w-full p-4 rounded-xl bg-white dark:bg-card-dark border-transparent focus:border-primary focus:ring-0 text-slate-900 dark:text-white shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 通知设置视图
  if (currentView === 'notifications') {
    return (
      <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark animate-slide-up">
        <header className="pt-8 pb-2 px-4 sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md z-10 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setCurrentView('main')} className="flex items-center gap-1 text-primary p-2 -ml-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
              <Icon name="arrow_back_ios_new" className="text-[20px]" />
              <span className="text-base font-medium">设置</span>
            </button>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white absolute left-1/2 -translate-x-1/2">通知设置</h1>
            <div className="w-10"></div>
          </div>
        </header>
        <div className="p-6 space-y-6">
          <section>
            <div className="bg-white dark:bg-card-dark rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 divide-y divide-slate-50 dark:divide-slate-800">
              <div className="flex items-center justify-between p-4">
                <span className="text-slate-900 dark:text-white font-medium">允许通知</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  // 主设置视图
  return (
    <div className="flex flex-col min-h-screen pb-24 bg-background-light dark:bg-background-dark">
      <header className="flex flex-col px-4 pt-12 pb-6 bg-background-light dark:bg-background-dark sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <Icon name="arrow_back_ios_new" className="text-text-primary-light dark:text-text-primary-dark text-[20px]" />
          </button>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary-light dark:text-text-primary-dark px-2">设置</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-6 space-y-6 no-scrollbar">

        {/* 个人资料卡片 */}
        <div
          onClick={() => setCurrentView('profile')}
          className="bg-white dark:bg-card-dark p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform group"
        >
          <div className="size-16 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0 border-2 border-white dark:border-slate-600 shadow-sm flex items-center justify-center">
            <Icon name="person" className="text-[32px] text-slate-400 dark:text-slate-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">{profile?.name || '用户'}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{profile?.role || '员工'}</p>
          </div>
          <div className="p-2 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:text-primary transition-colors">
            <Icon name="chevron_right" className="text-[20px]" />
          </div>
        </div>

        {/* 外观设置 */}
        <section>
          <div className="px-1 mb-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">外观</h3>
          </div>
          <div className="bg-white dark:bg-card-dark rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 divide-y divide-slate-50 dark:divide-slate-800">
            <div className="flex items-center gap-4 p-4 justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center rounded-full bg-indigo-500/10 shrink-0 w-8 h-8 text-indigo-500">
                  <Icon name="dark_mode" className="text-[20px]" />
                </div>
                <p className="text-base font-medium leading-normal text-slate-900 dark:text-white">深色模式</p>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isDark ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDark ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </section>

        {/* 数据设置 */}
        <section>
          <div className="px-1 mb-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">数据</h3>
          </div>
          <div className="bg-white dark:bg-card-dark rounded-2xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800 divide-y divide-slate-50 dark:divide-slate-800">
            <div
              onClick={handleExportStock}
              className="flex items-center gap-4 p-4 cursor-pointer active:bg-slate-50 dark:active:bg-slate-800 transition-colors group"
            >
              <div className="flex items-center justify-center rounded-full bg-teal-500/10 shrink-0 w-8 h-8 text-teal-500">
                <Icon name="download" className="text-[20px]" />
              </div>
              <div className="flex-1">
                <p className="text-base font-medium leading-normal text-slate-900 dark:text-white">导出库存 (CSV)</p>
              </div>
              <Icon name="chevron_right" className="text-slate-300 dark:text-slate-600" />
            </div>
            <div
              onClick={handleSync}
              className="flex items-center gap-4 p-4 cursor-pointer active:bg-slate-50 dark:active:bg-slate-800 transition-colors group"
            >
              <div className="flex items-center justify-center rounded-full bg-purple-500/10 shrink-0 w-8 h-8 text-purple-500">
                <Icon name="cloud_sync" className={`text-[20px] ${isSyncing ? 'animate-spin' : ''}`} />
              </div>
              <div className="flex-1">
                <p className="text-base font-medium leading-normal text-slate-900 dark:text-white">
                  {isSyncing ? '同步中...' : '云端同步'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isSyncing ? '请保持网络连接' : '上次同步: 刚刚'}
                </p>
              </div>
              {isSyncing ? (
                <div className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin mr-1"></div>
              ) : (
                <Icon name="chevron_right" className="text-slate-300 dark:text-slate-600" />
              )}
            </div>
          </div>
        </section>

        {/* 退出登录 */}
        <section className="pb-8">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full bg-white dark:bg-card-dark active:bg-red-50 dark:active:bg-red-900/10 transition-colors rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 text-center flex items-center justify-center gap-2 group"
          >
            <span className="text-red-500 font-semibold text-base">退出登录</span>
          </button>
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400 font-medium">HairStock Pro v1.1.2</p>
          </div>
        </section>
      </div>

      {/* 退出确认弹窗 */}
      {showLogoutConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" style={{ position: 'fixed' }}>
          <div className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <Icon name="logout" className="text-red-600 dark:text-red-400 text-[24px]" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">确认退出?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                您将需要重新登录才能访问库存数据。
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold shadow-lg shadow-red-500/30 hover:bg-red-600 transition-colors"
                >
                  退出登录
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};