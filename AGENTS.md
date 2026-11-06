## 项目纲领

核心目标：把 LoomLoom Desktop 里「把胜算云接成 dsh 聊天模型」的配置，做成可装进普通 dsh 的插件。
核心需求：设置页能浏览器登录或粘贴 API Key；密钥只进 dsh 凭据；登录成功后新建对话可改走胜算云；左侧带出 SkillBot 市场，执行前必须报价并经确认。
成功标准：装进较新的 dsh 后，设置里出现「胜算云」，左侧能打开市场；确认前不会扣费。
不追求：桌面壳、关掉官方 DeepSeek、命令行旧版 dsh 0.1.0-rc.6 上的市场。
红线：密钥不进配置正文、日志和页面。

## 构建与验证

- `lib/` 是构建产物且必须提交：`dsh plugin add github:…` 直接取仓库里的 `lib/`，不跑构建。
- 用系统 node（nvm 的 v24）跑 `pnpm install` / `tsdown` / 测试。**不要**用 DSH Desktop 内置的 node：
  它是签名进程，加载 `rolldown` 原生 binding 会因 Team ID 不一致报 `code signature … not valid for use in process`。
- `pnpm typecheck` 在干净安装下不通过（`@deepseek-ai/cordis` 等只在宿主里，package.json 没声明），
  别把它当回归信号；改动后至少跑 `node --import tsx --test tests/*.spec.ts`。
- `@deepseek-ai/dsh-settings` 只当类型用：宿主 0.1.2-alpha.1 起删了 `settingsNamespace` /
  `installSettingsSection`，0.1.7 起没有 `register` / `get`。运行时命名导入会让入口直接 SyntaxError。
