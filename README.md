# MD Live Editor

一个基于 Vue 3 + CodeMirror 6 的 Markdown 即时渲染编辑器。实现类似 Typora 的所见即所得编辑体验——光标所在区域显示语法标记，离开后自动渲染为格式化效果，切换过程平滑无割裂。

## How to Run

### Docker 方式（推荐）

```bash
docker-compose up --build -d
```

### 本地开发

```bash
cd frontend-editor
npm install
npm run dev
```

## Services

| 服务 | 地址 | 说明 |
|------|------|------|
| MD Live Editor | http://localhost:8081 | Docker 部署 |
| MD Live Editor (dev) | http://localhost:5173 | 本地开发 |

## 测试账号

本项目为纯前端编辑器，无需登录。

## 图片插入说明

### 支持的图片格式

编辑器支持标准 Markdown 图片语法：`![替代文本](图片地址)`

### 图片路径类型

1. **网络图片（推荐）**
   - HTTP/HTTPS 地址：`![示例](https://example.com/image.png)`
   - 协议相对地址：`![示例](//example.com/image.png)`

2. **本地文件系统路径（不支持）**
   - ❌ Windows 路径：`![图片](C:\Users\username\image.png)`
   - ❌ Mac/Linux 路径：`![图片](/Users/username/image.png)`
   - ❌ 相对路径：`![图片](./images/photo.jpg)`

### 为什么不支持本地路径？

出于安全考虑，现代浏览器禁止网页直接访问用户本地文件系统。即使输入了正确的本地路径，浏览器也会拒绝加载图片。

### 解决方案

如需使用本地图片，请采用以下方式之一：

1. **上传到图床**：将图片上传到图床服务（如 imgur、SM.MS 等），使用返回的网络地址
2. **本地服务器**：使用本地 HTTP 服务器托管图片，通过 `http://localhost:port/image.png` 访问
3. **Base64 编码**：将小图片转换为 Base64 编码嵌入（不推荐大图片）

### 常见错误示例

```markdown
# 错误：语法颠倒
![C:\Users\benzhi\Desktop\BenZhiTec](错误示范)
# 正确语法应该是：
![错误示范](C:\Users\benzhi\Desktop\BenZhiTec)
# 但即使语法正确，本地路径仍然无法在浏览器中显示

# 正确：使用网络图片
![错误示范](https://example.com/error-demo.png)
```

### 错误提示说明

- **"浏览器无法访问本地路径"**：输入了 Windows/Mac/Linux 本地文件系统路径
- **"图片加载失败"**：网络图片地址无效或无法访问
- **"未指定路径"**：图片语法中缺少 URL 部分

## 题目内容

开发一个 Markdown 即时渲染编辑器，核心功能：

- 用户能够无损编辑 Markdown 文件并看到渲染效果
- 当光标所在区域存在语法标记时，展示语法标记（编辑模式）
- 当光标离开时，展示渲染效果（预览模式）
- 语法标记和渲染效果切换过程中，用户体验不能割裂
- 非双列模式，即时渲染

### 技术实现

- 基于 CodeMirror 6 的 Decoration 系统实现行内渲染
- 通过 ViewPlugin 监听光标位置，动态切换语法标记的显示/隐藏
- CSS transition 实现平滑过渡动画
- 底层始终保持原始 Markdown 文本，渲染仅是视觉层装饰

## 外观设置

点击工具栏右侧齿轮图标可打开「外观设置」面板，所有偏好均持久化在浏览器
`localStorage`（键 `mira.prefs.v1`），在不同文稿之间以及关闭重新进入后
保持选择。

| 设置 | 范围 | 默认值 | 说明 |
|------|------|--------|------|
| 代码字号 | 12–32 px（步长 1） | 16 px | 编辑区正文字号，代码块等比缩放 |
| 行宽 | 480–1100 px（步长 10） | 720 px | 正文区域最大宽度，居中显示 |
| 主题 | 浅色 / 深色 / 护眼 | 浅色 | 通过 `data-theme` + CSS 变量整体换肤 |
| 自动保存 | 开 / 关 | 关 | 开启后文稿存入 `mira.draft.v1`，重新进入自动恢复 |

容错与一致性保证：

- **未知/损坏偏好**：非法 JSON、未知版本号会被丢弃并回退默认值；单个字段
  非法（如 `fontSize: "abc"`、未知主题、`autosave: "yes"`）不影响其他字段。
- **极值输入**：越界数值自动钳制到端点（如字号 9999 → 32，负数 → 12），
  面板显示与实际效果同步回弹到安全值。
- **存储不可用**：隐私模式 / 配额耗尽 / 被禁用时，设置只在本次会话生效，
  自动保存开关无法开启（不会出现面板显示"开"但实际不保存的错位）。
- **恢复默认**：仅还原外观偏好，不会删除或修改当前文稿内容。
- **连续切换**：写入做了防抖（300 ms），频繁拖动滑块/切换主题不会反复写盘；
  页面隐藏或关闭时会补刷一次。
- 字数统计、行列提示与全部原有快捷键（撤销/重做、Tab 缩进等）行为不变。

偏好存储结构：

```json
{ "version": 1, "fontSize": 16, "lineWidth": 720, "theme": "light", "autosave": false }
```

纯逻辑的偏好校验有 Node 单元测试（不依赖浏览器）：

```bash
cd frontend-editor
node --import ./tests/register-hook.mjs --test tests/
```
