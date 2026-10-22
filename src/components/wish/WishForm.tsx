import { useState, type KeyboardEvent } from 'react';
import { X, Tag as TagIcon, Plus } from 'lucide-react';
import type { PrimaryCategory } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useWishStore } from '@/store/useWishStore';
import { toast } from '@/store/useToastStore';
import { ALL_PRIMARY_CATEGORIES, PRIMARY_CATEGORY_LABELS } from '@/utils/constants';
import { getCurrentUser } from '@/utils/userStorage';
import { cn } from '@/utils/cn';

interface WishFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const primaryCategoryOptions = ALL_PRIMARY_CATEGORIES.map((c) => ({
  value: c,
  label: PRIMARY_CATEGORY_LABELS[c],
}));

export function WishForm({ open, onClose, onSuccess }: WishFormProps) {
  const addWish = useWishStore((s) => s.addWish);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [primaryCategory, setPrimaryCategory] = useState<PrimaryCategory | ''>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [errors, setErrors] = useState<{
    title?: boolean;
    description?: boolean;
    primaryCategory?: boolean;
  }>({});

  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPrimaryCategory('');
    setTags([]);
    setTagInput('');
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addTag = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    if (tags.includes(value)) return;
    if (tags.length >= 8) {
      toast.warning('最多添加 8 个标签');
      return;
    }
    setTags((prev) => [...prev, value]);
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!title.trim()) next.title = true;
    if (!description.trim()) next.description = true;
    if (!primaryCategory) next.primaryCategory = true;
    setErrors(next);
    return !next.title && !next.description && !next.primaryCategory;
  };

  const handleSubmit = () => {
    if (!validate()) {
      toast.error('请填写完整的需求信息');
      return;
    }
    setSubmitting(true);
    try {
      const user = getCurrentUser();
      addWish({
        title: title.trim(),
        description: description.trim(),
        primaryCategory: primaryCategory as PrimaryCategory,
        tags,
        authorName: user.userName,
        authorAvatar: user.userAvatar,
      });
      toast.success('需求提交成功！等待社区认领');
      resetForm();
      onSuccess?.();
      onClose();
    } catch {
      toast.error('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="提一个新需求"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={submitting}>
            取消
          </Button>
          <Button variant="primary" loading={submitting} onClick={handleSubmit}>
            提交需求
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-content-muted mb-1.5">
            需求标题 <span className="text-error">*</span>
          </label>
          <Input
            placeholder="一句话描述你想要的 Skill，例如：希望有一个 Flutter 的 Cursor 规则"
            value={title}
            error={errors.title}
            maxLength={80}
            onChange={(e) => {
              setTitle(e.target.value);
              if (errors.title) setErrors((p) => ({ ...p, title: false }));
            }}
          />
          {errors.title && (
            <p className="mt-1.5 text-xs text-error">请输入需求标题</p>
          )}
          <p className="mt-1.5 text-xs text-content-faint">
            {title.length}/80
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-content-muted mb-1.5">
            需求描述 <span className="text-error">*</span>
          </label>
          <Textarea
            placeholder="详细描述你想要什么功能的 Skill，使用场景、期望效果等"
            value={description}
            error={errors.description}
            rows={5}
            maxLength={1000}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description) setErrors((p) => ({ ...p, description: false }));
            }}
          />
          {errors.description && (
            <p className="mt-1.5 text-xs text-error">请输入需求描述</p>
          )}
          <p className="mt-1.5 text-xs text-content-faint">
            {description.length}/1000
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-content-muted mb-1.5">
            所属大类 <span className="text-error">*</span>
          </label>
          <Select
            options={[{ value: '', label: '请选择大类' }, ...primaryCategoryOptions]}
            value={primaryCategory}
            className={cn(errors.primaryCategory && 'border-error/50')}
            onChange={(e) => {
              setPrimaryCategory(e.target.value as PrimaryCategory | '');
              if (errors.primaryCategory) setErrors((p) => ({ ...p, primaryCategory: false }));
            }}
          />
          {errors.primaryCategory && (
            <p className="mt-1.5 text-xs text-error">请选择大类</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-content-muted mb-1.5">
            标签 <span className="text-content-faint text-xs">（可选，回车添加）</span>
          </label>
          <div
            className={cn(
              'flex flex-wrap items-center gap-1.5 p-2 rounded-lg border bg-base-elevated',
              'focus-within:border-white/30 focus-within:ring-1 focus-within:ring-white/10 transition-colors',
              'border-border'
            )}
          >
            <TagIcon className="w-4 h-4 text-content-subtle ml-1" />
            {tags.map((tag) => (
              <Badge
                key={tag}
                color="bg-white/[0.05] text-content-muted border-border"
              >
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:text-error transition-colors"
                  aria-label={`移除 ${tag}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            <input
              type="text"
              value={tagInput}
              placeholder={tags.length === 0 ? '输入标签后回车' : ''}
              className="flex-1 min-w-[120px] bg-transparent text-sm text-content placeholder:text-content-faint focus:outline-none px-1 py-0.5"
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={() => addTag(tagInput)}
            />
          </div>
          {tags.length > 0 && (
            <p className="mt-1.5 text-xs text-content-faint">
              已添加 {tags.length}/8 个标签
            </p>
          )}
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-white/[0.03] border border-border-subtle">
          <Plus className="w-4 h-4 text-content-subtle mt-0.5 flex-shrink-0" />
          <p className="text-xs text-content-muted leading-relaxed">
            提交后需求将进入「待认领」状态，社区成员可以投票或主动认领制作。请确保描述清晰、可执行。
          </p>
        </div>
      </div>
    </Modal>
  );
}
