# FVTT 中的 SealChat 投影

以 SealChat `a83c088544dc8f7dadbdcc5db158dc23e8737c47` 的 Internal Surface 协议为基准。

## 使用

- 默认显示可拖动的折叠按钮。展开后选择小剧场、交互表单、便签、角色卡、线索或线索板。
- 小剧场可直接使用侧栏当前频道，也可粘贴“小剧场浮层”链接。其他内容粘贴 SealChat 对应资源生成的 Internal Surface 链接，粘贴后自动识别类型。
- 小剧场默认透明背景、仅展示。控制器和 FVTT 模块配置中的“透明背景”“全功能”共用当前客户端设置；修改后会重载已打开的小剧场。
- “全功能”由 SealChat 自身权限控制。透明只隐藏背景，不改变前景素材中的白色像素。
- 拖动浮窗标题栏移动，拖动边缘缩放。“穿透”让舞台区域的鼠标事件交给下方地图；标题栏与缩放边缘仍可操作。
- “收起”保留 iframe 及演出状态；“关闭”销毁 iframe、停止该窗口的运行和音频。收起期间页面与音频仍运行。
- 控制器折叠不影响浮窗。“我的浮窗”可重新展开、关闭浮窗，或移除已关闭的保存链接。最多保存 20 个资源。
- 链接、位置与尺寸存入 FVTT `client` 设置。页面刷新后控制器默认折叠，不自动重新打开投影。
- “投影入口”可切换为旧版 CRPG 对话框或关闭；旧版仍需要启用原有世界级 CRPG 开关，已有配置保留。

## 边界与实现

投影处于当前用户的屏幕坐标，不随地图移动缩放，不广播到其他玩家。每位玩家单独打开自己的投影，实时舞台同步仍由 SealChat 完成。

沿用已验证宏的固定 DOM 浮层与 `iframe.style.colorScheme = "light"`、透明背景和 `allowtransparency`，避免 Foundry 默认 Application 窗框带来背景。新控制器不依赖旧版 Application；现有侧栏和 CRPG 兼容路径保持原有 Application 实现。所有新增 CSS 限定为 `boluo-surface-*`。

`floatingWindow.mjs` 由原 CRPG 拖动/缩放逻辑提取，供两个宿主复用。Pointer Capture 负责跨 iframe 的拖动连续性及取消清理，左/上缩放到最小尺寸时保持对边位置。

`links.mjs` 按 SealChat 的 `type:id:worldId:channelId` 去重。`transparent`、`full` 只作用于小剧场，不影响资源身份；保留部署子路径、外层查询及链接的其他参数。不通过 FVTT 请求 SealChat 的私有资源 API，不复制登录凭据；每个 iframe 使用 SealChat 自己的登录和授权。跨站 cookie 或浏览器存储策略仍可能要求先在对应站点登录。

当前 Bridge 没有资源目录查询接口，因此类型选择器不伪造资源列表。Bridge 确认和角色快照用于识别当前频道，消息来源同时核对 iframe window 与 origin；完整频道地址可作首次加载的上下文回退。切换侧栏频道只更新“当前频道”，不自动将已打开投影切换到另一资源。无 Bridge 响应时，握手重试约 45 秒后停止；侧栏重新加载或切换投影入口可重试。

## 验证

```bash
node --test --test-isolation=none tests/*.test.mjs
node --check scripts/MainUI.js
node --check scripts/dialogue/app.mjs
node --check scripts/floatingWindow.mjs
node --check scripts/surfaces/controller.mjs
node --check scripts/surfaces/links.mjs
```

浏览器验证应覆盖初始折叠、打开六种链接、资源去重、拖动缩放、穿透地图、收起后恢复同一 iframe、关闭清理、切换配置、刷新不自动恢复投影，以及窄屏边界。隔离浏览器中的 Foundry 设置/Hook 桩可检查 UI 生命周期，但不能替代真实 FVTT v13/v14 与 SealChat 登录、权限、实时舞台和音频联调。

## API 依据

- [FVTT v13 ClientSettings](https://foundryvtt.com/api/v13/classes/foundry.helpers.ClientSettings.html)：`register`、`get`、`set`、`scope: "client"` 和 `onChange`。
- [FVTT v14 ClientSettings](https://foundryvtt.com/api/v14/classes/foundry.helpers.ClientSettings.html)：确认相同设置接口。
- [FVTT v13 ApplicationWindowConfiguration](https://foundryvtt.com/api/v13/interfaces/foundry.applications.types.ApplicationWindowConfiguration.html)：ApplicationV2 的 `frame`、`positioned` 与 `resizable` 为可用替代；本实现选择与已实测宏一致的 DOM 宿主，复用统一浮窗控制器。
- 用户提供的 `FVTT_Transparent_Iframe_Macro.md`：`colorScheme: "light"` 及透明 iframe 设置。
