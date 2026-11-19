# Boluo-chat-embed-Foundry 菠萝文字团工具嵌入

在 Foundry VTT 中嵌入菠萝跑团或 SealChat，将聊天、小剧场和独立资源放到同一个跑团界面中。

当前版本：**2.4.0**。`module.json` 声明最低支持 Foundry VTT v10，兼容验证版本为 v14。

[Foundry 模组页面](https://foundryvtt.com/packages/Boluo-chat-embed-Foundry)

## 主要功能

- **聊天侧栏**：自定义网页地址、标签标题和图标，调整侧栏最小宽度、默认宽度及内容缩放比例；右键标签可打开悬浮窗口。
- **SealChat 投影控制器**：默认折叠，展开后可选择小剧场、交互表单、便签、角色卡、线索和线索板。
- **透明小剧场**：默认透明背景、仅展示，可切换为全功能模式；沿用透明 iframe 的 Light 颜色方案。
- **浮窗管理**：支持多窗口、拖动、边缘缩放、收起恢复、关闭、地图点击穿透和本地布局保存。
- **轻量窗口控件**：标题栏、边框及右下角把手默认高透明，悬浮、聚焦或拖动时显现，无有色背景叠加。
- **旧版 CRPG 对话框**：可切换回原有的 IC 公共消息播放方式。

小剧场与其他 Internal Surface 需要使用支持对应功能的 SealChat；普通网页或菠萝跑团仍可使用聊天侧栏与右键悬浮功能。

## 安装与基础设置

1. 在 FVTT 的模组安装界面搜索并安装本模组，在世界中启用。
2. 在模块配置中填写“嵌入网页地址”，SealChat 请使用完整频道页地址，例如 `https://your-sealchat-host/#/WORLD_ID/CHANNEL_ID`。
3. 在右侧新增的聊天标签内登录并进入频道。可按需修改标签标题、图标、侧栏宽度与缩放比例。

优先使用可信 HTTPS 站点；本机开发时可使用 HTTP 地址。若跨站登录受浏览器限制，请先直接访问对应站点完成登录，再回到 FVTT。

## 小剧场与独立资源投影

1. 点击默认折叠的投影按钮，展开“SealChat 投影”控制器。
2. 选择“小剧场”后可留空链接，直接使用侧栏当前频道；也可粘贴 SealChat 的“小剧场浮层”链接。
3. 其他类型请粘贴对应资源生成的 Internal Surface 链接，控制器会自动识别类型。点击“打开投影”即可显示浮窗。

| 配置 | 默认值 | 行为 |
| --- | --- | --- |
| 投影入口 | SealChat 投影控制器 | 可切换为旧版 CRPG 对话框或关闭 |
| 小剧场透明背景 | 开启 | 隐藏舞台底色与场景背景层，保留立绘、前景和对白 |
| 小剧场全功能 | 关闭 | 默认仅展示；开启后按 SealChat 账号权限提供标准工具栏及聊天区 |

透明背景和全功能设置可在控制器与 FVTT 模块配置中调整，仅影响当前客户端；修改后会重载已打开的小剧场。透明背景不会消除素材自身的白色像素。

- 拖动标题栏移动窗口，拖动边缘或右下角把手缩放。
- “穿透”使舞台区域的点击交给下方地图，标题栏与缩放边缘仍可操作。
- “收起”保留页面及演出状态，页面和音频仍运行；“关闭”销毁该 iframe。
- 折叠控制器不会关闭投影。“我的浮窗”中可重新打开、收起、关闭，或移除已关闭的保存链接。
- 最多保存 20 个资源，位置、尺寸与链接保存在当前客户端。刷新页面后默认折叠，不自动重新打开投影。

投影位于当前用户的屏幕坐标，不随地图平移缩放，也不会自动广播给其他玩家。每位玩家单独打开投影，实时舞台同步和操作权限由 SealChat 负责。切换侧栏频道不会自动改变已打开投影的资源。

详细协议、实现与验证说明见 [FVTT 中的 SealChat 投影](scripts/surfaces/README.md)。

## 旧版 CRPG 对话框

在当前客户端将“投影入口”切换为“旧版 CRPG 对话框”，并启用世界级配置“启用旧版 CRPG 对话框”。

- 从右侧 SealChat iframe 获取实时 Bridge 数据，进入完整频道页并完成握手后开始消费消息。
- 仅处理 IC 公共消息，不处理 OOC 与悄悄话。
- 右键弹出的 SealChat 窗口用于查看，不作为 Bridge 数据来源。

## 2.4.0 更新

新增六类 Internal Surface 投影与默认折叠的控制器；小剧场默认透明、仅展示，支持全功能切换。统一浮窗拖动缩放，提供地图点击穿透、资源去重、收起恢复及本地布局保存，并调整窗口控件为无底色的高透明样式。

## 开发与发布

开发时将本仓库链接到 Foundry 的 `Data/modules/Boluo-chat-embed`。无需安装额外依赖即可运行现有 Node 测试：

```bash
node --test --test-isolation=none tests/*.test.mjs
```

发布时保持 Release 标签与 `module.json` 版本一致，本版本使用 `v2.4.0`。现有 GitHub Actions 在发布 Release 后替换仓库及下载链接，并打包模组资源。

## 界面截图

![PixPin_2025-10-18_12-04-26](https://github.com/user-attachments/assets/3df9eda7-965b-4838-af29-6c1ac5baa544)
![image](https://github.com/user-attachments/assets/3aba4878-43ad-4f37-87f6-11cd2e19cc3f)
![image](https://github.com/user-attachments/assets/125dbe0d-fb24-4fbc-9dcd-7c5b638c8fcc)

## 参考代码

[Saibot393/notebook](https://github.com/Saibot393/notebook)
