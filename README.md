# 问道

一个适配手机和 PC 的多档案 AI 运势测算网站。八字、星座、生肖、五行和当日宜忌由 `lunar-javascript` 计算；事业、爱情、健康、穿着、灵器与每日一测分别维护上下文。档案支持六级出生地，以及八类预设和自定义关注标签。

档案、当前档案、Agent 对话和每日签默认保存在访问者浏览器的 `localStorage` 中。服务端只完成本次排盘和测算，不持久化出生信息或测算记录。换设备或清除浏览器数据后记录不会自动恢复。

## 启动

```bash
npm install --cache .npm-cache
npm start
```

浏览器打开 `http://localhost:4173`。

## 可选 AI 模型

没有模型配置时，应用使用本地规则引擎，所有功能仍可体验。需要接入兼容 Chat Completions 协议的模型时，按 `.env.example` 配置以下变量后启动：

- `AI_API_URL`
- `AI_API_KEY`
- `AI_MODEL`

## 公网部署

仓库包含 `Dockerfile` 和 `render.yaml`，可直接部署到支持 Node.js 或 Docker 的托管平台。生产环境必须设置 `PUBLIC_APP=1`；档案和对话仍留在每位访问者自己的浏览器中。健康检查地址为 `/api/health`。

生产部署时设置 `PUBLIC_APP=1` 可关闭仅供本机旧数据迁移的 `/api/legacy-export` 接口。若未来需要跨设备同步，应在用户明确同意后增加账号、端到端加密与数据导出/删除机制。
