# Apple Design System - 快速开始 🍎

## ✅ 已完成的优化

### 1. **设计系统基础** (`ui/src/ui/styles/apple-design-system.css`)
- ✅ 精确的 Apple 颜色系统
- ✅ 真实的玻璃效果 (glass/vibrancy)
- ✅ 柔和的多层阴影
- ✅ Apple 的 easing 曲线
- ✅ 完整的暗黑模式支持
- ✅ 无障碍动画设置 (prefers-reduced-motion)

### 2. **组件库** (`ui/src/ui/styles/apple-components.css`)
- ✅ 按钮 (.btn-apple)
- ✅ 卡片 (.card-apple, .card-glass)
- ✅ 输入框 (.input-apple)
- ✅ 聊天气泡 (.message-bubble)
- ✅ 头像 (.avatar-apple)
- ✅ Badge (.badge-apple)
- ✅ Switch (.switch-apple)
- ✅ 加载动画 (.spinner-apple)
- ✅ 侧边栏导航 (.sidebar-nav-item)

### 3. **对话列表优化** (`ui/src/ui/views/chat.ts`)
- ✅ Apple 风格的 hover 效果（右移 2px）
- ✅ Active 状态的左侧蓝色强调线
- ✅ 按下效果 (scale 0.98)
- ✅ 新对话按钮的圆角和 hover 阴影

---

## 🎯 关键改进点

### 颜色对比

| 元素 | 之前 | 现在 | 原因 |
|------|------|------|------|
| 背景色 | `#F5F5F7` | `#F5F5F7` | ✅ 保持（正确） |
| 玻璃 opacity | `0.72` | `0.8` | 提高可读性 |
| 玻璃 blur | `blur(20px)` | `saturate(180%) blur(20px)` | 增强饱和度 |
| 文字灰色 | `#86868B` | `#6E6E73` (secondary) | 更精确的层次 |
| 阴影 | 单层 | 双层叠加 | 更柔和真实 |

### 动画参数

| 属性 | 之前 | 现在 | 提升 |
|------|------|------|------|
| 过渡时长 | 200ms / 350ms | 150ms / 250ms | 更快响应 |
| Easing | `ease-out` | `cubic-bezier(0.25, 0.1, 0.25, 1)` | Apple 精确曲线 |
| Hover scale | 无 | `scale(1.01)` | 微妙反馈 |
| Active scale | 无 | `scale(0.98)` | 按下效果 |

### 圆角更新

| 用途 | 之前 | 现在 | 更 Apple |
|------|------|------|----------|
| 按钮 | `8px` | `9999px` (pill) | ✅ |
| 卡片 | `12px` | `14-18px` | ✅ |
| 输入框 | `12px` | `10px` | ✅ |
| 对话气泡 | `16px` | `14px` | ✅ |

---

## 🚀 使用方法

### 1. 使用新的按钮样式

```html
<!-- ❌ 旧写法 -->
<button class="btn btn-primary">提交</button>

<!-- ✅ 新写法 -->
<button class="btn-apple btn-primary">提交</button>
```

**可用变体：**
- `btn-primary` - 蓝色主按钮
- `btn-secondary` - 灰色次要按钮
- `btn-tertiary` - 透明最小化按钮
- `btn-danger` - 红色危险按钮

**尺寸修饰：**
- `btn-sm` - 小按钮
- `btn-lg` - 大按钮

### 2. 使用新的卡片样式

```html
<!-- ❌ 旧写法 -->
<div class="card">内容</div>

<!-- ✅ 新写法（普通卡片） -->
<div class="card-apple">内容</div>

<!-- ✅ 新写法（玻璃效果卡片） -->
<div class="card-glass">内容</div>
```

### 3. 使用新的输入框样式

```html
<!-- ❌ 旧写法 -->
<input class="input" placeholder="请输入...">

<!-- ✅ 新写法 -->
<input class="input-apple" placeholder="请输入...">

<!-- ✅ 错误状态 -->
<input class="input-apple error" placeholder="请输入...">
```

### 4. 使用聊天气泡

```html
<!-- 用户消息 -->
<div class="message-bubble user">你好！</div>

<!-- 助手消息 -->
<div class="message-bubble assistant">你好，有什么可以帮你的吗？</div>
```

### 5. 使用 Badge

```html
<span class="badge-apple badge-success">成功</span>
<span class="badge-apple badge-error">错误</span>
<span class="badge-apple badge-warning">警告</span>
<span class="badge-apple badge-info">提示</span>
```

### 6. 使用 Switch (Toggle)

```html
<label class="switch-apple">
  <input type="checkbox" checked>
  <span class="switch-slider"></span>
</label>
```

### 7. 使用加载动画

```html
<div class="spinner-apple"></div>
```

---

## 🎨 CSS 变量快速参考

### 颜色

