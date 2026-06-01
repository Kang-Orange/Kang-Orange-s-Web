# CropModal 裁剪 GUI — cropperjs v2 深度分析

> 本文档记录 `CropModal.vue` 使用 cropperjs v2.1.1 的设计过程、遇到的所有问题及根因。
> **用途**：后续修改此组件或相关裁剪逻辑时，无需重新通读 cropperjs 源码。

---

## 1. 架构设计

```
composables/useCoverConfig.ts   ← 统一定义 aspectRatio / maxWidth / quality
       │
       ├── CropModal.vue         ← 裁剪 UI，锁定比例，压缩输出
       │     └── 内部使用 cropperjs v2.1.1 (Web Components)
       │
       ├── CoverImage.vue        ← 显示端读取 aspectRatio 设容器比例
       ├── pages/vn/[id].vue     ← 同上
       └── pages/admin/*.vue     ← 同上
```

**关键原则**：修改 `useCoverConfig.ts` 一个文件，裁剪端和所有显示端自动同步。

---

## 2. cropperjs v2 核心架构

### 2.1 版本差异（v1 → v2）

v2 是一次完全重写，API 不兼容 v1：

| 项目 | v1 | v2 |
|------|----|----|
| 渲染方式 | 纯 DOM + CSS class | Web Components (Custom Elements + Shadow DOM) |
| CSS | 内置 `cropper.css`，可通过 class 覆盖 | **无内置 CSS**，全部通过 Shadow DOM `:host` 样式 |
| 构造参数 | `new Cropper(el, { aspectRatio, viewMode, ... })` | `new Cropper(el, { container?, template? })` — 仅两个配置项 |
| 行为属性 | 构造函数选项 | 通过 getter 获取子元素实例后设置属性 |
| 方法 | `zoom()`, `getCroppedCanvas()` | `$zoom()`, `$toCanvas()` (async, 返回 Promise) |
| 类型定义 | `@types/cropperjs` | 内置 TypeScript 类型 |

### 2.2 自定义元素层级

```
Cropper (控制器类)
 └── <cropper-canvas>          ← CropperCanvas extends CropperElement
       └── #shadow-root (open)
             ├── <cropper-image>      ← CropperImage — 图片
             ├── <cropper-shade>      ← CropperShade — 裁剪框外暗色遮罩
             ├── <cropper-handle>     ← CropperHandle — 交互手柄 (move/select/resize/...)
             └── <cropper-selection>  ← CropperSelection — 裁剪框
                   └── #shadow-root
                         ├── <cropper-grid>
                         ├── <cropper-crosshair>
                         └── <cropper-handle> × N  ← 框内手柄
```

**关键事实**：
- 模板定义在 `<cropper-canvas>` 的 **Shadow DOM** 内，不能跨边界用外部 CSS 样式
- Shadow root mode = `'open'`（源码第 344 行），可访问 `.shadowRoot`
- `CropperCanvas.$action` 是驱动所有交互的状态机核心（第 587 行，默认 `ACTION_NONE`）

### 2.3 事件系统

Cropper 派发的事件使用 `dispatchEvent(new CustomEvent(...))`，默认属性：

```js
// 源码第 186 行
const defaultEventOptions = {
    bubbles: true,
    cancelable: true,
    // composed: unset → 默认 false
}
```

| 事件 | 派发位置 | composed | 用途 |
|------|---------|----------|------|
| `change` | CropperSelection (shadow DOM 内) | **false** | 裁剪框位置/大小变更前通知 |
| `actionstart` | CropperCanvas (light DOM) | false | 交互开始 |
| `actionmove` | CropperCanvas (light DOM) | false | 交互进行中 |
| `actionend` | CropperCanvas (light DOM) | false | 交互结束（鼠标释放） |

**关键事实**：
- `change` 事件的 `composed: false` 意味着它**不穿越 Shadow DOM 边界**，必须在 shadow root 上监听
- `actionend` 事件在 CropperCanvas host 元素上派发，在 light DOM 可直接监听
- `change` 事件**可以被 `preventDefault()` 阻止**（源码 2478-2485 行）——阻止后 `$change` 返回 early，位置不变

### 2.4 action 确定机制

每次 pointerdown，CropperCanvas 的 `$handlePointerDown` 通过被点击元素的 `action` 属性确定本次交互的类型：

```js
// 源码第 704-705 行
action = event.target.action || event.target.getAttribute('action') || '';
```

如果点击的目标元素没有 `action` 属性 → `action = ''` → 所有 handler 忽略此次交互。

这就是为什么需要一个 canvas 级别的 `<cropper-handle action="move" plain>` —— 它让框外空白区域的点击获得 `action = 'move'`，从而触发 CropperImage 的图片平移逻辑。

---

## 3. 默认模板 vs 自定义模板

### 默认模板（源码 2876-2893 行）

