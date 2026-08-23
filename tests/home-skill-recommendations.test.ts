import assert from "node:assert/strict";
import test from "node:test";
import { expertCatalog } from "../lib/expert-catalog";
import {
  getHomeExpertById,
  getHomeExperts,
  getHomeSuggestedQuestions,
  getHomeSkills,
  homeSkillCategories,
} from "../lib/home-skill-recommendations";

test("recommends experts first and exposes their mounted skills", () => {
  const recommendedExperts = getHomeExperts("recommended");
  assert.equal(recommendedExperts.length, 7);
  assert.equal(recommendedExperts[0]?.name, "商品经营分析专家");
  assert.ok(recommendedExperts.every((expert) => expert.skills.length > 0));

  const merchantExperts = getHomeExperts("merchant");
  assert.equal(merchantExperts.length, 7);
  const analysisExpert = getHomeExpertById("data-analysis-agent");
  assert.equal(analysisExpert?.name, "商品经营分析专家");
  assert.equal(analysisExpert?.skills.length, 2);
});

test("uses the requested merchant skills for the default recommendations", () => {
  const recommendations = getHomeSkills("recommended");

  assert.deepEqual(
    recommendations.map((skill) => skill.name),
    [
      "商家资质查询",
      "商家违规单查询",
      "商家直发资格查询",
      "单品诊断",
      "手续费订单查询与解析",
      "受损单诊断",
      "出价权限查询",
    ],
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

test("provides up to six stable questions for every scene", () => {
  for (const category of homeSkillCategories) {
    const questions = getHomeSuggestedQuestions(category.id);
    assert.ok(questions.length > 0 && questions.length <= 6);
    assert.deepEqual(questions, getHomeSkills(category.id).slice(0, 6));
  }

  assert.notDeepEqual(
    getHomeSuggestedQuestions("merchant").map((item) => item.id),
    getHomeSuggestedQuestions("product").map((item) => item.id),
  );
});

test("provides five business category tabs with up to seven skills each", () => {
  assert.deepEqual(
    homeSkillCategories.map((category) => category.label),
    ["为你推荐", "商家运营", "商品运营", "招商", "营销活动", "项目管理"],
  );

  assert.equal(getHomeSkills("merchant").length, 7);
  for (const category of homeSkillCategories.slice(2)) {
    assert.equal(getHomeSkills(category.id).length, 5);
  }
});
