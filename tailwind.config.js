/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  // 触摸设备上自动禁用 hover: 变体（emil-design-eng：触摸设备 tap 会触发假 hover）
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      // 深色主题配色（参考 Linear/Vercel 视觉风格）
      colors: {
        // 背景层级
        base: {
          DEFAULT: '#0a0a0a',
          surface: '#111111',
          card: '#1a1a1a',
          elevated: '#1e1e1e',
        },
        // 边框层级：半透明（emil-design-eng：半透明边缘比实线更高级）
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.10)',
          strong: 'rgba(255, 255, 255, 0.16)',
          subtle: 'rgba(255, 255, 255, 0.06)',
        },
        // 文字层级
        content: {
          DEFAULT: '#fafafa',
          muted: '#a3a3a3',
          subtle: '#737373',
          faint: '#525252',
        },
        // 主色调：渐变蓝紫 indigo → violet
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        violet: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        // 强调色：偏暖琥珀（主按钮 / 选中项 / 关键提示）
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // 语义色
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
      // 字体栈：中文优先 + 系统字体
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          '"Helvetica Neue"',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: [
          '"SF Mono"',
          '"Fira Code"',
          '"Fira Mono"',
          'Menlo',
          'Consolas',
          '"Liberation Mono"',
          'monospace',
        ],
        // 放映厅品牌字标 / 作品大标题：中文衬线优先
        display: [
          '"Songti SC"',
          '"Noto Serif SC"',
          '"STSong"',
          '"SimSun"',
          'Georgia',
          'serif',
        ],
      },
      // 圆角
      borderRadius: {
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
      },
      // 缓动曲线（emil-design-eng 规范：内置 ease 太弱，必须自定义曲线）
      transitionTimingFunction: {
        // 强 ease-out：进入动画（入场即动，感觉响应迅速）
        'out-strong': 'cubic-bezier(0.23, 1, 0.32, 1)',
        // 强 ease-in-out：屏幕内移动
        'in-out-strong': 'cubic-bezier(0.77, 0, 0.175, 1)',
        // iOS 抽屉曲线（Ionic Framework）
        drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      // 动画时长 token（emil-design-eng：UI 动画 <300ms）
      transitionDuration: {
        '120': '120ms', // 按压反馈下限
        '160': '160ms', // 按压反馈上限
      },
      // 动画与关键帧
      animation: {
        'fade-in': 'fade-in 0.2s cubic-bezier(0.23, 1, 0.32, 1)',
        'fade-out': 'fade-out 0.15s cubic-bezier(0.23, 1, 0.32, 1)',
        'slide-up': 'slide-up 0.25s cubic-bezier(0.23, 1, 0.32, 1)',
        'slide-down': 'slide-down 0.25s cubic-bezier(0.23, 1, 0.32, 1)',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.23, 1, 0.32, 1)',
        'spin-slow': 'spin 2s linear infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'gradient-x': 'gradient-x 6s ease infinite',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'gradient-x': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
      },
      // 阴影（分层阴影：近影提供轮廓、远影提供深度）
      boxShadow: {
        glow: '0 0 20px rgba(99, 102, 241, 0.3)',
        'glow-violet': '0 0 20px rgba(139, 92, 246, 0.3)',
        card: '0 1px 2px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.02)',
        'card-hover':
          '0 2px 6px rgba(0, 0, 0, 0.35), 0 12px 32px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.04)',
      },
      // 背景渐变
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        'gradient-brand-subtle': 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.1) 100%)',
      },
    },
  },
  plugins: [],
};