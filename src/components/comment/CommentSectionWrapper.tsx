// ============================================================
// CommentSectionWrapper 评论区包装组件
// 从路由参数提取 skillId，处理 Skill 不存在的情况
// 用于在 SkillDetailPage 中集成评论区，避免直接耦合
// ============================================================
import { useParams } from 'react-router-dom';
import { CommentSection } from './CommentSection';
import { getSkillById } from '@/data';
import { EmptyState } from '@/components/ui/EmptyState';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Compass } from 'lucide-react';

/** CommentSectionWrapper 组件 */
export function CommentSectionWrapper() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <EmptyState
        title="缺少 Skill ID"
        description="无法加载评论区，请返回列表重新进入"
      />
    );
  }

  const skill = getSkillById(id);
  if (!skill) {
    return (
      <EmptyState
        title="Skill 不存在"
        description="该 Skill 可能已下架或链接错误"
        action={
          <Link to="/skills">
            <Button icon={<Compass className="w-4 h-4" />}>返回 Skill 大全</Button>
          </Link>
        }
      />
    );
  }

  return <CommentSection skillId={id} />;
}