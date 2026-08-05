import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPromptWithSkills,
  composerSkillOptions,
  filterComposerSkills,
  getSkillTrigger,
  removeSkillTrigger,
} from "../lib/composer-skills";

test("exposes every skill with its expert label and canonical description", () => {
  assert.equal(composerSkillOptions.length, 44);

  const qualification = composerSkillOptions.find(
    (skill) => skill.name === "商家资质查询",
  );
  assert.ok(qualification);
  assert.equal(qualification.expertLabel, "商家专家");
  assert.equal(
    qualification.description,
    "查询资质是否过期、出价权限、品牌直发资格等",
  );
});

test("recognizes and removes a slash skill trigger at the caret", () => {
  const input = "请帮我看一下 /资质";
  const trigger = getSkillTrigger(input);
  assert.deepEqual(trigger, {
    start: 7,
    end: input.length,
    query: "资质",
  });
  assert.equal(removeSkillTrigger(input, trigger!), "请帮我看一下 ");
  assert.equal(getSkillTrigger("https://example.com"), null);
});

test("filters by title, expert label, and description", () => {
  assert.ok(
    filterComposerSkills("商家专家").every(
      (skill) => skill.expertLabel === "商家专家",
    ),
  );
  assert.deepEqual(
    filterComposerSkills("资质是否过期").map((skill) => skill.name),
    ["商家资质查询"],
  );
});

test("builds one prompt from multiple selected skills and free text", () => {
  const selected = composerSkillOptions.filter((skill) =>
    ["商家资质查询", "商家违规单查询"].includes(skill.name),
  );
  assert.equal(
    buildPromptWithSkills("检查商家 10086", selected),
    "使用技能 「商家违规单查询」、「商家资质查询」：检查商家 10086",
  );
});
