import assert from "node:assert/strict";
import test from "node:test";
import {
  CREATE_SCHEDULED_TASK_PROMPT,
  EDIT_SCHEDULED_TASK_PROMPT,
  getScheduledTaskEditPrompt,
  processScheduledTaskChat,
  restoreScheduledConversation,
  snapshotScheduledConversation,
} from "../lib/scheduled-task-chat";
import { createScheduledTaskStorage, parseScheduledTasksSnapshot } from "../lib/scheduled-task-storage";
import type { ScheduledTask } from "../lib/scheduled-tasks";

const now = Date.parse("2026-10-15T08:00:00+08:00");
function existing(id = "weather"): ScheduledTask {
  return {
    id, name: "上海气温", prompt: "查询上海今日气温",
    schedule: { kind: "daily", hour: 9, minute: 0 }, enabled: false,
    createdAt: now, updatedAt: now,
    sourceConversation: {
      id: `chat-${id}`, title: "查询气温", createdAt: now, updatedAt: now,
      messages: [{ id: "question", role: "user", content: `${CREATE_SCHEDULED_TASK_PROMPT}每天9点查询上海今日气温` }, { id: "answer", role: "assistant", content: "已创建定时任务。" }],
    },
  };
}

test("creates from the homepage prefill, restores the source conversation and edits only the intended fields", () => {
  let raw: string | null = null;
  const adapter = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } };
  const storage = createScheduledTaskStorage({ getStorage: () => adapter });
  const created = processScheduledTaskChat(`${CREATE_SCHEDULED_TASK_PROMPT}每天上午9点生成昨日运营日报`, "report-chat", [], undefined, now, () => "report");
  assert.ok(created?.task);
  const report = created.task;
  assert.equal(report.enabled, true);
  const conversation = restoreScheduledConversation(report);
  conversation.id = "report-chat";
  conversation.messages = [{ id: "q", role: "user", content: `${CREATE_SCHEDULED_TASK_PROMPT}每天上午9点生成昨日运营日报` }, { id: "a", role: "assistant", content: created.message }];
  const saved = { ...report, sourceConversation: snapshotScheduledConversation(conversation) };
  assert.equal(storage.saveScheduledTask(saved, "create").ok, true);
  storage.saveScheduledTask(existing(), "create");
  const afterRefresh = parseScheduledTasksSnapshot(storage.getScheduledTasksSnapshot()).tasks;
  const restored = restoreScheduledConversation(afterRefresh.find((item) => item.id === "report")!);
  assert.deepEqual(restored.messages, conversation.messages);
  assert.equal(restored.id, "report-chat");

  for (const [input, field, expected] of [
    ["名称改为运营日报", "name", "运营日报"],
    ["执行内容改为查询北京今日气温", "prompt", "查询北京今日气温"],
    ["改成每天10点执行", "schedule", { kind: "daily", hour: 10, minute: 0 }],
  ] as const) {
    const before = parseScheduledTasksSnapshot(storage.getScheduledTasksSnapshot()).tasks;
    const original = before.find((item) => item.id === "report")!;
    const changed = processScheduledTaskChat(`${EDIT_SCHEDULED_TASK_PROMPT}${input}`, restored.id, before, undefined, now + 1_000, () => { throw new Error("editing must retain the task ID"); });
    assert.ok(changed?.task);
    assert.equal(changed.mode, "update");
    assert.deepEqual(changed.task, { ...original, [field]: expected, enabled: true, updatedAt: now + 1_000 });
    assert.equal(storage.saveScheduledTask(changed.task, "update").ok, true);
    assert.deepEqual(parseScheduledTasksSnapshot(storage.getScheduledTasksSnapshot()).tasks.find((item) => item.id === "weather"), existing());
  }
  storage.deleteScheduledTask(report.id);
  assert.deepEqual(parseScheduledTasksSnapshot(createScheduledTaskStorage({ getStorage: () => adapter }).getScheduledTasksSnapshot()).tasks, [existing()]);
});

test("the named edit prefill updates the original task without treating its name as task content", () => {
  for (const name of ["上海每周天气预报", "上海「周报」，09:00"]) {
    const task = { ...existing(), name };
    const prefix = getScheduledTaskEditPrompt(task.name);
    assert.equal(prefix, `帮我修改定时任务「${name}」，`);
    const result = processScheduledTaskChat(`${prefix}改成每天10点执行`, task.sourceConversation!.id, [task], undefined, now + 1_000, () => { throw new Error("editing must retain the task ID"); });
    assert.equal(result?.mode, "update");
    assert.deepEqual(result?.task, {
      ...task, schedule: { kind: "daily", hour: 10, minute: 0 }, enabled: true, updatedAt: now + 1_000,
    });
  }
});

