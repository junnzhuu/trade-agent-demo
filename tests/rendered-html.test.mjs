import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships the trading agent workspace instead of the starter preview", async () => {
  const [page, layout, css, packageJson, nextConfig, workflow] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /title: "交易 Agent｜多智能体业务工作台"/);
  assert.match(page, /交易业务智能工作台/);
  assert.match(page, /日常运营 Agent/);
  assert.match(page, /营销活动 Agent/);
  assert.match(page, /演示数据/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /runDemoScenario/);
  assert.match(page, /专家 · 技能/);
  assert.match(page, /ExpertSkillWorkspace/);
  assert.match(page, /AutomationWorkspace/);
  assert.match(page, /今天帮你做些什么？@ 召唤专家，\/ 调用技能/);
  assert.match(page, /qwen3\.7-plus/);
  assert.match(page, /doubao-seed-2-0-lite/);
  assert.match(page, /图片理解/);
  assert.match(page, /ArrowUp/);
  assert.match(page, /添加文件/);
  assert.match(page, /计划模式/);
  assert.match(page, /深度思考/);
  assert.match(page, /role="switch"/);
  assert.doesNotMatch(page, /aria-label="添加附件"/);
  assert.doesNotMatch(page, /BrainCircuit/);
  assert.match(css, /\.expert-grid/);
  assert.match(css, /\.skill-grid/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(nextConfig, /output: "export"/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.doesNotMatch(page, /fetch\("\/api\/runs"/);
  assert.doesNotMatch(page, /codex-preview|SkeletonPreview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
