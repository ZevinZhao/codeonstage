# 「码上开演」网站重构 · 独立验证报告

- **任务 ID**：5（构建验证 + 功能验证，输出 VERDICT）
- **验证工程师**：何工(验证)
- **日期**：2026-10-21
- **验证场景**：new-feature（网站重构）
- **验证方法**：构建门禁（tsc/build）+ 静态代码审查 + esbuild 打包数据运行时统计 + 产物 bundle 文案/逻辑取证 + preview 服务器 HTTP 冒烟 + 对抗性边界/疑点扫描

---

## 一、构建门禁（必须项）

| 检查项 | 命令 | 结果 |
|---|---|---|
| TypeScript 类型检查 | `npx tsc --noEmit` | ✅ 退出码 0，零错误 |
| 生产构建 | `npm run build` | ✅ 成功（1652 模块，1.47s） |
| HTTP 冒烟 | `npx vite preview --port 4173` + curl | ✅ `/`、`/skills`、`/skills?primaryCategory=vibe` 均返回 200，HTML title/meta 含"码上开演" |

---

## 二、6 个需求点逐项验证

### 需求 1：网站改名 —— ✅ 通过（附 1 处低级残留，见问题清单 P1）

| 位置 | 证据 |
|---|---|
| index.html title | `<title>码上开演 · AI 编码视频 Skill 大全</title>`（index.html:9） |
| index.html meta | description 含"码上开演 · 收录各种 AI 通过编码来制作视频的 Skill 合集网站"（index.html:7） |
| Header | 桌面品牌名"码上开演"（Header.tsx:84）+ 移动抽屉品牌名"码上开演"（Header.tsx:178） |
| Footer | "码上开演 · AI 编码视频 Skill 大全"（Footer.tsx:15） |
| HomePage Hero | 主标题拆分渲染 "码上"+"开演"（HomePage.tsx:247-248），bundle 中同时取证到完整字符串"码上开演 · AI 编码视频 Skill 大全"与拆分 span |

**旧名残留审查**（grep 全库）：
- 合法保留（分类语境）：constants.ts:30 `vibe: 'Vibe 知识大赏'`（一级分类名）、SkillFilter/CategoryNav/HomePage 中的分类提示语、vibe 存量 119 条数据的描述文案（内容语境）——均属需求允许的分类/内容语境。
- dist bundle 中 "Vibe 知识大赏" 的全部 5 处上下文经逐条核对均为分类标签文案与 vibe 大类数据描述，无品牌/标题语境。
- ❌ 残留（品牌语境）：package.json:6 `"description": "vibe知识大赏 · Skill大全网站"`（及 name: "vibe-skills-hub"）。不在需求列举的四个 UI 位置、不影响运行时 UI，但按需求 1 自身定义（"品牌语境的旧名才算残留"）构成残留 → 问题 P1。

### 需求 2：新分类体系 —— ✅ 通过

- **9 个一级大类**：`types/index.ts` PrimaryCategory 与 `constants.ts` ALL_PRIMARY_CATEGORIES 完全一致：vibe / promo / education / motion-design / narrative-mv / game-interactive / post-production / general-video / uncategorized ✅
- **Vibe 二级 6 个**：principle-demo / cognition-fable / data-viz / history-evolution / comprehensive / pending ✅
- **8 个独立标签维度**：forms / visualStyles / functions / soundForms / inputMethods / technologies / platforms / models（TAG_DIMENSIONS_META）✅
- **数据总量**（esbuild 打包 src/data/index.ts 后 node 运行时统计）：**800 条 = vibe 119 + 新数据 681，精确匹配** ✅
- 数据完整性：id 唯一 800/800；必填字段缺失 0；非法标签值 0；8 维度无缺失；非 vibe 大类携带 vibeSubcategory = 0；vibe 二级分布 {comprehensive:75, principle-demo:15, cognition-fable:4, pending:25}（合计 119）✅

### 需求 3：表格数据导入 —— ✅ 通过（682→681 差异见观察项 O1）