```html
<cropper-canvas background>
  <cropper-image rotatable scalable skewable translatable></cropper-image>
  <cropper-shade hidden></cropper-shade>
  <cropper-handle action="select" plain></cropper-handle>   ← 覆盖整个 canvas
  <cropper-selection initial-coverage="0.5" movable resizable>
    <cropper-grid role="grid" bordered covered></cropper-grid>
    <cropper-crosshair centered></cropper-crosshair>
    <cropper-handle action="move" theme-color="rgba(255, 255, 255, 0.35)"></cropper-handle>
    <cropper-handle action="n-resize"></cropper-handle>
    <!-- ...8 个 resize handles... -->
  </cropper-selection>
</cropper-canvas>
```

**问题**：`<cropper-handle action="select" plain>` 覆盖整个 canvas。当用户点击框外拖拽时，action = `'select'` → CropperSelection 进入 `ACTION_SELECT` 分支 → 把裁剪框重置到新的拖拽区域（源码 2067-2102 行）。

### 自定义模板（我们的）

```html
<cropper-canvas>
  <cropper-image rotatable scalable translatable></cropper-image>
  <cropper-shade hidden></cropper-shade>
  <cropper-handle action="move" plain></cropper-handle>     ← 代替 select，覆盖 canvas
  <cropper-selection initial-coverage="0.8" movable resizable>
    <!-- ...无 select handle... -->
    <cropper-handle action="move" theme-color="..."></cropper-handle>  ← 框内移动
    <!-- ...8 个 resize handles... -->
  </cropper-selection>
</cropper-canvas>
```

**改动逻辑**：
- 去掉了 `action="select"` → 框外拖拽不会重置裁剪框
- 加上 canvas 级 `action="move" plain` → 框外拖拽时 action = `'move'` → `CropperImage.$handleAction` 的 `ACTION_MOVE` 分支处理 → 因为 `$selection.contains($actionStartTarget)` 为 false → 图片平移（源码 1188-1203 行）
- 保留了 selection 内部的 `action="move"` → 框内拖拽时 z-order 高的内部 handle 覆盖 canvas 级 handle → `$selection.contains(...)` 为 true → 框移动（源码 2104-2109 行）
- 去掉了 `skewable`（斜切）和 `rotatable`（旋转），只保留 scalabel + translatable

---

## 4. 遇到的问题与解决方法

### 问题 1：缩放按钮无效

**现象**：点击 +/- 按钮无反应。

**根因**：`$zoom()` 方法定义在 `CropperImage` 上（源码 1446 行），**不在 `CropperCanvas` 上**。代码错误地写了：
```ts
cropperCanvas?.$zoom(0.25)  // ❌ CropperCanvas 没有此方法
```

**解决**：改为 `cropperImage?.$zoom(0.25)`

**源码佐证**：`CropperCanvas`（577-727 行）无 `$zoom` 定义。`$zoom` 在 `CropperImage`（1446-1477 行）和 `CropperSelection`（2412 行）上。

---

### 问题 2：点击框外创建新裁剪框

**现象**：在裁剪框外点击拖拽，会重置裁剪框到新的拖拽区域。

**根因**：默认模板包含 `<cropper-handle action="select" plain>`，其 CSS `:host([action=select])` 是 100% × 100% 覆盖整个 canvas。点击框外 → action = `'select'` → CropperSelection 的 `ACTION_SELECT` 分支调用 `$change()` 重置裁剪框位置/大小。

**解决**：自定义模板去掉 `action="select"` handle，替换为 `action="move" plain`（见上节模板对比）。

**源码佐证**：
- action 确定：第 704-705 行
- `ACTION_SELECT` 处理：第 2067-2102 行
- Handle CSS（move/select 都 100%）：第 1737 行

---

### 问题 3：图片只显示在上方一细条

**现象**：裁剪区域中图片极小，只在顶部显示窄窄一条。

**根因**：图片加载时 `$handleLoad` 调用 `$center('contain')`（源码 1163 行），`$center` 通过 `parentElement.getBoundingClientRect()` 获取 canvas 尺寸。**如果 canvas 刚插入 DOM 还未完成 CSS 布局**，`getBoundingClientRect()` 返回 Shadow DOM `:host` 定义的 `min-width: 200px; min-height: 100px`（源码 575 行），导致图片被缩放到 200×100 的极小尺寸。

**解决**：在 `onMounted` 里用 `nextTick(() => cropperImage?.$center('contain'))` 延迟重新居中，此时 canvas 已完成布局。

**源码佐证**：
- `$handleLoad`：第 1156-1165 行
- `$center`：第 1329-1369 行
- Canvas `:host` 样式（含 min-width/min-height）：第 575 行

---

### 问题 4：裁剪框可超出图片边界

**现象**：拖拽裁剪框或平移图片后，裁剪框可能超出图片范围，留下黑色空白区。

**根因**：cropperjs v2 **没有内置的 boundary/clamp 机制**。相比 v1 的 `viewMode` 选项，v2 完全没有约束裁剪框位置的功能。

**解决**：实现了双重约束机制，利用两个事件通道互补：

#### 通道 A：`change` 事件（实时约束，防闪烁）

