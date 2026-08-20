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
    feishuIntegration,
    versionSwitcher,
    flatSkillRedirect,
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
      readFile(
        new URL("../components/feishu-integration-dialog.tsx", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../public/version-switcher.js", import.meta.url), "utf8"),
      readFile(
        new URL(
          "../public/versions/flat-skill-directory/index.html",
          import.meta.url,
        ),
        "utf8",
      ),
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
  assert.match(expertWorkspace, /className="scene-grid"/);
  assert.doesNotMatch(expertWorkspace, /className="scene-avatar"/);
  assert.doesNotMatch(expertWorkspace, /className="scene-status"/);
  assert.match(expertWorkspace, /商家运营场景/);
  assert.match(expertWorkspace, /className="agent-filter-tabs"/);
  assert.match(expertWorkspace, /className="expert-directory-heading"/);
  assert.match(
    expertWorkspace,
    /<span>\{selectedSceneStats\.expertCount\} 个<\/span>/,
  );
  assert.match(expertWorkspace, /className="skill-agent-tag"/);
  assert.match(expertWorkspace, /所属专家：\$\{agent\.name\}/);
  assert.doesNotMatch(
    expertWorkspace,
    /selectedAgentId === "all" \? \([\s\S]*className="skill-agent-tag"/,
  );
  assert.match(expertWorkspace, /className=\{`skill-grid \$\{selectedAgent/);
  assert.doesNotMatch(expertWorkspace, /className="agent-skill-group"/);
  assert.match(expertWorkspace, /className="skill-use-overlay"/);
  assert.match(expertWorkspace, /使用该技能/);
  assert.match(expertWorkspace, /useState<SkillSort>\("hot"\)/);
  assert.match(expertWorkspace, /aria-label="技能排序"/);
  assert.match(
    expertWorkspace,
    /skillSort === "hot" \? visibleSkills : \[\.\.\.visibleSkills\]\.reverse\(\)/,
  );
  assert.match(expertWorkspace, />\s*最热\s*<\/button>/);
  assert.match(expertWorkspace, />\s*最新\s*<\/button>/);
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
  assert.match(page, /快捷召唤专家/);
  assert.match(page, /召唤更多专家/);
  assert.match(page, /quickComposerExperts\.map/);
  assert.match(page, /onMouseEnter=\{\(\) => openExpertMenu\(\)\}/);
  assert.match(page, /className="quick-expert-menu-check"/);
  assert.match(
    page,
    /setComposerText\(input\.trim\(\) \? input : agent\.standardQuestion\)/,
  );
  assert.match(page, /updateTask\(taskId, \(task\) => \(\{ \.\.\.task, targetAgent \}\)\)/);
  assert.match(page, /计划模式/);
  assert.match(page, /className="plan-mode-tag"/);
  assert.match(page, /aria-label="关闭计划模式"/);
  assert.doesNotMatch(page, /深度思考/);
  assert.match(page, /role="switch"/);
  assert.match(
    page,
    /<span>添加文件<\/span>[\s\S]*<span>专家<\/span>[\s\S]*<strong>计划模式<\/strong>/,
  );
  assert.doesNotMatch(
    page,
    /className="add-menu"[\s\S]*?<span>技能<\/span>[\s\S]*?<strong>计划模式<\/strong>/,
  );
  assert.match(css, /\.quick-expert-menu/);
  assert.match(css, /\.quick-expert-menu\.right/);
  assert.match(css, /\.quick-expert-menu\.left/);
  assert.match(css, /\.quick-expert-menu-check\s*{[^}]*color:\s*#01c1c2/s);
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
  assert.doesNotMatch(page, />\s*我的归档\s*</);
  assert.doesNotMatch(page, />\s*我要反馈\s*</);
  assert.match(page, /加入反馈群/);
  assert.doesNotMatch(page, />\s*设置\s*</);
  assert.match(page, /飞书集成/);
  assert.match(page, /完成飞书集成，解锁完整功能/);
  assert.match(page, /feishuIntegrationAuthorized/);
  assert.match(page, /className="account-drawer-integration"/);
  assert.match(page, /className="feishu-integration-alert-dot"/);
  assert.match(page, /飞书集成未完成/);
  assert.match(
    page,
    /!feishuIntegrationAuthorized \? \([\s\S]*className="feishu-integration-alert-dot"/,
  );
  assert.match(page, /useSyncExternalStore/);
  assert.match(feishuIntegration, /应用和授权/);
  assert.match(
    feishuIntegration,
    /授权后将自动创建飞书机器人并获取 App ID 和 App Secret/,
  );
  assert.match(feishuIntegration, /获取授权链接\/二维码/);
  assert.match(feishuIntegration, /完成授权后解锁完整能力/);
  assert.doesNotMatch(feishuIntegration, /feishu-credential-fields/);
  assert.doesNotMatch(feishuIntegration, /等待授权后自动填入/);
  assert.doesNotMatch(feishuIntegration, /返回上一步/);
  assert.match(feishuIntegration, /FEISHU_INTEGRATION_STORAGE_KEY/);
  assert.doesNotMatch(feishuIntegration, /选择地区|连通性测试|可对话|哈基米的智能助手/);
  assert.match(css, /\.feishu-integration-dialog/);
  assert.match(css, /\.feishu-integration-prompt/);
  assert.match(
    css,
    /\.feishu-integration-alert-dot\s*{[^}]*width: 6px[^}]*height: 6px[^}]*background: #ff3b30/s,
  );
  assert.match(
    css,
    /\.account-drawer-integration \.feishu-integration-alert-dot\s*{[^}]*margin-left: auto/s,
  );
  assert.match(css, /\.feishu-auth-qr/);
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
  assert.match(css, /\.scene-grid/);
  assert.match(css, /\.agent-filter-tabs/);
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
  assert.match(css, /\.skill-card-title-row/);
  assert.match(css, /\.skill-sort-tabs/);
  assert.match(css, /\.skill-sort-tabs button\.selected/);
  assert.match(css, /\.scene-card\s*{[^}]*height: 104px/s);
  assert.doesNotMatch(css, /\.scene-avatar\s*{/);
  assert.doesNotMatch(css, /\.scene-status\s*{/);
  assert.match(css, /\.skill-card-title-row\s*{[^}]*gap: 12px/s);
  assert.match(css, /\.skill-agent-tag/);
  assert.match(css, /\.skill-use-overlay/);
  assert.match(css, /\.skill-use-overlay button\s*{[^}]*align-self: flex-end/s);
  assert.match(css, /\.skill-card:focus-within \.skill-use-overlay/);
  assert.match(expertWorkspace, /onSummonAgent/);
  assert.match(expertWorkspace, /召唤专家：/);
  assert.doesNotMatch(
    expertWorkspace,
    /summon-agent-button[\s\S]*?<Bot aria-hidden=/,
  );
  assert.match(expertWorkspace, /该专家暂无挂载技能/);
  assert.match(expertWorkspace, /可直接召唤专家处理相关问题/);
  assert.match(page, /selectedComposerExpert/);
  assert.match(page, /targetAgent/);
  assert.match(page, /Supervisor 已路由至/);
  assert.match(css, /\.summon-agent-button/);
  assert.doesNotMatch(css, /\.summon-agent-button\s*{[^}]*opacity:\s*0/s);
  assert.match(
    css,
    /\.summon-agent-button\s*{[^}]*background:\s*#171717;[^}]*color:\s*#ffffff;/s,
  );
  assert.match(css, /\.composer-expert-tag/);
  assert.match(
    css,
    /\.expert-workspace > h1,[\s\S]*\.expert-directory-heading h2,[\s\S]*\.skill-directory-heading h3\s*{[^}]*font-size: 28px/s,
  );
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
  assert.match(workflow, /codex\/交易智能助手-v2\.2/);
  assert.match(workflow, /codex\/交易智能助手-v2\.3-integrated/);
  assert.match(workflow, /versions\/classic/);
  assert.match(workflow, /versions\/audience-isolation/);
  assert.match(workflow, /versions\/scene-agent-skill/);
  assert.match(workflow, /versions\/integrated-expert-skills/);
  assert.match(versionSwitcher, /v2\.4/);
  assert.match(versionSwitcher, /v2\.3/);
  assert.match(versionSwitcher, /v2\.2/);
  assert.match(versionSwitcher, /v2\.1/);
  assert.match(versionSwitcher, /v2\.0/);
  assert.match(versionSwitcher, /技能平铺与专家标签/);
  assert.match(versionSwitcher, /专家技能一体化/);
  assert.match(versionSwitcher, /场景化专家技能/);
  assert.match(versionSwitcher, /对商\/对内知识隔离/);
  assert.match(versionSwitcher, /ta-version-latest/);
  assert.match(versionSwitcher, /最新版/);
  assert.match(versionSwitcher, /latest: true/);
  assert.match(versionSwitcher, /aria-current/);
  assert.match(flatSkillRedirect, /http-equiv="refresh"/);
  assert.match(flatSkillRedirect, /url=\.\.\/\.\.\//);
  assert.doesNotMatch(page, /fetch\("\/api\/runs"/);
  assert.doesNotMatch(page, /codex-preview|SkeletonPreview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
