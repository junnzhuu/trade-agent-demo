import assert from "node:assert/strict";
import test from "node:test";
import {
  agentSkillCatalogSource,
  getSceneStats,
  merchantOperationAgents,
  quickComposerExperts,
  sceneCatalog,
} from "../lib/agent-skill-catalog";

test("uses the latest Feishu catalog snapshot", () => {
  assert.deepEqual(agentSkillCatalogSource, {
    sheet: "AGENT&SKILL介绍",
    range: "A1:M72",
    revision: 848,
    rawSkillMountCount: 47,
    excludedMissingQuestionCount: 4,
    visibleSkillMountCount: 43,
  });
});

test("maps source agents to five available scenes in source order", () => {
  assert.deepEqual(
    sceneCatalog.map((scene) => [scene.id, scene.name]),
    [
      ["merchant", "商家运营"],
      ["campaign", "营销"],
      ["project", "需求管理"],
      ["product", "商品"],
      ["acquisition", "招商"],
    ],
  );
  assert.ok(sceneCatalog.every((scene) => scene.status === "available"));
});

test("preserves all non-bidding experts and usable skill mounts", () => {
  const stats = Object.fromEntries(
    sceneCatalog.map((scene) => [scene.id, getSceneStats(scene)]),
  );

  assert.deepEqual(stats, {
    merchant: { expertCount: 12, skillCount: 40 },
    campaign: { expertCount: 3, skillCount: 0 },
    project: { expertCount: 4, skillCount: 3 },
    product: { expertCount: 5, skillCount: 0 },
    acquisition: { expertCount: 4, skillCount: 0 },
  });
  assert.equal(
    sceneCatalog.reduce((total, scene) => total + scene.agents.length, 0),
    28,
  );
  assert.equal(
    sceneCatalog.reduce(
      (total, scene) => total + getSceneStats(scene).skillCount,
      0,
    ),
    43,
  );
  assert.ok(
    sceneCatalog.every((scene) =>
      scene.agents.every((agent) => agent.id !== "price-operation-agent"),
    ),
  );
});

test("keeps source order, repeated mounts and empty experts", () => {
  assert.deepEqual(
    merchantOperationAgents.slice(0, 5).map((agent) => agent.name),
    [
      "商家运营专家",
      "商品经营分析专家",
      "AB 实验专家",
      "寄存业务专家",
      "交易实时查询专家",
    ],
  );

  const merchantMounts = merchantOperationAgents.flatMap(
    (agent) => agent.skills,
  );
  assert.equal(
    merchantMounts.filter((skill) => skill.id === "dewu-trade-api-invoke")
      .length,
    2,
  );
  assert.equal(new Set(merchantMounts.map((skill) => skill.mountKey)).size, 40);
  assert.deepEqual(
    merchantOperationAgents
      .filter((agent) => agent.skills.length === 0)
      .map((agent) => agent.name),
    ["安全服务专家", "权限服务专家"],
  );
});

test("filters only source skills without a standard question", () => {
  const allSkills = sceneCatalog.flatMap((scene) =>
    scene.agents.flatMap((agent) => agent.skills),
  );
  const hiddenSkillIds = [
    "activity-robot-command",
    "brand-new-user-gift-qa",
    "supply-coupon-qa",
    "platform-promotion-activity-qa",
  ];

  assert.ok(allSkills.every((skill) => skill.standardQuestion.length > 0));
  assert.ok(allSkills.every((skill) => !hiddenSkillIds.includes(skill.id)));
  assert.equal(
    allSkills.find((skill) => skill.id === "find-user-fallback")
      ?.standardQuestion,
    "根据找人地图，帮我找",
  );
});

test("splits requirement-management skills and keeps them under the source expert", () => {
  const requirementScene = sceneCatalog.find((scene) => scene.id === "project");
  assert.ok(requirementScene);
  assert.deepEqual(
    requirementScene.agents.map((agent) => [
      agent.name,
      agent.skills.map((skill) => skill.name),
    ]),
    [
      ["PRD撰写专家", []],
      ["MRD撰写专家", ["MRD需求提案建档", "MRD需求澄清", "MRD文档生成"]],
      ["提需流程答疑专家", []],
      ["RDC提报专家", []],
    ],
  );
});

test("keeps the homepage compatibility experts backed by source data", () => {
  assert.deepEqual(
    quickComposerExperts.map((agent) => agent.name),
    ["商家运营专家", "营销招商活动助手", "MRD撰写专家", "商品运营专家"],
  );
  assert.ok(quickComposerExperts.every((agent) => agent.standardQuestion));
});
