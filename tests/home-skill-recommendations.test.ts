import assert from "node:assert/strict";
import test from "node:test";
import {
  frequentHomeExperts,
  frequentHomeSkills,
  getExpertComposerSelectionAction,
  getHomeCategorySkills,
  getHomeCategoryTargetScene,
  getHomeExpertById,
  getHomeSuggestedQuestions,
  homeSkillCategories,
} from "../lib/home-skill-recommendations";

test("provides the five fixed common experts in catalog order", () => {
  assert.deepEqual(
    frequentHomeExperts.map((expert) => expert.name),
    [
      "商家运营专家",
      "商品经营分析专家",
      "AB 实验专家",
      "寄存业务专家",
      "交易实时查询专家",
    ],
  );
  assert.ok(frequentHomeExperts.every((expert) => expert.standardQuestion));
});

test("provides five common skills with their owning experts", () => {
  assert.deepEqual(
    frequentHomeSkills.map((skill) => [skill.name, skill.expertName]),
    [
      ["单品诊断", "商品经营分析专家"],
      ["AB 实验结果分析", "AB 实验专家"],
      ["寄存单据查询", "寄存业务专家"],
      ["交易实时查询", "交易实时查询专家"],
      ["商品基础信息查询", "交易实时查询专家"],
    ],
  );
  assert.ok(frequentHomeSkills.every((skill) => skill.standardQuestion));
  assert.ok(
    frequentHomeSkills.every(
      (skill) => getHomeExpertById(skill.expertId)?.name === skill.expertName,
    ),
  );
});

test("keeps merchant suggested questions stable and capped at six", () => {
  const questions = getHomeSuggestedQuestions();
  assert.equal(questions.length, 6);
  assert.deepEqual(questions, getHomeSuggestedQuestions());
  assert.ok(questions.every((question) => question.standardQuestion));
});

test("provides six homepage scenes with scene-specific skills and questions", () => {
  assert.deepEqual(
    homeSkillCategories.map((category) => category.label),
    ["为你推荐", "商家运营", "商品运营", "招商", "营销活动", "项目管理"],
  );
  for (const category of homeSkillCategories) {
    const skills = getHomeCategorySkills(category.id);
    const questions = getHomeSuggestedQuestions(category.id);
    assert.ok(skills.length > 0 && skills.length <= 5);
    assert.ok(questions.length > 0 && questions.length <= 6);
    assert.ok(skills.every((skill) => skill.standardQuestion));
  }
});

test("routes more skills to the matching scene and recommendations to merchant", () => {
  assert.equal(getHomeCategoryTargetScene("recommended"), "merchant");
  for (const category of homeSkillCategories.filter(
    (item) => item.id !== "recommended",
  )) {
    assert.equal(getHomeCategoryTargetScene(category.id), category.id);
  }
});

test("selects the correct composer action when binding an expert", () => {
  assert.equal(
    getExpertComposerSelectionAction({ expertId: "a", input: "" }),
    "fill_expert_question",
  );
  assert.equal(
    getExpertComposerSelectionAction({ expertId: "a", input: "已有问题" }),
    "preserve_text",
  );
  assert.equal(
    getExpertComposerSelectionAction({
      expertId: "a",
      input: "技能标准问",
      selectedSkillExpertId: "a",
    }),
    "preserve_compatible_skill",
  );
  assert.equal(
    getExpertComposerSelectionAction({
      expertId: "a",
      input: "技能标准问",
      selectedSkillExpertId: "b",
    }),
    "remove_incompatible_skill",
  );
});
