import assert from "node:assert/strict";
import test from "node:test";
import { createScheduledTaskExamples } from "../lib/scheduled-task-examples";
import { createScheduledTaskStorage, parseScheduledTasksSnapshot, SCHEDULED_TASKS_STORAGE_KEY } from "../lib/scheduled-task-storage";
import { EDIT_SCHEDULED_TASK_PROMPT, processScheduledTaskChat, restoreScheduledConversation, snapshotScheduledConversation } from "../lib/scheduled-task-chat";

const now = Date.parse("2026-10-15T08:00:00+08:00");
function setup(initial?: string) {
  const data = new Map<string, string>(initial === undefined ? [] : [[SCHEDULED_TASKS_STORAGE_KEY, initial]]);
  const adapter = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  return { adapter, storage: createScheduledTaskStorage({ getStorage: () => adapter }) };
}

test("a new or formerly empty demo opens with three usable tasks; deletions stay deleted after refresh", () => {
  for (const initial of [undefined, "[]"]) {
    const { adapter, storage } = setup(initial);
    assert.equal(storage.initializeScheduledTaskDemo(createScheduledTaskExamples(now)).ok, true);
    const tasks = parseScheduledTasksSnapshot(storage.getScheduledTasksSnapshot()).tasks;
    assert.equal(tasks.length, 3);
    assert.equal(tasks.filter((task) => task.enabled).length, 2);
    for (const task of tasks) {
      const conversation = restoreScheduledConversation(task);
      const edited = processScheduledTaskChat(`${EDIT_SCHEDULED_TASK_PROMPT}名称改为更新后的示例`, conversation.id, tasks, undefined, now + 1_000, () => "unused");
      assert.equal(edited?.task?.id, task.id);
      assert.equal(edited?.task?.name, "更新后的示例");
      storage.deleteScheduledTask(task.id);
    }
    const reloaded = createScheduledTaskStorage({ getStorage: () => adapter });
    reloaded.initializeScheduledTaskDemo(createScheduledTaskExamples(now + 1_000));
    assert.deepEqual(parseScheduledTasksSnapshot(reloaded.getScheduledTasksSnapshot()).tasks, []);
  }
});

test("existing user tasks are preserved and corrupt data is never replaced by examples", () => {
  const userTask = { ...createScheduledTaskExamples(now)[0], id: "user-task", name: "用户自己的任务" };
  const { storage } = setup(JSON.stringify([userTask]));
  storage.initializeScheduledTaskDemo(createScheduledTaskExamples(now));
  assert.deepEqual(parseScheduledTasksSnapshot(storage.getScheduledTasksSnapshot()).tasks, [userTask]);
  storage.deleteScheduledTask(userTask.id);
  storage.initializeScheduledTaskDemo(createScheduledTaskExamples(now));
  assert.deepEqual(parseScheduledTasksSnapshot(storage.getScheduledTasksSnapshot()).tasks, []);
  const corrupt = setup("{broken").storage;
  assert.equal(corrupt.initializeScheduledTaskDemo(createScheduledTaskExamples(now)).ok, false);
  assert.equal(corrupt.getScheduledTasksSnapshot(), "{broken");
});

test("the reported weather request is saved after confirmation and appears beside the examples after reload", () => {
  const { storage, adapter } = setup();
  storage.initializeScheduledTaskDemo(createScheduledTaskExamples(now));
  const original = "帮我创建定时任务：每周一早上发我一份上海当周的天气预报";
  const tasks = parseScheduledTasksSnapshot(storage.getScheduledTasksSnapshot()).tasks;
  const first = processScheduledTaskChat(original, "new-weather-chat", tasks, undefined, now, () => "user-weather");
  assert.ok(first?.draft);
  assert.equal(parseScheduledTasksSnapshot(storage.getScheduledTasksSnapshot()).tasks.length, 3);
  const confirmed = processScheduledTaskChat("确认", "new-weather-chat", tasks, first.draft, now, () => "user-weather");
  assert.ok(confirmed?.task);
  const conversation = restoreScheduledConversation(confirmed.task);
  conversation.id = "new-weather-chat";
  conversation.messages = [{ id: "q", role: "user", content: original }, { id: "proposal", role: "assistant", content: first.message }, { id: "confirm", role: "user", content: "确认" }, { id: "done", role: "assistant", content: confirmed.message }];
  assert.equal(storage.saveScheduledTask({ ...confirmed.task, sourceConversation: snapshotScheduledConversation(conversation) }, "create").ok, true);
  const reloaded = parseScheduledTasksSnapshot(createScheduledTaskStorage({ getStorage: () => adapter }).getScheduledTasksSnapshot()).tasks;
  assert.equal(reloaded.length, 4);
  const weather = reloaded.find((task) => task.id === "user-weather")!;
  assert.deepEqual(weather.schedule, { kind: "weekly", weekday: 1, hour: 9, minute: 0 });
  assert.deepEqual(restoreScheduledConversation(weather).messages, conversation.messages);
});
