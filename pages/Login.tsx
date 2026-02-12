import React, { useState } from 'react';
import { Icon } from '../components/Icon';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { login, register } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('请填写邮箱和密码');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let result;
      if (isLoginMode) {
        result = await login(email, password);
      } else {
        if (!name.trim()) {
          setError('请填写姓名');
          setIsLoading(false);
          return;
        }
        result = await register(email, password, name.trim());
      }

      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError('操作失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm flex flex-col items-center animate-fade-in">
        {/* 应用图标 */}
        <div className="h-24 w-24 bg-gradient-to-tr from-blue-400 to-cyan-300 rounded-[2rem] flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-200 dark:shadow-blue-900/30 ring-4 ring-white dark:ring-white/5 transform transition-transform hover:scale-105 duration-300">
          <Icon name="content_cut" className="text-[40px]" />
        </div>

        <h2 className="text-center text-3xl font-bold leading-9 tracking-tight text-slate-900 dark:text-white font-display">
          库存管理系统
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          {isLoginMode ? '登录您的账号' : '创建新账号'}
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm animate-slide-up">
        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* 错误提示 */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
            </div>
          )}

          {/* 注册模式显示姓名输入 */}
          {!isLoginMode && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium leading-6 text-slate-900 dark:text-white ml-1">
                姓名
              </label>
              <div className="mt-2">
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-2xl border-0 py-4 pl-4 bg-white dark:bg-card-dark text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 transition-all"
                  placeholder="您的姓名"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium leading-6 text-slate-900 dark:text-white ml-1">
              邮箱
            </label>
            <div className="mt-2">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-2xl border-0 py-4 pl-4 bg-white dark:bg-card-dark text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 transition-all"
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between ml-1">
              <label htmlFor="password" className="block text-sm font-medium leading-6 text-slate-900 dark:text-white">
                密码
              </label>
            </div>
            <div className="mt-2">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isLoginMode ? "current-password" : "new-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-2xl border-0 py-4 pl-4 bg-white dark:bg-card-dark text-slate-900 dark:text-white shadow-sm ring-1 ring-inset ring-slate-200 dark:ring-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6 transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full justify-center rounded-2xl bg-primary px-3 py-4 text-sm font-semibold leading-6 text-white shadow-lg shadow-primary/30 hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {isLoginMode ? '登录中...' : '注册中...'}
                </div>
              ) : (
                isLoginMode ? '登录' : '注册'
              )}
            </button>
          </div>
        </form>

        <p className="mt-10 text-center text-sm text-slate-500 dark:text-slate-400">
          {isLoginMode ? '还没账号?' : '已有账号?'}{' '}
          <button
            onClick={toggleMode}
            className="font-semibold leading-6 text-primary hover:text-primary-dark transition-colors"
          >
            {isLoginMode ? '立即注册' : '去登录'}
          </button>
        </p>
      </div>
    </div>
  );
};