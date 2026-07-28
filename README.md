# 交易 Agent

一个用于产品演示的中文多智能体交易业务工作台。根 Agent 会根据问题调度日常运营、商品运营、招商、营销活动和项目管理五个专家 Agent，并在界面中实时展示工具调用和生成结果。

## 能力

- OpenAI Agents SDK manager-style 多 Agent 调度
- 基于 SSE 的回答与执行事件流
- 内置确定性交易业务演示数据
- KPI 表格、诊断报告、项目计划和 CSV 导出
- D1 匿名调用计数，不保存用户、对话或业务内容
- 黑白线框三栏工作台与移动端抽屉

## 本地运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

在 `.env.local` 中填写 `OPENAI_API_KEY`。默认模型为 `gpt-5.6-terra`，可通过 `OPENAI_MODEL` 修改。

## 验证

```bash
npm run db:generate
npm test
npx tsc --noEmit
```

所有业务数据均为虚构演示数据，应用不会连接或修改真实业务系统。