```css
/* 背景 */
var(--color-bg-primary)    /* 纯白 #FFFFFF */
var(--color-bg-secondary)  /* 灰白 #F5F5F7 */
var(--color-bg-tertiary)   /* 灰色 #E8E8ED */

/* 文字 */
var(--color-text-primary)    /* 近黑 #1D1D1F */
var(--color-text-secondary)  /* 灰色 #6E6E73 */
var(--color-text-tertiary)   /* 浅灰 #86868B */

/* 系统颜色 */
var(--color-blue)    /* #007AFF */
var(--color-green)   /* #34C759 */
var(--color-red)     /* #FF3B30 */
var(--color-orange)  /* #FF9500 */
```

### 间距

```css
var(--space-1)   /* 4px */
var(--space-2)   /* 8px */
var(--space-3)   /* 12px */
var(--space-4)   /* 16px */
var(--space-6)   /* 24px */
var(--space-8)   /* 32px */
var(--space-12)  /* 48px */
```

### 圆角

```css
var(--radius-xs)    /* 4px */
var(--radius-sm)    /* 6px */
var(--radius-md)    /* 10px */
var(--radius-lg)    /* 14px */
var(--radius-xl)    /* 18px */
var(--radius-2xl)   /* 24px */
var(--radius-full)  /* 9999px */
```

### 阴影

```css
var(--shadow-sm)  /* 微小阴影 */
var(--shadow-md)  /* 中等阴影 */
var(--shadow-lg)  /* 大阴影 */
var(--shadow-xl)  /* 超大阴影 */
```

### 动画

```css
var(--duration-fast)    /* 150ms */
var(--duration-normal)  /* 250ms */
var(--duration-slow)    /* 350ms */

var(--ease-out)     /* cubic-bezier(0.25, 0.1, 0.25, 1) */
var(--ease-in)      /* cubic-bezier(0.42, 0, 1, 1) */
var(--ease-smooth)  /* cubic-bezier(0.16, 1, 0.3, 1) */
```

---

## 📱 响应式要点

所有组件已针对以下断点优化：

- **375px** - iPhone SE (最小支持)
- **768px** - iPad 竖屏
- **1024px** - iPad 横屏 / 小桌面
- **1440px+** - 大桌面

---

## ♿️ 无障碍支持

自动包含：

1. **Focus 可见性** - 蓝色外轮廓 (focus-visible)
2. **Reduced Motion** - 自动禁用动画 (@prefers-reduced-motion)
3. **颜色对比度** - 所有文字 ≥ 4.5:1
4. **键盘导航** - Tab 顺序正确

---

## 🌓 暗黑模式

自动支持系统暗黑模式：

```css
@media (prefers-color-scheme: dark) {
  /* 自动切换所有颜色变量 */
}
```

暗黑模式下的变化：
- 背景：纯黑 `#000000`
- 玻璃：深灰半透明
- 文字：白色到灰色
- 阴影：更深更强

---

## ⚡️ 性能优化

所有动画使用 GPU 加速属性：

✅ **允许使用：**
- `transform`
- `opacity`

❌ **避免使用：**
- `width`, `height` (会触发 reflow)
- `top`, `left`, `right`, `bottom` (会触发 reflow)

---

## 🔍 调试技巧

### 1. 检查颜色是否正确

在浏览器 DevTools 中：

```css
background: var(--color-bg-secondary); /* 应该是 #F5F5F7 */
```

### 2. 检查阴影是否柔和

```css
box-shadow: var(--shadow-md);
/* 应该是双层：0 2px 8px ..., 0 4px 16px ... */
```

### 3. 检查动画是否流畅

```css
transition: all var(--duration-fast) var(--ease-out);
/* 应该是 150ms + cubic-bezier */
```

---

## 🎁 额外功能

### 玻璃效果 Card

```html
<div class="card-glass">
  <h2>标题</h2>
  <p>内容</p>
</div>
```

特点：
- 半透明背景
- 背景模糊 + 饱和度增强
- 适用于叠加层、模态框

### 渐变头像

```html
<div class="avatar-apple gradient">
  F
</div>
```

---

## 📚 下一步

1. **更新现有组件** - 逐步将旧 class 替换为新 class
2. **测试暗黑模式** - 在系统设置中切换测试
3. **优化响应式** - 在不同设备上测试
4. **完善无障碍** - 使用键盘导航测试

---

## 🆘 常见问题

**Q: 样式没有生效？**
A: 确保已导入 CSS：
```typescript
import './ui/styles/apple-design-system.css';
import './ui/styles/apple-components.css';
```

**Q: 暗黑模式不工作？**
A: 在系统设置中启用暗黑模式，或在浏览器 DevTools 中模拟：
DevTools → Rendering → Emulate CSS media feature prefers-color-scheme: dark

**Q: 动画太快/太慢？**
A: 调整 CSS 变量：
```css
--duration-fast: 150ms;  /* 改为 200ms 更慢 */
```

---

**准备好体验真正的 Apple 美学了吗？🍎✨**

运行 `npm run feishupilot gateway run` 查看效果！
