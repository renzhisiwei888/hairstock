import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * 简化的本地用户类型
 * 所有用户共享同一个 user_id 以实现数据同步
 */
interface LocalUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url: string | null;
}

interface AuthContextType {
  user: LocalUser | null;
  profile: LocalUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (email: string, password: string, name?: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<LocalUser>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 本地存储 key
const STORAGE_KEY = 'hairstock_user';

// 共享用户 ID - 所有设备使用同一个 ID 以实现数据同步
// NOTE: 这个 ID 需要与 Supabase 中的 profiles 表对应
const SHARED_USER_ID = 'shared-user-hairstock';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // 初始化：从 localStorage 恢复登录状态
  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEY);
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  /**
   * 用户登录 - 任意账号密码都能登入
   * 所有用户使用共享 ID 以实现数据同步
   */
  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!email.trim() || !password.trim()) {
      return { error: '请输入邮箱和密码' };
    }

    // 创建用户，使用共享 ID
    const localUser: LocalUser = {
      id: SHARED_USER_ID,
      email: email.trim(),
      name: email.split('@')[0],
      role: '管理员',
      avatar_url: null,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(localUser));
    setUser(localUser);

    return { error: null };
  };

  /**
   * 用户注册 - 直接创建并登入
   */
  const register = async (email: string, password: string, name?: string): Promise<{ error: string | null }> => {
    if (!email.trim() || !password.trim()) {
      return { error: '请输入邮箱和密码' };
    }

    const localUser: LocalUser = {
      id: SHARED_USER_ID,
      email: email.trim(),
      name: name?.trim() || email.split('@')[0],
      role: '管理员',
      avatar_url: null,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(localUser));
    setUser(localUser);

    return { error: null };
  };

  /**
   * 用户登出
   */
  const logout = async () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  /**
   * 更新用户资料
   */
  const updateProfile = async (updates: Partial<LocalUser>): Promise<boolean> => {
    if (!user) return false;

    const updatedUser = { ...user, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));
    setUser(updatedUser);
    return true;
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile: user,
      isAuthenticated,
      isLoading,
      login,
      register,
      logout,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};