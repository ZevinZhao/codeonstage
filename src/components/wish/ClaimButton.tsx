import { useState } from 'react';
import { Hammer, CheckCircle2, ExternalLink, XCircle, Link2 } from 'lucide-react';
import type { Wish } from '@/types';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import type { CurrentUser } from '@/utils/userStorage';
import { cn } from '@/utils/cn';

interface ClaimButtonProps {
  wish: Wish;
  currentUser: CurrentUser;
  onClaim: (id: string) => void;
  onSubmitResult: (id: string, resultUrl: string) => void;
  onAbandon: (id: string) => void;
  onViewResult?: (url: string) => void;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

type ConfirmType = 'claim' | 'abandon' | null;

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

  if (isAuthor) return null;

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

  if (isClaimant && (wish.status === 'claimed' || wish.status === 'in-progress')) {
    const handleResultSubmit = () => {
      const trimmed = resultUrl.trim();
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

  return null;
}

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
