import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Icon } from './Icon';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  const navItems = [
    { name: '首页', icon: 'home', path: '/' },
    { name: '分析', icon: 'bar_chart', path: '/analytics' },
    { name: 'Add', icon: 'add', path: '/add', isAction: true },
    { name: '历史', icon: 'history', path: '/history' },
    { name: '仓库', icon: 'warehouse', path: '/warehouses' },
  ];

  return (
    <nav className="fixed bottom-0 z-30 w-full max-w-md bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 h-[60px] pb-2 items-end">
        {navItems.map((item) => {
          if (item.isAction) {
            return (
              <div key={item.name} className="flex items-center justify-center w-full h-full relative">
                <Link to={item.path} className="flex items-center justify-center bg-primary hover:bg-primary-dark text-white rounded-full shadow-glow transition-transform active:scale-95 absolute -top-6 w-14 h-14 ring-4 ring-background-light dark:ring-background-dark">
                  <Icon name={item.icon} className="text-[32px]" />
                </Link>
              </div>
            );
          }

          const isActive = path === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${isActive
                  ? 'text-primary'
                  : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-primary'
                }`}
            >
              <Icon
                name={item.icon}
                className="text-[26px]"
                filled={isActive}
              />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