- **条数**：opus 导入 681 条（promo 72 / education 89 / motion-design 67 / narrative-mv 42 / game-interactive 1 / post-production 47 / general-video 340 / uncategorized 23，合计 681）✅
- **无 X 帖子混入（核心验收点）**：三层验证——① grep `src/data/opus/` 全目录 x.com/twitter.com/t.co = **0 处**；② 运行时扫描 681 条 opus 数据的 sourceUrl/demoMedia/installCommand/usageExample/configContent = **0 条 X 链接**；③ 中间数据 scripts/output/intermediate.json 显示 `skippedXPosts: 426`（X 帖子在解析阶段即被跳过）✅
- **GitHub 资源占比**：opus 中 663/681 为 github.com 链接，其余 18 条为教程文章外部来源（jishuzhan/抖音/skillget 等），均非 X 帖子 ✅
- **分类分布合理性**：uncategorized 仅 23 条（3.4%），game-interactive 1 条与源索引一致（category-stats.json 中即为 1）；随机抽查 30+ 条分类判定未见明显错分 ✅
- 观察项 O1：需求表述"682 条"，实际落库 681 条（689 中间数据 − 7 组内部重复 = 682，再与 vibe 存量跨数据去重剔除 1 条 = 681）。与需求 2 的"800 = 119 + 681"精确自洽，属合理实现口径差异。

### 需求 4：筛选体系 —— ✅ 通过

- **首屏四项**（constants.ts FIRST_SCREEN_FILTER_DIMENSIONS + CategoryNav）：`primaryCategory`（大类，CategoryNav 横排导航承担）+ `forms`（资源形态）+ `visualStyles`（画风）+ `functions`（制作功能）✅
- **更多筛选折叠面板**（MORE_FILTER_DIMENSIONS + SkillFilter.tsx 折叠动画面板）：
  - Vibe 二级：仅在 `filter.primaryCategory === 'vibe'` 时渲染（SkillFilter.tsx:385），标签明示"（仅 Vibe 知识大赏大类）" ✅
  - 声音形式 / 输入方式 / 实现技术 / 使用平台 / 模型：MORE_TAG_DIMENSIONS 五个维度 ✅
  - 额外含难度/语言两行（超出需求的增强项，不构成违规）
- bundle 产物文案取证："更多筛选"/"Vibe 细分"/"资源形态"/"画风"/"制作功能"/"声音形式"/"输入方式"/"实现技术"/"使用平台"/"模型"全部命中 ✅
- 联动防残留：列表页 `handleCategorySelect` 切到非 vibe 大类时自动清空 vibeSubcategory（SkillListPage.tsx:171-176），避免残留二级筛选导致空结果 ✅

### 需求 5：分页 —— ✅ 通过

- **列表页**：`PAGE_SIZE = 24`（SkillListPage.tsx:34），`pagedSkills = filteredSkills.slice(0, page * PAGE_SIZE)`（渐进渲染，800 条不一次性渲染 DOM）；"加载更多"按钮 `page < totalPages` 时显示，点击 page+1 追加 24 张；显示 `（已加载/总数）` 计数 ✅
- **首页**：`HOME_SHOW_COUNT = 12`（HomePage.tsx:62），bundle 取证 `ga=12`、`S=p.slice(0,ga)`（压缩器将常量提取为 ga）；"探索全部 N 个资源"按钮跳转 `/skills`（携带已选大类参数延续浏览）✅
- **边界对抗性检查**（均通过）：
  - 空结果 → EmptyState + "清除所有筛选"按钮
  - 筛选/搜索/URL 参数变化 → setPage(1) 归零（三重保障）
  - 结果数恰为 24 倍数 → 加载按钮消失且不误显"已展示全部"（`length > PAGE_SIZE` 条件正确）
  - totalPages = ceil(800/24) = 34，加载到底显示"已展示全部 800 个结果"

### 需求 6：视频优先展示规则 —— ✅ 通过

- **排序**：HomePage sortedSkills——`(demoMedia?.length ?? 0) > 0` 优先（有媒体=1 排前），其次 stars 降序（HomePage.tsx:99-108）✅
- **"仅看有视频"开关**：`onlyWithMedia` 状态 + toggle 按钮保留（HomePage.tsx:83, 122-124, 439-451），bundle 文案"仅看有视频"命中 ✅
- **MediaPreview 未被破坏**：`getMediaType` 判定 `.mp4/.webm/.mov → <video>`（muted/loop/playsInline/autoPlay 受控），其余 gif/png/jpg/webp/svg → `<img>`（loading="lazy"）（MediaPreview.tsx:34-40, 89-115）✅
- **卡片消费链路**：SkillCard `hasMedia` 条件渲染 MediaPreview（grid 大图 + list 缩略图 h-20），详情页同样渲染 ✅
- 数据侧：demoMedia>0 共 3 条（4 个 mp4 + 3 个 gif），排序时位于全列表最前 ✅

---

## 三、对抗性检查记录（验证报告强制项）

