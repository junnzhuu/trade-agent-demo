import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveTaskName,
  formatBeijingDateTime,
  formatSchedule,
  getNextScheduledAt,
  parseScheduledTaskInput,
  validateScheduledTaskDraft,
  type ScheduledTaskDraft,
  type TaskSchedule,
} from "../lib/scheduled-tasks";

const now = Date.parse("2026-10-14T08:00:00+08:00"); // Wednesday
const base: ScheduledTaskDraft = {
  name: "运营日报",
  prompt: "查询上海今日气温",
  schedule: { kind: "daily", hour: 9, minute: 0 },
};

test("creates daily task from the empty-state example", () => {
  const result = parseScheduledTaskInput("每天上午 9 点生成昨日运营日报", {}, now);
  assert.equal(result.ready, true);
  assert.equal(result.draft.prompt, "生成昨日运营日报");
  assert.equal(result.draft.name, "生成昨日运营日报");
  assert.deepEqual(result.draft.schedule, { kind: "daily", hour: 9, minute: 0 });
});

test("extracts the task content from the original conversation example", () => {
  const result = parseScheduledTaskInput("帮我创建一个每天14:05分执行的查询上海今日气温的定时任务", {}, now);
  assert.equal(result.ready, true);
  assert.equal(result.draft.prompt, "查询上海今日气温");
  assert.equal(result.draft.name, "查询上海今日气温");
  assert.deepEqual(result.draft.schedule, { kind: "daily", hour: 14, minute: 5 });
  assert.equal(parseScheduledTaskInput("每天在上午9点查询上海气温", {}, now).draft.prompt, "查询上海气温");
});

test("understands supported daily, weekly and weekday clock forms", () => {
  const examples: [string, TaskSchedule][] = [
    ["每天14:05分执行查询上海气温", { kind: "daily", hour: 14, minute: 5 }],
    ["每周一09:30汇总销售数据", { kind: "weekly", weekday: 1, hour: 9, minute: 30 }],
    ["每星期天上午九点生成周报", { kind: "weekly", weekday: 0, hour: 9, minute: 0 }],
    ["每周一九点生成周报", { kind: "weekly", weekday: 1, hour: 9, minute: 0 }],
    ["工作日下午五点半提醒查看订单", { kind: "weekdays", hour: 17, minute: 30 }],
    ["每个工作日上午九点十五分查询气温", { kind: "weekdays", hour: 9, minute: 15 }],
    ["每天上午九点一刻查询气温", { kind: "daily", hour: 9, minute: 15 }],
    ["每天上午九点三刻查询气温", { kind: "daily", hour: 9, minute: 45 }],
    ["每日晚上十点查询气温", { kind: "daily", hour: 22, minute: 0 }],
    ["每天凌晨零点查询气温", { kind: "daily", hour: 0, minute: 0 }],
    ["每天中午十二点查询气温", { kind: "daily", hour: 12, minute: 0 }],
    ["帮我创建一个每天上午9点生成日报", { kind: "daily", hour: 9, minute: 0 }],
  ];
  for (const [input, schedule] of examples) {
    const result = parseScheduledTaskInput(input, {}, now);
    assert.equal(result.ready, true, input);
    assert.deepEqual(result.draft.schedule, schedule, input);
  }
});

test("creates absolute and relative once-only tasks in Beijing time", () => {
  for (const input of ["2026-10-15 09:00查询气温", "2026年10月15日上午九点查询气温", "明天上午九点查询气温"]) {
    const result = parseScheduledTaskInput(input, {}, now);
    assert.equal(result.ready, true, input);
    assert.deepEqual(result.draft.schedule, { kind: "once", runAt: Date.parse("2026-10-15T09:00:00+08:00") });
  }
  assert.equal(parseScheduledTaskInput("今天下午3点查询气温", {}, now).ready, true);
});

test("does not consume a content word as a Chinese minute", () => {
  const result = parseScheduledTaskInput("每天九点一键生成日报", {}, now);
  assert.equal(result.ready, true);
  assert.deepEqual(result.draft.schedule, { kind: "daily", hour: 9, minute: 0 });
  assert.equal(result.draft.prompt, "一键生成日报");
});

