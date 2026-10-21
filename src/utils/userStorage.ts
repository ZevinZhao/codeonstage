// ============================================================
// 用户与投票的 localStorage 工具
// ============================================================
// 约定的存储 key：
// - vibe-current-user  : 当前用户信息 { userName, userAvatar }
// - vibe-voted-wishes  : 已投票的许愿 id 列表

/** 当前用户信息 */
export interface CurrentUser {
  userName: string;
  userAvatar: string;
}

const USER_KEY = 'vibe-current-user';
const VOTED_KEY = 'vibe-voted-wishes';

/**
 * 获取当前用户信息
 * 若 localStorage 中没有，则返回一个默认匿名用户
 */
export function getCurrentUser(): CurrentUser {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CurrentUser;
      if (parsed && typeof parsed.userName === 'string') {
        return {
          userName: parsed.userName,
          userAvatar: typeof parsed.userAvatar === 'string' ? parsed.userAvatar : '',
        };
      }
    }
  } catch {
    // 解析失败时回退到默认用户
  }
  return { userName: '匿名用户', userAvatar: '' };
}

/**
 * 设置当前用户信息
 */
export function setCurrentUser(user: CurrentUser): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // 写入失败时静默忽略
  }
}

/**
 * 获取已投票的许愿 id 集合
 */
export function getVotedWishIds(): Set<string> {
  try {
    const raw = localStorage.getItem(VOTED_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr.filter((v): v is string => typeof v === 'string'));
      }
    }
  } catch {
    // 解析失败时回退到空集合
  }
  return new Set();
}

/**
 * 判断是否已投票
 */
export function hasVoted(wishId: string): boolean {
  return getVotedWishIds().has(wishId);
}

/**
 * 标记已投票（若已存在则不重复添加）
 */
export function markVoted(wishId: string): void {
  const set = getVotedWishIds();
  if (set.has(wishId)) return;
  set.add(wishId);
  try {
    localStorage.setItem(VOTED_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // 写入失败时静默忽略
  }
}

/**
 * 取消投票标记
 */
export function unmarkVoted(wishId: string): void {
  const set = getVotedWishIds();
  if (!set.has(wishId)) return;
  set.delete(wishId);
  try {
    localStorage.setItem(VOTED_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // 写入失败时静默忽略
  }
}