test("missing time retains content, follow-up completes it and cancel abandons the draft", () => {
  const first = processScheduledTaskChat(`${CREATE_SCHEDULED_TASK_PROMPT}生成昨日运营日报`, "chat", [], undefined, now, () => "new");
  assert.ok(first?.draft);
  assert.equal(first.task, undefined);
  const done = processScheduledTaskChat("每天上午9点", "chat", [], first.draft, now, () => "new");
  assert.equal(done?.task?.prompt, "生成昨日运营日报");
  assert.deepEqual(done?.task?.schedule, { kind: "daily", hour: 9, minute: 0 });
  const cancelled = processScheduledTaskChat("取消", "chat", [], first.draft, now, () => "unused");
  assert.equal(cancelled?.draft, undefined);
  assert.equal(cancelled?.task, undefined);
  assert.match(cancelled?.message ?? "", /已取消/);
  assert.equal(processScheduledTaskChat("帮我分析昨日GMV", "chat", [], undefined, now, () => "unused"), null);
});

test("invalid or past schedules never produce a task; ordinary chat retains its original route", () => {
  for (const text of ["每天25点生成日报", "2026-10-14 09:00生成日报", "每隔1分钟查询气温", "明天下午3点或4点查询气温"]) {
    const result = processScheduledTaskChat(`${CREATE_SCHEDULED_TASK_PROMPT}${text}`, "chat", [], undefined, now, () => "unused");
    assert.ok(result?.draft, text);
    assert.equal(result.task, undefined, text);
  }
  assert.equal(processScheduledTaskChat("查一下定时任务这个产品的使用数据", "chat", [], undefined, now, () => "unused"), null);
  const missing = processScheduledTaskChat(`${EDIT_SCHEDULED_TASK_PROMPT}名称改为日报`, "other-chat", [existing()], undefined, now, () => "unused");
  assert.equal(missing?.task, undefined);
  assert.match(missing?.message ?? "", /未找到/);
});

test("an incomplete edit can be cancelled or completed without reusing an incompatible clock", () => {
  const task = existing();
  const first = processScheduledTaskChat(`${EDIT_SCHEDULED_TASK_PROMPT}改成每天下午执行`, task.sourceConversation!.id, [task], undefined, now, () => "unused");
  assert.ok(first?.draft);
  assert.equal(first.task, undefined);
  const second = processScheduledTaskChat("3点", task.sourceConversation!.id, [task], first.draft, now, () => "unused");
  assert.deepEqual(second?.task?.schedule, { kind: "daily", hour: 15, minute: 0 });
  assert.equal(second?.task?.prompt, task.prompt);
  assert.equal(second?.task?.enabled, true);
  const cancelled = processScheduledTaskChat("不修改了", task.sourceConversation!.id, [task], first.draft, now, () => "unused");
  assert.equal(cancelled?.task, undefined);
  assert.equal(cancelled?.draft, undefined);
});

test("ready drafts can retry a failed save without treating retry as new task content", () => {
  const task = existing();
  const pending = { mode: "update" as const, values: { name: task.name, prompt: task.prompt, schedule: task.schedule } };
  const retry = processScheduledTaskChat("重试", task.sourceConversation!.id, [task], pending, now, () => "unused");
  assert.equal(retry?.task?.id, task.id);
  assert.equal(retry?.task?.prompt, task.prompt);
});

test("legacy tasks open an explicitly restored conversation without inventing original user messages", () => {
  const task = { ...existing(), sourceConversation: undefined };
  const restored = restoreScheduledConversation(task);
  assert.equal(restored.id, restoreScheduledConversation(task).id);
  assert.equal(restored.messages.length, 1);
  assert.equal(restored.messages[0].role, "assistant");
  assert.match(restored.messages[0].content, /旧版演示.*恢复对话/);
  assert.match(restored.messages[0].content, /查询上海今日气温/);
});

test("the reported weekly morning weather request offers a concrete time and only saves after confirmation", () => {
  const first = processScheduledTaskChat("帮我创建定时任务：每周一早上发我一份上海当周的天气预报", "weather-chat", [], undefined, now, () => "weekly-weather");
  assert.equal(first?.task, undefined, "vague morning time must not be saved without consent");
  assert.ok(first?.draft?.awaitingConfirmation);
  assert.match(first.message, /每周一 09:00/);
  assert.match(first.message, /回复“确认”/);
  const completed = processScheduledTaskChat("确认", "weather-chat", [], first.draft, now, () => "weekly-weather");
  assert.equal(completed?.task?.prompt, "发我一份上海当周的天气预报");
  assert.deepEqual(completed?.task?.schedule, { kind: "weekly", weekday: 1, hour: 9, minute: 0 });
  const adjusted = processScheduledTaskChat("10点", "weather-chat", [], first.draft, now, () => "weekly-weather");
  assert.deepEqual(adjusted?.task?.schedule, { kind: "weekly", weekday: 1, hour: 10, minute: 0 });
  const cancelled = processScheduledTaskChat("取消", "weather-chat", [], first.draft, now, () => "unused");
  assert.equal(cancelled?.task, undefined);
  assert.equal(cancelled?.draft, undefined);
});

test("natural recurring requests can create tasks without a fixed command prefix", () => {
  for (const input of ["每天9点生成昨日运营日报", "帮我每周一早上9点发我上海天气预报", "工作日下午3点检查指标", "明天下午3点提醒我看报名进度"]) {
    const result = processScheduledTaskChat(input, "chat", [], undefined, now, () => "new");
    assert.ok(result?.task, input);
  }
  assert.equal(processScheduledTaskChat("今天帮我查一下订单", "chat", [], undefined, now, () => "unused"), null);
});
