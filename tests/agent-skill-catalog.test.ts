import assert from "node:assert/strict";
import test from "node:test";
import {
  getSceneStats,
  merchantOperationAgents,
  quickComposerExperts,
  sceneCatalog,
} from "../lib/agent-skill-catalog";

test("defines five scenes with merchant, product and project available", () => {
  assert.deepEqual(
    sceneCatalog.map((scene) => scene.name),
    ["商家运营", "商品运营", "招商", "营销活动", "项目管理"],
  );
  assert.equal(sceneCatalog[0].status, "available");
  assert.equal(sceneCatalog[1].status, "available");
  assert.equal(sceneCatalog[2].status, "coming-soon");
  assert.equal(sceneCatalog[3].status, "coming-soon");
  assert.equal(sceneCatalog[4].status, "available");
});

test("adds the product and project function directories", () => {
  const product = sceneCatalog.find((scene) => scene.id === "product");
  const project = sceneCatalog.find((scene) => scene.id === "project");

  assert.ok(product);
  assert.ok(project);
  assert.deepEqual(product.agents.map((agent) => agent.name), ["商品运营专家"]);
  assert.deepEqual(
    product.agents.flatMap((agent) => agent.skills.map((skill) => skill.name)),
    ["商机洞察", "商详内容诊断"],
  );
  assert.deepEqual(project.agents.map((agent) => agent.name), [
    "MRD撰写专家",
    "项目管理专家",
  ]);
  assert.deepEqual(
    project.agents.flatMap((agent) => agent.skills.map((skill) => skill.name)),
    ["MRD撰写", "提需流程答疑", "RDC提报"],
  );
});

test("preserves all workbook agent and skill mount relationships", () => {
  const merchantStats = getSceneStats(sceneCatalog[0]);

  assert.equal(merchantStats.expertCount, 12);
  assert.equal(merchantStats.skillCount, 39);
  assert.equal(
    merchantOperationAgents.filter((agent) => agent.skills.length === 0).length,
    3,
  );
  assert.deepEqual(
    merchantOperationAgents.slice(0, 4).map((agent) => agent.name),
    ["商家运营专家", "商品经营分析专家", "AB 实验专家", "寄存业务专家"],
  );
});

test("keeps repeated skill mounts unique per agent", () => {
  const mounts = merchantOperationAgents.flatMap((agent) => agent.skills);
  const realtimeQueryMounts = mounts.filter(
    (skill) => skill.id === "dewu-trade-api-invoke",
  );

  assert.equal(realtimeQueryMounts.length, 2);
  assert.equal(new Set(mounts.map((skill) => skill.mountKey)).size, 39);
  assert.ok(mounts.every((skill) => skill.description.length > 0));
  assert.ok(mounts.every((skill) => skill.standardQuestion.length > 0));
});

test("provides a direct summon question for every expert", () => {
  assert.equal(merchantOperationAgents.length, 12);
  assert.ok(
    merchantOperationAgents.every(
      (agent) =>
        agent.standardQuestion.replace(/^请召唤\s*/u, "").startsWith(agent.name) &&
        agent.standardQuestion.length > agent.name.length + 4,
    ),
  );
  assert.deepEqual(
    merchantOperationAgents
      .filter((agent) => agent.skills.length === 0)
      .map((agent) => agent.name),
    ["商家运营专家", "安全服务专家", "权限服务专家"],
  );
});

test("provides the four plain-text quick composer experts", () => {
  assert.deepEqual(
    quickComposerExperts.map((agent) => agent.name),
    [
      "商家运营专家",
      "营销招商活动专家",
      "MRD撰写专家",
      "商品运营专家",
    ],
  );
  assert.ok(
    quickComposerExperts.every(
      (agent) => agent.standardQuestion.length > agent.name.length,
    ),
  );
});
