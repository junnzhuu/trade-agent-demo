import assert from "node:assert/strict";
import test from "node:test";
import {
  getSceneStats,
  merchantOperationAgents,
  sceneCatalog,
} from "../lib/agent-skill-catalog";

test("defines five scenes with merchant operations available by default", () => {
  assert.deepEqual(
    sceneCatalog.map((scene) => scene.name),
    ["商家运营", "商品运营", "招商", "营销活动", "项目管理"],
  );
  assert.equal(sceneCatalog[0].status, "available");
  assert.ok(sceneCatalog.slice(1).every((scene) => scene.status === "coming-soon"));
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
