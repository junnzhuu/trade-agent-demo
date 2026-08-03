import assert from "node:assert/strict";
import test from "node:test";
import {
  ONBOARDING_DISMISSED_VALUE,
  onboardingSteps,
  shouldAutoStartOnboarding,
} from "../lib/onboarding-tour";

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
});

test("auto starts only until the versioned tour has been dismissed", () => {
  assert.equal(shouldAutoStartOnboarding(null), true);
  assert.equal(shouldAutoStartOnboarding("unknown"), true);
  assert.equal(
    shouldAutoStartOnboarding(ONBOARDING_DISMISSED_VALUE),
    false,
  );
});