test("relative tomorrow correctly crosses Beijing month and year boundaries", () => {
  const result = parseScheduledTaskInput("明天零点生成日报", {}, Date.parse("2026-12-31T23:59:00+08:00"));
  assert.deepEqual(result.draft.schedule, { kind: "once", runAt: Date.parse("2027-01-01T00:00:00+08:00") });
  assert.equal(result.ready, true);
});

test("retains partial content and recurrence across a follow-up", () => {
  const first = parseScheduledTaskInput("每天生成昨日运营日报", {}, now);
  assert.equal(first.ready, false);
  assert.equal(first.draft.prompt, "生成昨日运营日报");
  assert.deepEqual(first.draft.pendingSchedule, { kind: "daily" });
  const second = parseScheduledTaskInput("上午9点", first.draft, now);
  assert.equal(second.ready, true);
  assert.deepEqual(second.draft.schedule, { kind: "daily", hour: 9, minute: 0 });
  assert.equal(second.draft.prompt, "生成昨日运营日报");
  assert.equal(second.draft.pendingSchedule, undefined);
});

test("retains a clock until the user supplies a recurrence", () => {
  const first = parseScheduledTaskInput("9点生成日报", {}, now);
  assert.equal(first.ready, false);
  assert.deepEqual(first.draft.pendingTime, { hour: 9, minute: 0 });
  const second = parseScheduledTaskInput("每天", first.draft, now);
  assert.equal(second.ready, true);
  assert.equal(second.draft.prompt, "生成日报");
});

test("retains complete schedule while waiting for content", () => {
  const first = parseScheduledTaskInput("每天9点", {}, now);
  assert.equal(first.ready, false);
  assert.equal(first.draft.name, undefined);
  const second = parseScheduledTaskInput("生成昨日运营日报", first.draft, now);
  assert.equal(second.ready, true);
  assert.equal(second.draft.prompt, "生成昨日运营日报");
});

test("retains content while missing a specific hour", () => {
  const first = parseScheduledTaskInput("每天上午生成日报", {}, now);
  assert.equal(first.ready, false);
  assert.equal(first.draft.prompt, "生成日报");
  assert.equal(parseScheduledTaskInput("上午9点", first.draft, now).ready, true);
});

test("an incomplete period never silently reuses an incompatible old hour", () => {
  for (const input of ["改成每天下午执行", "时间改为下午"]) {
    const first = parseScheduledTaskInput(input, base, now, true);
    assert.equal(first.ready, false, input);
    assert.equal(first.draft.schedule, undefined, input);
    assert.equal(first.draft.prompt, base.prompt, input);
    const second = parseScheduledTaskInput("3点", first.draft, now, true);
    assert.equal(second.ready, true, input);
    assert.deepEqual(second.draft.schedule, { kind: "daily", hour: 15, minute: 0 }, input);
  }
  const first = parseScheduledTaskInput("每天上午生成昨日运营日报", {}, now);
  const second = parseScheduledTaskInput("9点", first.draft, now);
  assert.equal(second.ready, true);
  assert.deepEqual(second.draft.schedule, { kind: "daily", hour: 9, minute: 0 });
  assert.equal(second.draft.prompt, "生成昨日运营日报");
});

test("name, prompt and schedule edits preserve all unmentioned fields", () => {
  const name = parseScheduledTaskInput("名称改为天气日报", base, now, true);
  assert.equal(name.ready, true);
  assert.deepEqual(name.draft, { ...base, name: "天气日报" });
  const prompt = parseScheduledTaskInput("执行内容改为查询北京今日气温", base, now, true);
  assert.equal(prompt.ready, true);
  assert.deepEqual(prompt.draft, { ...base, prompt: "查询北京今日气温" });
  const schedule = parseScheduledTaskInput("改成每天10点执行", base, now, true);
  assert.equal(schedule.ready, true);
  assert.deepEqual(schedule.draft, { ...base, schedule: { kind: "daily", hour: 10, minute: 0 } });
  assert.deepEqual(base.schedule, { kind: "daily", hour: 9, minute: 0 });
});

