import assert from "node:assert/strict";
import test from "node:test";
import { expertCatalog } from "../lib/expert-catalog";

test("defines five domain experts with unique ids", () => {
  assert.equal(expertCatalog.length, 5);
  assert.equal(
    new Set(expertCatalog.map((expert) => expert.id)).size,
    expertCatalog.length,
  );
  assert.deepEqual(
    expertCatalog.map((expert) => expert.name),
    [
      "商家运营专家",
      "商品运营专家",
      "招商专家",
      "营销活动专家",
      "项目管理专家",
    ],
  );
});

test("uses merchant operations as the default 24-card catalog", () => {
  const merchantExpert = expertCatalog[0];

  assert.equal(merchantExpert.id, "merchant");
  assert.equal(merchantExpert.abilityCount, 25);
  assert.equal(merchantExpert.skills.length, 24);
  assert.equal(merchantExpert.skills[0].name, "单品诊断");
  assert.ok(
    merchantExpert.skills.some(
      (skill) => skill.name === "寄存单据综合查询分析",
    ),
  );
});

test("defines selectable demo skills for every expert", () => {
  for (const expert of expertCatalog) {
    assert.ok(expert.skills.length > 0);
    assert.equal(
      new Set(expert.skills.map((skill) => skill.id)).size,
      expert.skills.length,
    );
    assert.ok(expert.skills.every((skill) => skill.description.length > 0));
  }
});
