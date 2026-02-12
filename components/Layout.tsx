import React from 'react';
import { BottomNav } from './BottomNav';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="relative min-h-screen bg-background-light dark:bg-background-dark max-w-md mx-auto shadow-2xl overflow-hidden">
      {children}
      <BottomNav />
    </div>
  );
};
