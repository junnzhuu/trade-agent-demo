import assert from "node:assert/strict";
import test from "node:test";
import { onboardingSteps } from "../lib/onboarding-tour";

test("defines a stable sixteen-step full product tour", () => {
  assert.equal(onboardingSteps.length, 16);
  assert.equal(new Set(onboardingSteps.map((step) => step.id)).size, 16);
  assert.equal(onboardingSteps[0].id, "welcome");
  assert.equal(onboardingSteps.at(-1)?.id, "automation");
  assert.ok(
    onboardingSteps
      .filter((step) => step.id !== "welcome")
      .every((step) => Boolean(step.targetId)),
  );
  assert.match(
    onboardingSteps.find((step) => step.id === "add-menu")?.description ?? "",
    /添加文件和计划模式/,
  );
  assert.equal(
    onboardingSteps.some((step) =>
      `${step.title}${step.description}`.includes("深度思考"),
    ),
    false,
  );
});