```
用户拖拽 → $handleAction → $move → $change(newX, newY, ...)
    ↓
$change 触发 change 事件（在 shadow DOM 内）  ← 此时属性尚未更新！
    ↓
handleSelectionChange 读取 event.detail 中的【提议新值】
    ↓
computeClamped(proposed) 判断是否越界
    ↓  越界 → event.preventDefault() 拒绝本次变更
    ↓       → setTimeout(0) 延迟写入 clamp 值
    ↓         （绕过 $changing 防重入标志，源码 2449 行）
    ↓  未越界 → 不做任何事，让原始变更正常生效
```

#### 通道 B：`actionend` 事件（图片平移后修正）

```
用户框外拖拽平移图片 → CropperImage 变换矩阵更新 → 鼠标释放
    ↓
Canvas 派发 actionend 事件（light DOM，可直接监听）
    ↓
handleActionEnd → computeClamped() 读取当前值
    ↓  越界 → $change(clamped) 修正
    ↓  未越界 → 不做任何事
```

**为什么需要两个通道**：
- `change` 在**裁剪框**移动时触发，但**图片平移**不触发它
- `actionend` 在**任何交互**结束后触发，但只在释放鼠标时执行
- 两者互补：change 负责拖框时的实时约束（无闪烁），actionend 负责拖图后再检查

**关键实现细节**：
- `change` 事件必须用 `event.detail` 中的值（不是 `cropperSelection.x`），因为 `$change` 先发事件再更新属性（源码 2478-2490 行：emit → return | write）
- `$changing` 标志（源码 2449 行）阻止在 change handler 内同步调用 `$change`，必须用 `setTimeout(0)` 延迟
- change 事件的 `composed: false` 意味着必须在 `canvas.shadowRoot` 上监听，不能在 host 元素上

---

## 5. 关键源码行号索引

| 内容 | 行号 | 说明 |
|------|------|------|
| CropperElement 基类 | 349 | 所有自定义元素的父类 |
| shadowRootMode = 'open' | 344, 356 | 可通过 `.shadowRoot` 访问 |
| CropperCanvas 类 | 577-727 | $action 状态机, $handlePointerDown/Move/Up, $handleWheel |
| CropperCanvas :host 样式 | 575 | min-height:100px; min-width:200px |
| $handlePointerDown | 669-716 | 确定 action = target.action \|\| '' |
| $handleWheel (滚轮缩放) | 912-935 | 使用 scaleStep，emit ACTION_SCALE |
| CropperImage 类 | 1035-1552 | $center, $zoom, $move, $scale, $handleAction |
| $center | 1329-1369 | 用 getBoundingClientRect 获取 canvas 尺寸 |
| $zoom (image) | 1446-1477 | **在此类上，不在 Canvas 上** |
| $handleAction (image) | 1167-1271 | ACTION_MOVE 时判断是否平移图片 |
| CropperSelection 类 | 1763-2525 | $change, $move, $resize, $handleAction |
| $change (selection) | 2448-2493 | **先 emit change 再写属性**；$changing 防重入 |
| $handleAction (selection) | 2037-2119 | ACTION_SELECT 重置裁剪框；ACTION_MOVE 移动框 |
| ACTION_SELECT 分支 | 2067-2102 | 拖拽创建新裁剪区域 |
| ACTION_MOVE 分支 (image) | 1188-1203 | dynamic 属性控制框内拖拽行为 |
| ACTION_MOVE 分支 (selection) | 2104-2109 | 框移动 |
| CropperHandle 类 | 1739-1759 | action 属性, CSS (move/select = 100%×100%) |
| CropperShade 类 | 1604-1735 | 暗色遮罩，跟随 selection |
| Cropper 构造器 | 2908-2981 | 仅接受 container + template 选项 |
| 默认模板 | 2876-2893 | 含 select handle |
| defaultEventOptions | 186-188 | bubbles:true, cancelable:true, composed 未设 |
| emit 函数 | 200-201 | dispatchEvent(new CustomEvent(...)) |

---

## 6. do / don't 清单

### ✅ DO
- 在 shadow root 上监听 `change` 事件（不是 host 元素）
- 用 `event.detail` 的值做越界判断（不是 `cropperSelection.x`）
- 用 `setTimeout(0)` 延迟调用被 `$changing` 阻止的 `$change`
- 缩放用 `cropperImage.$zoom()`（不是 `cropperCanvas`）
- 在 `nextTick` 后调 `$center('contain')` 确保布局完成
- 修改比例 → 改 `useCoverConfig.ts` 一处即可

### ❌ DON'T
- 不要在默认模板上改 — 必须提供完整的自定义 template
- 不要含 `action="select"` handle — 会导致框外拖拽重置裁剪框
- 不要引入 cropperjs v1 的 `@types/cropperjs` — v2 自带类型
- 不要导入 `cropperjs/dist/cropper.css` — v2 无此文件
- 不要传 `aspectRatio` 等行为参数给构造函数 — v2 忽略这些
- 不要在 change handler 内同步调 `$change` — `$changing` 标志会阻止
