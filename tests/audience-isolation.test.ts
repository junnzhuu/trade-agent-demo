import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAnswerFromEvidence,
  canDeriveMerchantVersion,
  createAudienceRunPlan,
  detectAudienceMode,
  detectQueryType,
  filterEvidenceForAudience,
} from "../lib/audience-isolation";

test("routes four query types and defaults the audience to internal", () => {
  assert.equal(detectQueryType("活动规则是什么"), "knowledge_qa");
  assert.equal(detectQueryType("查询活动审核进度"), "data_query");
  assert.equal(detectQueryType("分析商家经营风险"), "data_analysis");
  assert.equal(detectQueryType("导出待跟进清单"), "task_execution");
  assert.equal(detectAudienceMode("分析经营问题"), "internal");
  assert.equal(detectAudienceMode("生成回复商家的话术"), "merchant");
  assert.equal(detectAudienceMode("分别生成对运营和对商两个版本"), "both");
});

test("merchant answers never receive internal evidence", () => {
  const plan = createAudienceRunPlan(
    "请分别生成对运营和对商两个版本，说明活动审核结果。",
  );
  const merchantEvidence = filterEvidenceForAudience(plan.evidence, "merchant");
  assert.ok(merchantEvidence.length > 0);
  assert.ok(merchantEvidence.every((item) => item.visibility === "merchant"));

  const merchantAnswer = plan.answers.find(
    (answer) => answer.audience === "merchant",
  );
  const internalContents = plan.evidence
    .filter((item) => item.visibility === "internal")
    .map((item) => item.content);
  assert.ok(merchantAnswer);
  assert.ok(
    internalContents.every((content) => !merchantAnswer.content.includes(content)),
  );
});

test("degrades explicit merchant requests without merchant-visible evidence", () => {
  const plan = createAudienceRunPlan(
    "请向商家说明其内部风险等级和平台招商优先级。",
  );
  assert.equal(plan.audienceMode, "merchant");
  assert.equal(plan.fallback, "merchant_unavailable");
  assert.deepEqual(plan.answers, []);
  assert.equal(buildAnswerFromEvidence("merchant", plan.evidence), null);
});

test("derivation eligibility depends on evidence actually used", () => {
  const plan = createAudienceRunPlan("请分析北屿运动近期经营问题并给出建议。");
  const internalAnswer = plan.answers[0];
  assert.equal(internalAnswer.audience, "internal");
  assert.equal(
    canDeriveMerchantVersion(internalAnswer.usedEvidenceIds, plan.evidence),
    true,
  );
  assert.equal(
    canDeriveMerchantVersion(
      plan.evidence
        .filter((item) => item.visibility === "internal")
        .map((item) => item.id),
      plan.evidence,
    ),
    false,
  );
});

test("both mode plans two independently scoped answers", () => {
  const plan = createAudienceRunPlan(
    "请分别生成对运营和对商两个版本，说明活动审核结果。",
  );
  assert.deepEqual(
    plan.answers.map((answer) => answer.audience),
    ["internal", "merchant"],
  );
  assert.ok(plan.answers.every((answer) => !answer.canDeriveMerchant));
});
