import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships the trading agent workspace instead of the starter preview", async () => {
  const [page, layout, css, packageJson, nextConfig, workflow] =
    await Promise.all([
      readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
      readFile(new URL("../package.json", import.meta.url), "utf8"),
      readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../.github/workflows/deploy-pages.yml", import.meta.url),
        "utf8",
      ),
    ]);

  assert.match(layout, /title: "交易 Agent｜多智能体业务工作台"/);
  assert.match(page, /交易业务智能工作台/);
  assert.match(page, /交易智能助手/);
  assert.match(page, /\.\/logo\.svg/);
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
  assert.match(page, /\.\/send-empty\.svg/);
  assert.match(page, /\.\/send-ready\.svg/);
  assert.match(page, /\.\/send-loading\.svg/);
  assert.doesNotMatch(page, /\n  ArrowUp,/);
  assert.doesNotMatch(page, /\n  Square,/);
  assert.match(page, /添加文件/);
  assert.match(page, /计划模式/);
  assert.match(page, /深度思考/);
  assert.match(page, /role="switch"/);
  assert.doesNotMatch(page, /aria-label="添加附件"/);
  assert.doesNotMatch(page, /BrainCircuit/);
  assert.match(page, /已处理/);
  assert.match(page, /思考与 Skill 调用步骤/);
  assert.match(page, /深度分析并核验结论/);
  assert.match(page, /formatRelativeTaskTime/);
  assert.match(page, /Agent 回复/);
  assert.match(page, /回答操作/);
  assert.match(page, /提交反馈/);
  assert.match(page, /不正确或不完整/);
  assert.match(page, /没有遵循我的指示/);
  assert.match(page, /偏题\/超出范围/);
  assert.match(page, /填写详情（选填）/);
  assert.match(page, /点击加入反馈群/);
  assert.match(css, /\.answer-actions/);
  assert.match(css, /\.feedback-dialog/);
  assert.doesNotMatch(page, /className="chat-avatar"/);
  assert.match(page, /生成回复中/);
  assert.match(page, /recent-task-spinner/);
  assert.match(page, /置顶任务/);
  assert.match(page, /重命名/);
  assert.match(page, /归档/);
  assert.match(page, /collapsed-sidebar-toggle/);
  assert.match(page, /\.\/background\.svg/);
  assert.match(css, /\.recent-task-complete/);
  assert.match(css, /\.main-background/);
  assert.match(css, /background: rgba\(218, 220, 224, 0\.56\)/);
  assert.match(css, /backdrop-filter: blur\(12px\)/);
  assert.match(css, /\.task-context-menu/);
  assert.match(css, /\.primary-sidebar-nav button:first-child/);
  assert.match(css, /@keyframes generating-dot/);
  assert.match(css, /\.expert-grid/);
  assert.match(css, /\.skill-grid/);
  assert.match(css, /\.brand-mark img/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(nextConfig, /output: "export"/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.doesNotMatch(page, /fetch\("\/api\/runs"/);
  assert.doesNotMatch(page, /codex-preview|SkeletonPreview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