test("changing only period or only clock retains the other schedule component", () => {
  const period = parseScheduledTaskInput("改成每周一执行", base, now, true);
  assert.deepEqual(period.draft.schedule, { kind: "weekly", weekday: 1, hour: 9, minute: 0 });
  const clock = parseScheduledTaskInput("改成下午三点半执行", base, now, true);
  assert.deepEqual(clock.draft.schedule, { kind: "daily", hour: 15, minute: 30 });
});

test("explicit name persists when prompt changes and combined edits are recognized", () => {
  const result = parseScheduledTaskInput("名称改为日报，执行内容改为分析订单，汇总异常，时间改为工作日17:30", base, now, true);
  assert.equal(result.ready, true);
  assert.equal(result.draft.name, "日报");
  assert.equal(result.draft.prompt, "分析订单，汇总异常");
  assert.deepEqual(result.draft.schedule, { kind: "weekdays", hour: 17, minute: 30 });
});

test("explicit content is never parsed as a schedule instruction", () => {
  const result = parseScheduledTaskInput("执行内容改为分析每天9点的订单，比较每月变化", base, now, true);
  assert.equal(result.ready, true);
  assert.deepEqual(result.draft.schedule, base.schedule);
  assert.equal(result.draft.prompt, "分析每天9点的订单，比较每月变化");
});

test("rejects unsupported, ambiguous and invalid schedules even with an existing valid draft", () => {
  const rejected = [
    "每月1号9点生成日报", "每隔30分钟生成日报", "每小时生成日报", "每两天9点生成日报",
    "每周一和周二9点生成日报", "每周一至周五9点生成日报", "每天9点和下午3点生成日报",
    "每天25点生成日报", "每天9:60生成日报", "每天24:00生成日报", "每天下午13点生成日报",
    "每天晚上十二点生成日报", "每天9点左右生成日报", "每天9点前生成日报", "每天9.5点生成日报",
    "每天早一点生成日报", "每天晚一点生成日报", "改成早点执行", "每天九点十五生成日报",
    "每天9:生成日报", "每天9:30:00生成日报", "每天9点30分30秒生成日报",
    "2026-02-30 9点生成日报", "2026-13-01 9点生成日报", "周一9点生成日报", "10月20日9点生成日报",
    "下周一9点生成日报", "后天9点生成日报", "每周9点生成日报", "明天或今天9点生成日报",
  ];
  for (const input of rejected) {
    const result = parseScheduledTaskInput(input, base, now, true);
    assert.equal(result.ready, false, input);
    assert.deepEqual(result.draft, base, input);
    assert.ok(result.message, input);
  }
});

test("rejects empty changes or unknown editing requests without re-confirming stale draft", () => {
  for (const input of ["", "名称改为", "执行内容改为", "时间改为", "执行周期改为", "随便调整一下", "删除", "好的"]) {
    assert.equal(parseScheduledTaskInput(input, base, now, true).ready, false, input);
  }
});

test("past or exactly current once-only time cannot be saved", () => {
  for (const input of ["今天7:59查询气温", "今天8:00查询气温", "2025-01-01 9点查询气温"]) {
    const result = parseScheduledTaskInput(input, {}, now);
    assert.equal(result.ready, false, input);
    assert.match(result.message, /过去/);
  }
  const future = parseScheduledTaskInput("今天8:01查询气温", {}, now);
  assert.equal(future.ready, true);
  assert.match(validateScheduledTaskDraft(future.draft, now + 60_000) ?? "", /过去/);
});

test("once-only tasks expose no next execution after expiration", () => {
  const schedule: TaskSchedule = { kind: "once", runAt: now + 60_000 };
  assert.equal(getNextScheduledAt(schedule, now), now + 60_000);
  assert.equal(getNextScheduledAt(schedule, now + 60_000), null);
  assert.equal(getNextScheduledAt(schedule, now + DAY), null);
});

