


export interface CurrentUser {
  userName: string;
  userAvatar: string;
}

const USER_KEY = 'vibe-current-user';
const VOTED_KEY = 'vibe-voted-wishes';

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

  }
  return { userName: '匿名用户', userAvatar: '' };
}

export function setCurrentUser(user: CurrentUser): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {

  }
}

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

  }
  return new Set();
}

export function hasVoted(wishId: string): boolean {
  return getVotedWishIds().has(wishId);
}

export function markVoted(wishId: string): void {
  const set = getVotedWishIds();
  if (set.has(wishId)) return;
  set.add(wishId);
  try {
    localStorage.setItem(VOTED_KEY, JSON.stringify(Array.from(set)));
  } catch {

  }
}

export function unmarkVoted(wishId: string): void {
  const set = getVotedWishIds();
  if (!set.has(wishId)) return;
  set.delete(wishId);
  try {
    localStorage.setItem(VOTED_KEY, JSON.stringify(Array.from(set)));
  } catch {

  }
}
