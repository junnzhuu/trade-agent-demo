import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships the trading agent workspace instead of the starter preview", async () => {
  const [
    page,
    layout,
    css,
    packageJson,
    nextConfig,
    workflow,
    expertWorkspace,
    versionSwitcher,
  ] = await Promise.all([
      readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
      readFile(new URL("../package.json", import.meta.url), "utf8"),
      readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../.github/workflows/deploy-pages.yml", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../components/expert-skill-workspace.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../public/version-switcher.js", import.meta.url), "utf8"),
    ]);

  assert.match(layout, /title: "交易 Agent｜多智能体业务工作台"/);
  assert.match(layout, /version-switcher\.js/);
  assert.match(page, /交易业务智能工作台/);
  assert.match(page, /交易智能助手/);
  assert.match(page, /\.\/logo\.svg/);
  assert.match(page, /日常运营 Agent/);
  assert.match(page, /营销活动 Agent/);
  assert.match(page, /演示数据/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /runAudienceIsolationScenario/);
  assert.match(page, /useState<RecentTask\[]>\(\[]\)/);
  assert.doesNotMatch(page, /audienceHistoryStorageKey|localStorage/);
  assert.doesNotMatch(page, /权限场景演示|audienceScenarioPrompts/);
  assert.match(page, /以上信息仅供公司内部参考，请勿直接转发给商家/);
  assert.match(page, /以上信息可转发商家/);
  assert.doesNotMatch(page, /以上信息仅供公司内部参考，请勿直接转发给商家。/);
  assert.doesNotMatch(page, /以上信息可转发商家。/);
  assert.doesNotMatch(page, /audience-answer-label/);
  assert.match(page, /生成对商版本/);
  assert.match(page, /生成对内版本/);
  assert.match(page, /onDeriveMerchant/);
  assert.match(page, /derivedAnswerId/);
  assert.match(page, /专家 · 技能/);
  assert.match(page, /ExpertSkillWorkspace/);
  assert.match(page, /onUseSkill=\{useExpertSkill\}/);
  assert.match(page, /pendingComposerSkill/);
  assert.match(expertWorkspace, /使用技能：\$\{skill\.name\}/);
  assert.match(expertWorkspace, /className="skill-use-overlay"/);
  assert.match(expertWorkspace, /使用该技能/);
  assert.match(page, /HomeSkillDiscovery/);
  assert.match(
    page,
    /<HomeSkillDiscovery[\s\S]*<Composer[\s\S]*<FeatureBannerCarousel/,
  );
  assert.match(page, /aria-label="新功能推荐"/);
  assert.match(page, /window\.setInterval/);
  assert.match(page, /}, 5000\)/);
  assert.match(page, /立即体验/);
  assert.match(page, /onSelect\(activeSkill\.standardQuestion\)/);
  assert.match(page, /快捷技能推荐/);
  assert.match(page, /AutomationWorkspace/);
  assert.match(page, /今天帮你做些什么？\/ 调用技能/);
  assert.match(page, /composerSkillOptions/);
  assert.match(page, /composer-skill-list/);
  assert.match(page, /skillMenuRef\.current\?\.contains/);
  assert.match(page, /composer-skill-search/);
  assert.match(page, /search-result-created-at/);
  assert.match(page, /创建时间/);
  assert.doesNotMatch(page, /<span>\{task\.metadata\}<\/span>/);
  assert.match(page, /contentEditable/);
  assert.match(page, /composer-inline-skill/);
  assert.match(page, /standardQuestion/);
  assert.match(page, /getQuestionSuggestions/);
  assert.match(page, /composer-question-suggestions/);
  assert.match(page, /猜你想问/);
  assert.match(page, /onCompositionStart/);
  assert.match(page, /onCompositionEnd/);
  assert.match(page, /aria-haspopup="listbox"/);
  assert.match(page, /data-empty=\{composerIsEmpty\}/);
  assert.match(page, /useImperativeHandle/);
  assert.match(page, /onSelectSkill\(skill\)/);
  assert.doesNotMatch(page, /onSelectSkill\(skill\.name\)/);
  assert.doesNotMatch(page, /使用「\$\{skillName\}」/);
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
  assert.match(page, /className="plan-mode-tag"/);
  assert.match(page, /aria-label="关闭计划模式"/);
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
  assert.match(page, /隔离答案生成上下文/);
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
  assert.doesNotMatch(css, /\.audience-scenario-strip/);
  assert.match(css, /\.feature-banner-carousel/);
  assert.match(css, /@keyframes feature-banner-enter/);
  assert.match(css, /\.audience-answer-footer\.merchant/);
  assert.match(
    css,
    /\.assistant-final-answer \.audience-answer-footer\s*\{[^}]*border-top: 1px solid #ededed/s,
  );
  assert.doesNotMatch(css, /\.audience-answer-label/);
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
  assert.match(page, /收藏的任务/);
  assert.match(page, /收藏的答案/);
  assert.match(page, /创建时间：/);
  assert.match(page, /问题：\{answer\.question\}/);
  assert.match(page, /答案[\s\S]*：\{answer\.message\.content\}/);
  assert.match(page, /取消收藏/);
  assert.match(page, /block: "end"/);
  assert.match(page, /收藏成功，可前往/);
  assert.match(page, /favorite-toast/);
  assert.match(page, /openLibrary\("favorites"\)/);
  assert.match(page, /该任务将被永久删除，无法恢复，是否确认删除？/);
  assert.match(page, /确认删除任务/);
  assert.match(page, /role="alertdialog"/);
  assert.match(page, /deleteConfirmationTaskId/);
  assert.match(page, /复制请求 ID/);
  assert.match(page, /ID: Manbo/);
  assert.match(page, /新手指引/);
  assert.match(page, /OnboardingTour/);
  assert.match(
    page,
    /useEffect\(\(\) => \{\s*const timer = window\.setTimeout\(\(\) => \{\s*if \(tourInitializedRef\.current\) return;\s*tourInitializedRef\.current = true;\s*startOnboarding\(\);\s*\}, 500\)/,
  );
  assert.match(page, /recentTasks: RecentTask\[]/);
  assert.doesNotMatch(page, /ONBOARDING_STORAGE_KEY/);
  assert.match(page, /data-tour-id="workspace-navigation"/);
  assert.match(page, /data-tour-id="task-composer"/);
  assert.match(page, /data-tour-id="feedback"/);
  assert.match(css, /\.account-drawer/);
  assert.match(css, /\.onboarding-bubble/);
  assert.match(css, /\.onboarding-spotlight/);
  assert.match(css, /\.answer-more-menu/);
  assert.match(css, /\.library-dialog/);
  assert.match(css, /\.favorite-answer-row/);
  assert.match(css, /\.favorite-cancel-button/);
  assert.match(css, /\.favorite-toast/);
  assert.match(css, /\.delete-confirmation-dialog/);
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
    /\.home-skill-tabs\s*{[^}]*backdrop-filter: blur\(18px\) saturate\(120%\)/s,
  );
  assert.match(
    css,
    /\.home-skill-card\s*{[^}]*backdrop-filter: blur\(18px\) saturate\(120%\)/s,
  );
  assert.match(css, /background: rgba\(218, 222, 225, 0\.66\)/);
  assert.match(css, /\.home-skill-tabs\s*{[^}]*width: max-content/s);
  assert.match(css, /\.home-skill-tabs\s*{[^}]*gap: 0/s);
  assert.match(css, /\.home-skill-card\s*{[^}]*min-height: 38px/s);
  assert.match(css, /\.home-skill-card\s*{[^}]*padding: 0 15px/s);
  assert.doesNotMatch(page, /home-skill-category-icon/);
  assert.match(css, /\.home-skill-cards\s*{[^}]*display: flex/s);
  assert.match(css, /\.home-skill-more/);
  assert.match(page, /aria-label="查看更多技能"/);
  assert.match(css, /\.home-skill-tooltip/);
  assert.match(css, /\.home-skill-card:hover \.home-skill-tooltip/);
  assert.match(page, /role="tooltip"/);
  assert.doesNotMatch(page, /home-skill-card-heading/);
  assert.match(page, /getHomeBannerSkills/);
  assert.match(css, /\.skill-grid/);
  assert.match(css, /\.skill-use-overlay/);
  assert.match(css, /\.skill-card:focus-visible \.skill-use-overlay/);
  assert.match(css, /\.composer-skill-menu/);
  assert.match(css, /\.composer-skill-search/);
  assert.match(
    css,
    /\.task-search-field input\s*{[^}]*font-size: 14px/s,
  );
  assert.match(css, /\.composer-inline-skill/);
  assert.match(css, /\.composer-question-suggestions/);
  assert.match(css, /\.composer-editor\[data-empty="true"\]::before/);
  assert.match(css, /\.plan-mode-tag/);
  assert.match(css, /\.plan-mode-tag:hover \.plan-mode-tag-close-icon/);
  assert.doesNotMatch(css, /\.selected-skill-chips/);
  assert.match(css, /\.brand-mark img/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(nextConfig, /output: "export"/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /codex\/交易智能助手-5ba4a51/);
  assert.match(workflow, /codex\/交易智能助手-v2\.1/);
  assert.match(workflow, /versions\/classic/);
  assert.match(workflow, /versions\/audience-isolation/);
  assert.match(versionSwitcher, /v2\.2/);
  assert.match(versionSwitcher, /v2\.1/);
  assert.match(versionSwitcher, /v2\.0/);
  assert.match(versionSwitcher, /技能推荐与 Banner/);
  assert.match(versionSwitcher, /对商\/对内知识隔离/);
  assert.match(versionSwitcher, /aria-current/);
  assert.doesNotMatch(page, /fetch\("\/api\/runs"/);
  assert.doesNotMatch(page, /codex-preview|SkeletonPreview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