const DAY = 86_400_000;

test("daily next execution rolls across month and year boundaries", () => {
  const daily: TaskSchedule = { kind: "daily", hour: 9, minute: 0 };
  assert.equal(getNextScheduledAt(daily, now), Date.parse("2026-10-14T09:00:00+08:00"));
  assert.equal(getNextScheduledAt(daily, Date.parse("2026-10-14T09:00:00+08:00")), Date.parse("2026-10-15T09:00:00+08:00"));
  assert.equal(getNextScheduledAt(daily, Date.parse("2026-12-31T20:00:00+08:00")), Date.parse("2027-01-01T09:00:00+08:00"));
});

test("weekly next execution includes next week when today's clock has passed", () => {
  const weekly: TaskSchedule = { kind: "weekly", weekday: 3, hour: 7, minute: 30 };
  assert.equal(getNextScheduledAt(weekly, now), Date.parse("2026-10-21T07:30:00+08:00"));
  const sunday: TaskSchedule = { kind: "weekly", weekday: 0, hour: 9, minute: 0 };
  assert.equal(getNextScheduledAt(sunday, now), Date.parse("2026-10-18T09:00:00+08:00"));
});

test("weekday schedule skips Saturday and Sunday", () => {
  const schedule: TaskSchedule = { kind: "weekdays", hour: 9, minute: 0 };
  for (const current of ["2026-10-16T10:00:00+08:00", "2026-10-17T08:00:00+08:00", "2026-10-18T10:00:00+08:00"]) {
    assert.equal(getNextScheduledAt(schedule, Date.parse(current)), Date.parse("2026-10-19T09:00:00+08:00"));
  }
});

test("calculation and display do not depend on the browser or host timezone", () => {
  const previous = process.env.TZ;
  try {
    for (const timezone of ["UTC", "America/Los_Angeles", "Asia/Shanghai"]) {
      process.env.TZ = timezone;
      assert.equal(formatBeijingDateTime(now), "2026-10-14 08:00");
      assert.deepEqual(parseScheduledTaskInput("明天9点生成日报", {}, now).draft.schedule, { kind: "once", runAt: Date.parse("2026-10-15T09:00:00+08:00") });
      assert.equal(getNextScheduledAt({ kind: "daily", hour: 9, minute: 0 }, now), Date.parse("2026-10-14T09:00:00+08:00"));
    }
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test("formats human-readable schedule labels and derives concise names", () => {
  assert.equal(formatSchedule({ kind: "daily", hour: 9, minute: 0 }), "每天 09:00");
  assert.equal(formatSchedule({ kind: "weekdays", hour: 17, minute: 30 }), "工作日 17:30");
  assert.equal(formatSchedule({ kind: "weekly", weekday: 0, hour: 9, minute: 0 }), "每周日 09:00");
  assert.equal(formatSchedule({ kind: "once", runAt: now }), "2026-10-14 08:00（一次性）");
  assert.equal(deriveTaskName("请帮我生成昨日运营日报。"), "生成昨日运营日报");
  assert.ok(deriveTaskName("生成所有交易部门和招商团队的完整经营分析和复盘报告").length <= 19);
});

test("draft validation rejects invalid schedules and missing required fields", () => {
  assert.equal(validateScheduledTaskDraft(base, now), null);
  assert.ok(validateScheduledTaskDraft({ ...base, prompt: " " }, now));
  assert.ok(validateScheduledTaskDraft({ ...base, name: " " }, now));
  assert.ok(validateScheduledTaskDraft({ ...base, schedule: undefined }, now));
  assert.ok(validateScheduledTaskDraft({ ...base, schedule: { kind: "daily", hour: 24, minute: 0 } }, now));
  assert.ok(validateScheduledTaskDraft({ ...base, schedule: { kind: "weekly", weekday: 7, hour: 9, minute: 0 } }, now));
  assert.equal(getNextScheduledAt({ kind: "daily", hour: 24, minute: 0 }, now), null);
});