1. **疑点扫描（强信号词 × 分类交叉）**：扫描 681 条新数据的名称/描述与期望分类的冲突，发现 5 条"音乐/MV 信号 → education"疑点。逐条核对：均为教程/拆解/教学语境（如"动画 MV 保姆级详细拆解"教程文章、Vox 风格解释性视频），符合生成脚本声明的"说明优先于名称"分类规则（用户分类规则第 4 条），**不构成明显错分**。
2. **数据污染检查**：SkillListPage 的 `result.sort()` 作用于 `[...skills]` 拷贝（第 74 行），HomePage 同样 `[...skills].sort()`——排序不污染全局 skills 数组 ✅。
3. **孤儿筛选检查**：vibeSubcategory 仅能在 vibe 大类面板中设置，切换大类自动清空，URL 不携带二级参数——无孤儿筛选态 ✅。
4. **搜索边界**：空关键词返回原数组；搜索范围 name/description/author/结构化标签摊平文本；防抖 300ms 且卸载时清理定时器 ✅。
5. **t.co 链接追查**：全库扫描发现 1 条 `https://t.co/2fdCRrmSHN`（id: heychengc-vibe-knowledge-film-article）。溯源确认其位于存量 skills.ts:747（旧站 vibe 数据，非本次导入）；本次导入的 681 条 opus 数据 X 链接为 0。列为观察项 O2。
6. **分页边界**（见需求 5）：空/整页倍数/加载到底三边界均正确。
7. **构建产物取证**：不满足于源码阅读，对 dist bundle 做了字符串与压缩代码取证（"码上开演"3 处完整 + Hero 拆分 span、`ga=12`、`slice(0,S*et)`、十项筛选文案逐一命中）。

---

## 四、发现的问题清单（按严重程度排序）

| # | 严重度 | 问题 | 位置 | 影响范围 |
|---|---|---|---|---|
| P1 | 低 | package.json 的 `description: "vibe知识大赏 · Skill大全网站"`（name: "vibe-skills-hub"）为品牌语境旧名残留，未随改名更新 | package.json:2,6 | 不进入用户可见 UI；但按需求 1"品牌语境旧名算残留"的定义构成残留 |
| O1 | 观察 | 需求 3 表述"682 条已导入"，实际落库 681 条（跨数据去重剔除 1 条重复，保留标签更完整的存量版本） | src/data/opus/index.ts | 与需求 2"800 = 119 + 681"精确自洽，属口径差异，非缺陷 |
| O2 | 观察 | 全库存在 1 条 t.co（Twitter 短链）sourceUrl | src/data/skills.ts:747（存量 vibe 数据） | 旧站历史遗留，非本次导入引入；本次导入数据 0 条 X 链接 |
| O3 | 观察 | Vibe 二级分类中 data-viz、history-evolution 两个取值无数据（分布集中于 comprehensive 75 / pending 25） | 数据分布 | 类型定义合法、UI 对零计数取值自动隐藏，非缺陷 |

**核心需求达成情况：6/6 通过。** 无任何核心需求点失败；P1 为唯一的可操作改进项（1 行元数据修改），不影响任何功能。

---

## 五、结论

- **执行流程**：构建门禁（tsc 零错误 + build 成功）→ 静态代码审查（6 需求点逐文件核对）→ 数据运行时统计（esbuild 打包 + node 独立脚本）→ 产物 bundle 取证 → preview 服务器 HTTP 冒烟 → 对抗性边界/疑点扫描。
- **验证方法**：对需求点采用 Oracle 检查（期望值精确比对：800 条、119+681、9 大类、6 二级、8 维度、24/页、12/张、mp4→video/gif→img）；对回归风险采用一致性检查（MediaPreview 逻辑、仅看有视频开关、bundle 文案逐一取证）。
- **最终判定**：6 个核心需求全部落地且证据充分；发现 1 处不影响核心功能的品牌元数据残留（P1）及 3 项观察项。按"发现小问题但不影响核心需求 → PARTIAL"的判定规则：

## VERDICT: PARTIAL

（核心功能 6/6 达成、构建零错误、数据精确匹配；扣分项仅为 package.json 旧品牌元数据残留 P1，修复后可直接转 PASS）

---

## 附：验证证据命令（可复现）

```bash
npx tsc --noEmit                          # 零错误
npm run build                             # 构建成功
npx esbuild src/data/index.ts --bundle --format=esm --outfile=/tmp/verify-data.mjs --alias:@=./src --platform=node
node /tmp/verify-data-check.mjs           # 800 条统计、大类分布、X 链接=0、id 唯一性等
grep -rn "t\.co\|x\.com\|twitter\.com" src/data/opus/   # 0 处
npx vite preview --port 4173 & curl -s http://localhost:4173/  # title 含"码上开演"
grep -o "码上开演\|仅看有视频\|加载更多\|探索全部\|更多筛选" dist/assets/index-*.js | sort | uniq -c
```