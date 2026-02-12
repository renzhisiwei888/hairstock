import React from 'react';
import { HashRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Analytics } from './pages/Analytics';
import { History } from './pages/History';
import { Settings } from './pages/Settings';
import { StockAdjustment } from './pages/StockAdjustment';
import { AddProduct } from './pages/AddProduct';
import { ProductPerformance } from './pages/ProductPerformance';
import { WarehouseManage } from './pages/WarehouseManage';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

/**
 * 主布局包装器，包含底部导航
 */
const MainLayout = () => {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

/**
 * 路由守卫组件，处理认证状态
 */
const AppRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // 认证状态加载中显示 Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  // 未登录时显示登录页
  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/history" element={<History />} />
      </Route>

      {/* 独立布局的页面 */}
      <Route path="/analytics/products" element={<ProductPerformance />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/warehouses" element={<WarehouseManage />} />
      <Route path="/adjust/:id" element={<StockAdjustment />} />
      <Route path="/add" element={<AddProduct />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

/**
 * 应用主入口
 * 提供 AuthProvider 和 DataProvider 上下文
 */
const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </DataProvider>
    </AuthProvider>
  );
};

export default App;