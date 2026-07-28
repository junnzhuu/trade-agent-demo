import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships the trading agent workspace instead of the starter preview", async () => {
  const [page, layout, css, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /title: "交易 Agent｜多智能体业务工作台"/);
  assert.match(page, /交易业务智能工作台/);
  assert.match(page, /日常运营 Agent/);
  assert.match(page, /营销活动 Agent/);
  assert.match(page, /演示数据/);
  assert.match(page, /aria-live="polite"/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(page, /codex-preview|SkeletonPreview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
