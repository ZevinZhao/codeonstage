// ============================================================
// 当前用户工具 - localStorage 管理当前用户身份
// ============================================================

/** 当前用户信息 */
export interface CurrentUser {
  userName: string;
  userAvatar: string;
}

/** localStorage key */
const STORAGE_KEY = 'vibe-current-user';

/** 默认匿名用户 */
export const DEFAULT_USER: CurrentUser = {
  userName: '匿名用户',
  userAvatar: '',
};

/**
 * 获取当前用户（未设置时返回默认匿名用户）
 */
export function getCurrentUser(): CurrentUser {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_USER };
    const parsed = JSON.parse(raw) as Partial<CurrentUser>;
    return {
      userName: parsed.userName?.trim() || DEFAULT_USER.userName,
      userAvatar: parsed.userAvatar || '',
    };
  } catch {
    return { ...DEFAULT_USER };
  }
}

/**
 * 保存当前用户到 localStorage
 */
export function setCurrentUser(user: CurrentUser): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    // 静默失败：localStorage 不可用时降级为内存使用
  }
}

/**
 * 判断某条评论是否属于当前用户
 * 用 userName 作为判别依据（项目无登录系统，仅做粗粒度识别）
 */
export function isCurrentUser(userName: string): boolean {
  const current = getCurrentUser();
  return current.userName === userName;
}