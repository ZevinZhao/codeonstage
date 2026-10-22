

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Comment, WorkShowcase } from '@/types';
import { generateId } from '@/utils/format';


const initialComments: Comment[] = [
  {
    id: 'comment-1',
    skillId: 'heychengc-vibe-knowledge-film',
    userName: '张三',
    userAvatar: '',
    content: '这个 Skill 太棒了！配合 Claude Code 使用，输入主题就能自动生成分镜和动画，制作效率提升非常明显。两种画风都很实用，样片流程也很清晰。',
    rating: 5,
    createdAt: '2026-10-18T10:30:00Z',
    likes: 42,
  },
  {
    id: 'comment-2',
    skillId: 'heychengc-vibe-knowledge-film',
    userName: '李四',
    userAvatar: '',
    content: '深度拆解爆款视频的功能很实用，复刻画风效果不错。建议先从简单主题开始尝试，逐步掌握分镜表和配音效的调整方法。',
    rating: 4,
    createdAt: '2026-10-17T15:20:00Z',
    likes: 18,
    works: [
      {
        id: 'work-1',
        imageUrl: '',
        description: '用 vibe-knowledge-film 制作了一个"光的折射"科普视频，4K 导出效果很好',
      },
    ],
  },
  {
    id: 'comment-3',
    skillId: 'worlds3-vibe-knowledge',
    userName: '王五',
    userAvatar: '',
    content: 'Canvas 科普动画制作流程很完整，从选题到逐帧检查都有覆盖。Canvas API 绘制的动画流畅度很好，配合 AI 生成代码非常方便。',
    rating: 5,
    createdAt: '2026-10-16T09:00:00Z',
    likes: 35,
  },
  {
    id: 'comment-4',
    skillId: 'luzhong-li-vibe-knowledge-video-skill',
    userName: '赵六',
    userAvatar: '',
    content: '无旁白科普动画的规范和模板很实用，成片工程质量高。HTML 动画方案适合快速产出，不用配音也能讲清楚知识点。',
    rating: 5,
    createdAt: '2026-10-15T14:00:00Z',
    likes: 56,
  },
  {
    id: 'comment-5',
    skillId: 'jogzh-concept-reel',
    userName: '孙七',
    userAvatar: '',
    content: 'Agent 自动生成概念科普视频的效果超出预期。把抽象概念转化为可视化动画很厉害，适合做那种难懂的知识点讲解。',
    rating: 5,
    createdAt: '2026-10-14T11:30:00Z',
    likes: 28,
  },
];


interface CommentState {
  comments: Comment[];

  addComment: (comment: Omit<Comment, 'id' | 'createdAt' | 'likes'>) => void;

  deleteComment: (id: string) => void;

  likeComment: (id: string) => void;

  addWorkToComment: (commentId: string, work: Omit<WorkShowcase, 'id'>) => void;

  getCommentsBySkillId: (skillId: string) => Comment[];
}


export const useCommentStore = create<CommentState>()(
  persist(
    (set, get) => ({
      comments: initialComments,

      addComment: (comment) => {
        const newComment: Comment = {
          ...comment,
          id: generateId(),
          createdAt: new Date().toISOString(),
          likes: 0,
        };
        set((state) => ({ comments: [newComment, ...state.comments] }));
      },

      deleteComment: (id) => {
        set((state) => ({ comments: state.comments.filter((c) => c.id !== id) }));
      },

      likeComment: (id) => {
        set((state) => ({
          comments: state.comments.map((c) =>
            c.id === id ? { ...c, likes: c.likes + 1 } : c
          ),
        }));
      },

      addWorkToComment: (commentId, work) => {
        const newWork: WorkShowcase = { ...work, id: generateId() };
        set((state) => ({
          comments: state.comments.map((c) =>
            c.id === commentId
              ? { ...c, works: [...(c.works || []), newWork] }
              : c
          ),
        }));
      },

      getCommentsBySkillId: (skillId) => {
        return get()
          .comments.filter((c) => c.skillId === skillId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },
    }),
    {
      name: 'vibe-comments',
      version: 1,
    }
  )
);
