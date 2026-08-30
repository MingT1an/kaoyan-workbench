# 考研工作台

自用桌面端考研备考工作台:把「计划 → 执行 → 记录 → 复习」闭环收进一个窗口。

技术栈:Electron + electron-vite + React + TypeScript + Tailwind CSS v4 + better-sqlite3 + Drizzle ORM。

## 开发

```bash
npm install
npm run dev:local  # 推荐:本地构建 + 文件加载,改动 src 后自动重建并刷新/重启
npm run dev        # HMR 模式(本机若有安全软件拦截本地回环连接会加载失败)
npm run build      # 构建生产包到 out/
npm run typecheck  # 类型检查
```

> 本机说明:Clash/安全软件可能拦截 Chromium 对 `127.0.0.1` dev server 的部分连接,
> 导致 `npm run dev` 白屏或加载超时;`dev:local` 完全不依赖本地 HTTP,可稳定使用。
> 主进程代码变更后 `dev:local` 会自动重启应用;渲染层变更约 1-2 秒后窗口自动刷新。

数据存储在 `%APPDATA%/kaoyan-workbench/kaoyan.db`(SQLite,单文件)。

## 版本路线

- [x] V0.1 骨架 — 侧边栏布局、科目管理、考试倒计时、全局设置、SQLite 全量表结构
- [x] V0.2 计划 — 任务增删改查、今日任务清单(日期切换)、重复任务(每天/每周几)、阶段规划
- [x] V0.3 番茄钟 — 主进程计时(关窗缩托盘不停表)、绑定任务、暂停/放弃、自动休息与系统通知、时长入库、打卡日历
- [x] V0.4 复习 — 艾宾浩斯复习引擎(记得/模糊/忘了三档自评)、复习卡片、今日页到期推送
- [ ] V0.5 错题本 — 错题录入(截图粘贴)、与复习队列联动
- [ ] V0.6 统计 — 数据看板、JSON 备份导出
