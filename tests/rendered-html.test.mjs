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
  assert.match(page, /HomeSkillDiscovery/);
  assert.match(page, /快捷技能推荐/);
  assert.match(page, /AutomationWorkspace/);
  assert.match(page, /今天帮你做些什么？\/ 调用技能/);
  assert.match(page, /composerSkillOptions/);
  assert.match(page, /composer-skill-list/);
  assert.match(page, /composer-skill-search/);
  assert.match(page, /contentEditable/);
  assert.match(page, /composer-inline-skill/);
  assert.match(page, /未找到相关技能/);
  assert.match(page, /搜索技能/);
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
  assert.doesNotMatch(page, /深度思考/);
  assert.match(page, /role="switch"/);
  assert.match(
    page,
    /<span>添加文件<\/span>[\s\S]*<span>技能<\/span>[\s\S]*<strong>计划模式<\/strong>/,
  );
  assert.doesNotMatch(page, /addMenuView|mode-menu|openExperts|openSkills/);
  assert.doesNotMatch(page, /aria-label="添加附件"/);
  assert.doesNotMatch(page, /BrainCircuit/);
  assert.match(page, /已处理/);
  assert.match(page, /思考与 Skill 调用步骤/);
  assert.match(page, /execution-details/);
  assert.match(page, /open=\{message\.pending \|\| forceOpen \|\| undefined\}/);
  assert.match(page, /展开或折叠思考过程/);
  assert.match(page, /深度分析并核验结论/);
  assert.match(page, /formatRelativeTaskTime/);
  assert.match(page, /Agent 回复/);
  assert.match(page, /回答操作/);
  assert.match(page, /提交反馈/);
  assert.match(page, /意见反馈/);
  assert.match(page, /你可以描述你遇到的问题/);
  assert.match(page, /上传图片/);
  assert.match(page, /创建时间/);
  assert.match(page, /最后更新/);
  assert.match(page, /删除归档任务/);
  assert.match(page, /不正确或不完整/);
  assert.match(page, /没有遵循我的指示/);
  assert.match(page, /偏题\/超出范围/);
  assert.match(page, /填写详情（选填）/);
  assert.match(page, /点击加入反馈群/);
  assert.match(css, /\.answer-actions/);
  assert.match(css, /background: #01c1c2/);
  assert.match(css, /color: #ffffff/);
  assert.match(css, /\.feedback-dialog/);
  assert.doesNotMatch(page, /className="chat-avatar"/);
  assert.match(page, /生成回复中/);
  assert.match(page, /recent-task-spinner/);
  assert.match(page, /置顶任务/);
  assert.match(page, /重命名/);
  assert.match(page, /归档/);
  assert.match(page, /collapsed-sidebar-toggle/);
  assert.match(page, /\.\/background\.svg/);
  assert.doesNotMatch(page, /recent-task-complete/);
  assert.doesNotMatch(css, /\.recent-task-complete/);
  assert.match(css, /\.recent-task-row:hover \.recent-task-meta/);
  assert.doesNotMatch(css, /padding-right: 35px/);
  assert.match(css, /background: transparent !important/);
  assert.match(css, /\.main-background/);
  assert.match(css, /\.main-background\s*{[^}]*z-index: 0/s);
  assert.match(css, /background: rgba\(226, 228, 230, 0\.42\)/);
  assert.match(css, /backdrop-filter: blur\(20px\) saturate\(116%\)/);
  assert.match(css, /@supports not \(\(-webkit-backdrop-filter:/);
  assert.match(css, /\.task-context-menu/);
  assert.match(page, /我的收藏/);
  assert.match(page, /复制请求 ID/);
  assert.match(page, /ID: Manbo/);
  assert.match(page, /新手指引/);
  assert.match(page, /OnboardingTour/);
  assert.match(
    page,
    /useEffect\(\(\) => \{\s*const timer = window\.setTimeout\(\(\) => \{\s*if \(tourInitializedRef\.current\) return;\s*tourInitializedRef\.current = true;\s*startOnboarding\(\);\s*\}, 500\)/,
  );
  assert.doesNotMatch(page, /localStorage|ONBOARDING_STORAGE_KEY/);
  assert.match(page, /data-tour-id="workspace-navigation"/);
  assert.match(page, /data-tour-id="task-composer"/);
  assert.match(page, /data-tour-id="feedback"/);
  assert.match(css, /\.account-drawer/);
  assert.match(css, /\.onboarding-bubble/);
  assert.match(css, /\.onboarding-spotlight/);
  assert.match(css, /\.answer-more-menu/);
  assert.match(css, /\.library-dialog/);
  assert.match(css, /\.primary-sidebar-nav button:first-child/);
  assert.match(css, /@keyframes generating-dot/);
  assert.match(css, /\.execution-details\[open\] \.execution-chevron/);
  assert.match(css, /\.expert-grid/);
  assert.match(css, /\.home-skill-discovery/);
  assert.match(css, /\.home-skill-cards/);
  assert.doesNotMatch(
    css,
    /\.home-skill-discovery\s*{[^}]*(?:background|backdrop-filter|border:)/s,
  );
  assert.match(
    css,
    /\.home-skill-tabs button\s*{[^}]*backdrop-filter: blur\(18px\) saturate\(120%\)/s,
  );
  assert.match(
    css,
    /\.home-skill-card\s*{[^}]*backdrop-filter: blur\(18px\) saturate\(118%\)/s,
  );
  assert.match(css, /background: rgba\(255, 255, 255, 0\.64\)/);
  assert.match(css, /background: rgba\(218, 222, 225, 0\.68\)/);
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 260px\)\)/);
  assert.match(css, /\.skill-grid/);
  assert.match(css, /\.composer-skill-menu/);
  assert.match(css, /\.composer-skill-search/);
  assert.match(css, /\.composer-inline-skill/);
  assert.doesNotMatch(css, /\.selected-skill-chips/);
  assert.match(css, /\.brand-mark img/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(nextConfig, /output: "export"/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.doesNotMatch(page, /fetch\("\/api\/runs"/);
  assert.doesNotMatch(page, /codex-preview|SkeletonPreview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
