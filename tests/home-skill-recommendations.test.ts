import assert from "node:assert/strict";
import test from "node:test";
import {
  frequentHomeExperts,
  frequentHomeSkills,
  getHomeExpertById,
  getHomeSuggestedQuestions,
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
