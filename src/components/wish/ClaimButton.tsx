// ============================================================
// ClaimButton - 认领按钮组件
// ============================================================
// 根据许愿状态和当前用户身份显示不同操作按钮：
//   - open 且非作者            -> "我来认领制作"
//   - claimed/in-progress 且是认领者 -> "提交成果" + "放弃认领"
//   - completed                -> "查看成果" 链接
//   - 自己提的需求             -> 不显示认领相关按钮
import { useState } from 'react';
import { Hammer, CheckCircle2, ExternalLink, XCircle, Link2 } from 'lucide-react';
import type { Wish } from '@/types';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import type { CurrentUser } from '@/utils/userStorage';
import { cn } from '@/utils/cn';

/** ClaimButton Props */
interface ClaimButtonProps {
  wish: Wish;
  currentUser: CurrentUser;
  /** 认领 */
  onClaim: (id: string) => void;
  /** 提交成果 */
  onSubmitResult: (id: string, resultUrl: string) => void;
  /** 放弃认领 */
  onAbandon: (id: string) => void;
  /** 查看成果 */
  onViewResult?: (url: string) => void;
  /** 按钮尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否采用全宽布局 */
  fullWidth?: boolean;
  /** 自定义类名 */
  className?: string;
}

/** 确认弹窗类型 */
type ConfirmType = 'claim' | 'abandon' | null;

/** ClaimButton 组件 */
export function ClaimButton({
  wish,
  currentUser,
  onClaim,
  onSubmitResult,
  onAbandon,
  onViewResult,
  size = 'md',
  fullWidth = false,
  className,
}: ClaimButtonProps) {
  const [confirm, setConfirm] = useState<ConfirmType>(null);
  const [showResultForm, setShowResultForm] = useState(false);
  const [resultUrl, setResultUrl] = useState('');
  const [urlError, setUrlError] = useState(false);

  const isAuthor = wish.authorName === currentUser.userName;
  const isClaimant =
    !!wish.claimantName && wish.claimantName === currentUser.userName;

  // 已完成：显示查看成果链接
  if (wish.status === 'completed') {
    if (!wish.resultUrl) return null;
    return (
      <Button
        variant="outline"
        size={size}
        icon={<ExternalLink className="w-4 h-4" />}
        fullWidth={fullWidth}
        className={className}
        onClick={() => {
          if (onViewResult) {
            onViewResult(wish.resultUrl!);
          } else {
            window.open(wish.resultUrl, '_blank', 'noopener,noreferrer');
          }
        }}
      >
        查看成果
      </Button>
    );
  }

  // 自己提的需求：不显示认领按钮
  if (isAuthor) return null;

  // open 状态且非作者：显示认领按钮
  if (wish.status === 'open') {
    return (
      <>
        <Button
          variant="primary"
          size={size}
          icon={<Hammer className="w-4 h-4" />}
          fullWidth={fullWidth}
          className={className}
          onClick={() => setConfirm('claim')}
        >
          我来认领制作
        </Button>
        <ConfirmModal
          open={confirm === 'claim'}
          title="确认认领"
          message={`确定要认领「${wish.title}」并负责制作吗？认领后状态将变为"已认领"。`}
          confirmText="确认认领"
          onConfirm={() => {
            onClaim(wish.id);
            setConfirm(null);
          }}
          onClose={() => setConfirm(null)}
        />
      </>
    );
  }

  // claimed / in-progress 且是认领者：显示提交成果 + 放弃认领
  if (isClaimant && (wish.status === 'claimed' || wish.status === 'in-progress')) {
    const handleResultSubmit = () => {
      const trimmed = resultUrl.trim();
      // 简单校验：非空且以 http 开头
      if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
        setUrlError(true);
        return;
      }
      onSubmitResult(wish.id, trimmed);
      setShowResultForm(false);
      setResultUrl('');
      setUrlError(false);
    };

    return (
      <>
        <div className={cn('flex items-center gap-2', fullWidth && 'w-full', className)}>
          <Button
            variant="primary"
            size={size}
            icon={<CheckCircle2 className="w-4 h-4" />}
            fullWidth={fullWidth}
            onClick={() => setShowResultForm(true)}
          >
            提交成果
          </Button>
          <Button
            variant="danger"
            size={size}
            icon={<XCircle className="w-4 h-4" />}
            onClick={() => setConfirm('abandon')}
          >
            放弃认领
          </Button>
        </div>

        {/* 提交成果弹窗 */}
        <Modal
          open={showResultForm}
          onClose={() => {
            setShowResultForm(false);
            setResultUrl('');
            setUrlError(false);
          }}
          title="提交制作成果"
          size="md"
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowResultForm(false);
                  setResultUrl('');
                  setUrlError(false);
                }}
              >
                取消
              </Button>
              <Button variant="primary" onClick={handleResultSubmit}>
                提交
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-content-muted">
              提交成果后，该需求将标记为「已完成」，其他用户可以通过链接查看你的作品。
            </p>
            <div>
              <label className="block text-sm text-content-muted mb-1.5">
                成果链接 <span className="text-error">*</span>
              </label>
              <Input
                icon={<Link2 className="w-4 h-4" />}
                placeholder="https://github.com/your/repo"
                value={resultUrl}
                error={urlError}
                onChange={(e) => {
                  setResultUrl(e.target.value);
                  if (urlError) setUrlError(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleResultSubmit();
                }}
              />
              {urlError && (
                <p className="mt-1.5 text-xs text-error">
                  请输入有效的 http(s) 链接
                </p>
              )}
            </div>
          </div>
        </Modal>

        {/* 放弃认领确认 */}
        <ConfirmModal
          open={confirm === 'abandon'}
          title="确认放弃认领"
          message={`确定要放弃认领「${wish.title}」吗？放弃后该需求将重新变为"待认领"状态。`}
          confirmText="确认放弃"
          danger
          onConfirm={() => {
            onAbandon(wish.id);
            setConfirm(null);
          }}
          onClose={() => setConfirm(null)}
        />
      </>
    );
  }

  // 其他情况不显示
  return null;
}

/** 确认弹窗（内部组件） */
interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmText: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

function ConfirmModal({
  open,
  title,
  message,
  confirmText,
  danger,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmText}
          </Button>
        </>
      }
    >
      <p className="text-sm text-content-muted leading-relaxed">{message}</p>
    </Modal>
  );
}