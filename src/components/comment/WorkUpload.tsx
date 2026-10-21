// ============================================================
// WorkUpload 成品上传组件
// - 支持上传多张图片（input type=file accept=image/*）
// - 图片预览网格（可删除）
// - 每张图片可添加描述
// - 上传后转为 base64 存储
// - 限制图片大小（2MB）和数量（5 张）
// - 拖拽上传支持
// - 预览时点击可放大查看
// ============================================================
import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { ImagePlus, X, ZoomIn, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { toast } from '@/store/useToastStore';
import type { WorkShowcase } from '@/types';

/** 默认限制 */
const MAX_SIZE_MB = 2;
const MAX_COUNT = 5;

/** WorkUpload Props */
interface WorkUploadProps {
  /** 当前已上传的成品列表 */
  works: WorkShowcase[];
  /** 作品变化回调 */
  onChange: (works: WorkShowcase[]) => void;
  /** 最大数量 */
  maxCount?: number;
  /** 单张最大尺寸（MB） */
  maxSizeMb?: number;
  /** 自定义类名 */
  className?: string;
}

/**
 * 将 File 转为 base64 字符串
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

/** WorkUpload 组件 */
export function WorkUpload({
  works,
  onChange,
  maxCount = MAX_COUNT,
  maxSizeMb = MAX_SIZE_MB,
  className,
}: WorkUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  // 放大查看的图片索引
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const maxSizeBytes = maxSizeMb * 1024 * 1024;
  const remaining = maxCount - works.length;

  /** 处理文件选择 */
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (remaining <= 0) {
      toast.warning(`最多上传 ${maxCount} 张图片`);
      return;
    }

    const fileArray = Array.from(files).slice(0, remaining);
    setUploading(true);

    try {
      const newWorks: WorkShowcase[] = [];
      for (const file of fileArray) {
        // 类型校验
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} 不是图片文件`);
          continue;
        }
        // 大小校验
        if (file.size > maxSizeBytes) {
          toast.error(`${file.name} 超过 ${maxSizeMb}MB 限制`);
          continue;
        }
        const base64 = await fileToBase64(file);
        newWorks.push({
          id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
          imageUrl: base64,
          description: '',
        });
      }

      if (newWorks.length > 0) {
        onChange([...works, ...newWorks]);
        toast.success(`已添加 ${newWorks.length} 张图片`);
      }
    } catch {
      toast.error('图片上传失败，请重试');
    } finally {
      setUploading(false);
      // 清空 input，便于重复选择同一文件
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  /** 处理 input change */
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    void handleFiles(e.target.files);
  };

  /** 处理拖拽相关 */
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
  };
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    void handleFiles(e.dataTransfer.files);
  };

  /** 删除某张图片 */
  const handleRemove = (id: string) => {
    onChange(works.filter((w) => w.id !== id));
  };

  /** 更新某张图片描述 */
  const handleUpdateDescription = (id: string, description: string) => {
    onChange(works.map((w) => (w.id === id ? { ...w, description } : w)));
  };

  /** 放大查看的图片 */
  const previewWork = previewIndex !== null ? works[previewIndex] : null;

  return (
    <div className={cn('w-full', className)}>
      {/* 隐藏的文件输入 */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />

      {/* 上传区域 */}
      {remaining > 0 && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-lg border border-dashed cursor-pointer transition-colors',
            dragging
              ? 'border-white/40 bg-white/[0.04]'
              : 'border-border hover:border-border-strong hover:bg-base-elevated/50'
          )}
        >
          <ImagePlus
            className={cn(
              'w-6 h-6',
              uploading ? 'text-content-muted animate-pulse-soft' : 'text-content-subtle'
            )}
          />
          <p className="text-sm text-content-muted">
            {uploading ? '上传中...' : '点击或拖拽上传成品截图'}
          </p>
          <p className="text-xs text-content-faint">
            最多 {maxCount} 张，单张不超过 {maxSizeMb}MB
          </p>
        </div>
      )}

      {/* 已达上限提示 */}
      {remaining === 0 && works.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-base-elevated text-xs text-content-subtle">
          <AlertCircle className="w-3.5 h-3.5" />
          已达上限 {maxCount} 张
        </div>
      )}

      {/* 预览网格 */}
      {works.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
          {works.map((work, idx) => (
            <div
              key={work.id}
              className="group relative rounded-lg overflow-hidden border border-border bg-base-elevated"
            >
              {/* 图片预览 */}
              <div className="relative aspect-video overflow-hidden bg-base">
                {work.imageUrl ? (
                  <img
                    src={work.imageUrl}
                    alt={work.description || '成品截图'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-content-faint">
                    <ImagePlus className="w-6 h-6" />
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => setPreviewIndex(idx)}
                    className="p-1 rounded-md bg-black/60 text-white hover:bg-black/80 transition-colors"
                    aria-label="放大查看"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(work.id)}
                    className="p-1 rounded-md bg-black/60 text-white hover:bg-error/80 transition-colors"
                    aria-label="删除"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 描述输入 */}
              <div className="p-2">
                <Input
                  value={work.description}
                  onChange={(e) => handleUpdateDescription(work.id, e.target.value)}
                  placeholder="添加描述..."
                  className="text-xs"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 放大查看 Modal */}
      <Modal
        open={previewWork !== null}
        onClose={() => setPreviewIndex(null)}
        size="lg"
        title="成品预览"
      >
        {previewWork && (
          <div className="space-y-3">
            <div className="rounded-lg overflow-hidden bg-base">
              {previewWork.imageUrl ? (
                <img
                  src={previewWork.imageUrl}
                  alt={previewWork.description || '成品截图'}
                  className="w-full h-auto"
                />
              ) : (
                <div className="aspect-video flex items-center justify-center text-content-faint">
                  暂无图片
                </div>
              )}
            </div>
            {previewWork.description && (
              <p className="text-sm text-content-muted leading-relaxed">
                {previewWork.description}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

/** 导出默认限制常量，便于外部使用 */
export { MAX_COUNT as WORK_UPLOAD_MAX_COUNT, MAX_SIZE_MB as WORK_UPLOAD_MAX_SIZE_MB };