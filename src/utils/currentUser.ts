


export interface CurrentUser {
  userName: string;
  userAvatar: string;
}


const STORAGE_KEY = 'vibe-current-user';


export const DEFAULT_USER: CurrentUser = {
  userName: '匿名用户',
  userAvatar: '',
};

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

export function setCurrentUser(user: CurrentUser): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {

  }
}

export function isCurrentUser(userName: string): boolean {
  const current = getCurrentUser();
  return current.userName === userName;
}
