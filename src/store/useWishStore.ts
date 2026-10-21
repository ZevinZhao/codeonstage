// ============================================================
// 许愿池 Store - Zustand + localStorage 持久化
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Wish, WishStatus } from '@/types';
import { generateId } from '@/utils/format';

/** 初始示例许愿数据 */
const initialWishes: Wish[] = [
  {
    id: 'wish-1',
    title: '希望有一个支持音乐/MV 风格的知识短片 Skill',
    description: '目前 vibe-knowledge-film 主要支持科普画风，希望能有人扩展一个支持音乐/MV 风格的知识短片 Skill，能自动配乐、生成节奏感强的动画分镜，适合音乐类知识科普。',
    primaryCategory: 'vibe',
    tags: ['科普', '音乐/MV', '动画'],
    authorName: '社区用户',
    authorAvatar: '',
    votes: 128,
    status: 'open',
    createdAt: '2026-10-10T08:00:00Z',
  },
  {
    id: 'wish-2',
    title: '需要一个支持 Remotion 的科普视频 Skill',
    description: '现有的科普视频 Skill 多基于 Canvas/HTML，希望能有基于 Remotion 的版本，利用 React 组件化优势，适合复杂动画场景与可复用的动画组件库。',
    primaryCategory: 'vibe',
    tags: ['Remotion', '科普', '动画'],
    authorName: '前端开发者',
    authorAvatar: '',
    votes: 89,
    status: 'claimed',
    claimantName: 'Remotion爱好者',
    claimantAvatar: '',
    createdAt: '2026-10-08T12:00:00Z',
  },
  {
    id: 'wish-3',
    title: '希望有中文版的 Canvas 动画制作教程 Skill',
    description: '目前 Canvas 科普动画 Skill 的文档多为英文，希望能有人整理一份中文版教程 Skill，包含 Canvas 动画基础、分镜设计、逐帧检查等完整制作流程。',
    primaryCategory: 'vibe',
    tags: ['Canvas', '科普', '动画'],
    authorName: '中文开发者',
    authorAvatar: '',
    votes: 156,
    status: 'in-progress',
    claimantName: '翻译志愿者',
    claimantAvatar: '',
    createdAt: '2026-10-05T10:00:00Z',
  },
  {
    id: 'wish-4',
    title: '需要一个科普视频导演 Skill 的分镜模板库',
    description: '现有的视频导演 Skill 缺少分镜模板，希望能有一份覆盖历史、科学、技术等常见科普领域的分镜模板库，配合导演 Skill 使用可以快速生成分镜方案。',
    primaryCategory: 'vibe',
    tags: ['分镜', '科普', '模板'],
    authorName: '视频创作者',
    authorAvatar: '',
    votes: 72,
    status: 'completed',
    claimantName: '导演Skill开发者',
    claimantAvatar: '',
    createdAt: '2026-09-28T14:00:00Z',
    resultUrl: 'https://github.com/example/vibe-director-templates',
  },
  {
    id: 'wish-5',
    title: '希望有概念科普 Agent Skill 的多概念批量生成功能',
    description: '现有的 concept-reel Skill 一次只能生成一个概念的科普视频，希望能扩展支持批量输入多个概念，自动生成系列科普视频，适合做知识合集。',
    primaryCategory: 'vibe',
    tags: ['Agent', '科普', '工作流'],
    authorName: '知识博主',
    authorAvatar: '',
    votes: 64,
    status: 'open',
    createdAt: '2026-10-12T16:00:00Z',
  },
];

/** 许愿可编辑字段 */
export type WishEditableFields = Pick<Wish, 'title' | 'description' | 'primaryCategory' | 'tags'>;

/** 许愿 Store 接口 */
interface WishState {
  wishes: Wish[];
  /** 添加许愿 */
  addWish: (wish: Omit<Wish, 'id' | 'votes' | 'status' | 'createdAt'>) => void;
  /** 投票（点赞） */
  voteWish: (id: string) => void;
  /** 取消投票 */
  unvoteWish: (id: string) => void;
  /** 认领许愿 */
  claimWish: (id: string, claimantName: string, claimantAvatar: string) => void;
  /** 放弃认领（状态回到 open，清空认领人） */
  abandonClaim: (id: string) => void;
  /** 标记为开发中 */
  startProgress: (id: string) => void;
  /** 完成许愿 */
  completeWish: (id: string, resultUrl: string) => void;
  /** 编辑许愿（仅可编辑字段） */
  editWish: (id: string, updates: WishEditableFields) => void;
  /** 移除许愿 */
  removeWish: (id: string) => void;
  /** 按状态获取 */
  getByStatus: (status: WishStatus) => Wish[];
}

/** 许愿 Store */
export const useWishStore = create<WishState>()(
  persist(
    (set, get) => ({
      wishes: initialWishes,

      addWish: (wish) => {
        const newWish: Wish = {
          ...wish,
          id: generateId(),
          votes: 0,
          status: 'open',
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ wishes: [newWish, ...state.wishes] }));
      },

      voteWish: (id) => {
        set((state) => ({
          wishes: state.wishes.map((w) =>
            w.id === id ? { ...w, votes: w.votes + 1 } : w
          ),
        }));
      },

      unvoteWish: (id) => {
        set((state) => ({
          wishes: state.wishes.map((w) =>
            w.id === id ? { ...w, votes: Math.max(0, w.votes - 1) } : w
          ),
        }));
      },

      claimWish: (id, claimantName, claimantAvatar) => {
        set((state) => ({
          wishes: state.wishes.map((w) =>
            w.id === id
              ? { ...w, status: 'claimed', claimantName, claimantAvatar }
              : w
          ),
        }));
      },

      abandonClaim: (id) => {
        set((state) => ({
          wishes: state.wishes.map((w) =>
            w.id === id
              ? {
                  ...w,
                  status: 'open',
                  claimantName: undefined,
                  claimantAvatar: undefined,
                }
              : w
          ),
        }));
      },

      startProgress: (id) => {
        set((state) => ({
          wishes: state.wishes.map((w) =>
            w.id === id ? { ...w, status: 'in-progress' } : w
          ),
        }));
      },

      completeWish: (id, resultUrl) => {
        set((state) => ({
          wishes: state.wishes.map((w) =>
            w.id === id ? { ...w, status: 'completed', resultUrl } : w
          ),
        }));
      },

      editWish: (id, updates) => {
        set((state) => ({
          wishes: state.wishes.map((w) =>
            w.id === id ? { ...w, ...updates } : w
          ),
        }));
      },

      removeWish: (id) => {
        set((state) => ({ wishes: state.wishes.filter((w) => w.id !== id) }));
      },

      getByStatus: (status) => {
        return get().wishes.filter((w) => w.status === status);
      },
    }),
    {
      name: 'vibe-wishes',
      // v2：Wish.resourceType → primaryCategory（类型体系重构），弃用旧缓存
      version: 2,
    }
  )
);