import assert from "node:assert/strict";
import test from "node:test";
import { expertCatalog } from "../lib/expert-catalog";
import {
  getHomeBannerSkills,
  getHomeSkills,
  homeSkillCategories,
} from "../lib/home-skill-recommendations";

test("uses the requested merchant skills for the default recommendations", () => {
  const recommendations = getHomeSkills("recommended");

  assert.deepEqual(
    recommendations.map((skill) => skill.name),
    ["商家资质查询", "商家违规单查询", "商家直发资格查询", "单品诊断"],
  );

  const merchantSkills = expertCatalog.find((expert) => expert.id === "merchant")?.skills;
  assert.ok(merchantSkills);
  assert.ok(
    recommendations.every((recommendation) =>
      merchantSkills.some(
        (skill) =>
          skill.id === recommendation.id &&
          skill.description === recommendation.description &&
          skill.standardQuestion === recommendation.standardQuestion,
      ),
    ),
  );
});

test("keeps the banner limited to the three merchant queries", () => {
  assert.deepEqual(
    getHomeBannerSkills().map((skill) => skill.name),
    ["商家资质查询", "商家违规单查询", "商家直发资格查询"],
  );
});

test("provides five business category tabs with four skills each", () => {
  assert.deepEqual(
    homeSkillCategories.map((category) => category.label),
    ["为你推荐", "商家运营", "商品运营", "招商", "营销活动", "项目管理"],
  );

  for (const category of homeSkillCategories.slice(1)) {
    assert.equal(getHomeSkills(category.id).length, 4);
  }
});
