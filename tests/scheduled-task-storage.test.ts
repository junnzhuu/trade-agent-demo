import assert from "node:assert/strict";
import test from "node:test";
import type { ScheduledTask } from "../lib/scheduled-tasks";
import {
  createScheduledTaskStorage,
  deleteScheduledTask,
  getScheduledTasksSnapshot,
  parseScheduledTasksSnapshot,
  saveScheduledTask,
  SCHEDULED_TASKS_STORAGE_KEY,
  subscribeToScheduledTasks,
} from "../lib/scheduled-task-storage";

const now = Date.parse("2026-10-14T12:00:00+08:00");
function task(id = "daily-report"): ScheduledTask {
  return {
    id,
    name: "运营日报",
    prompt: "生成昨日运营日报",
    schedule: { kind: "daily", hour: 9, minute: 0 },
    createdAt: now,
    updatedAt: now,
  };
}

function memoryStore(initial: string | null = null) {
  let raw = initial;
  let writes = 0;
  let notifications = 0;
  const adapter = {
    getItem: (key: string) => {
      assert.equal(key, SCHEDULED_TASKS_STORAGE_KEY);
      return raw;
    },
    setItem: (key: string, value: string) => {
      assert.equal(key, SCHEDULED_TASKS_STORAGE_KEY);
      writes++;
      raw = value;
    },
  };
  const storage = createScheduledTaskStorage({
    getStorage: () => adapter,
    onChange: () => notifications++,
  });
  return {
    adapter,
    storage,
    read: () => parseScheduledTasksSnapshot(raw),
    getRaw: () => raw,
    replaceRaw: (value: string | null) => {
      raw = value;
    },
    writes: () => writes,
    notifications: () => notifications,
  };
}

test("empty storage and valid daily, weekly, weekdays, once tasks are readable", () => {
  assert.deepEqual(parseScheduledTasksSnapshot(null), { tasks: [], error: null });
  const tasks: ScheduledTask[] = [
    task(),
    { ...task("weekly"), schedule: { kind: "weekly", weekday: 1, hour: 9, minute: 0 } },
    { ...task("weekdays"), schedule: { kind: "weekdays", hour: 8, minute: 30 } },
    { ...task("once"), schedule: { kind: "once", runAt: now - 60_000 } },
  ];
  assert.deepEqual(parseScheduledTasksSnapshot(JSON.stringify(tasks)), {
    tasks,
    error: null,
  });
});

test("malformed JSON, invalid fields and duplicate IDs are rejected together", () => {
  const invalid: unknown[] = [
    null,
    {},
    [task(), task()],
    [{ ...task(), id: " " }],
    [{ ...task(), name: "" }],
    [{ ...task(), prompt: null }],
    [{ ...task(), createdAt: "2026-10-14" }],
    [{ ...task(), updatedAt: now - 1 }],
    [{ ...task(), schedule: { kind: "daily", hour: 24, minute: 0 } }],
    [{ ...task(), schedule: { kind: "daily", hour: 9, minute: 60 } }],
    [{ ...task(), schedule: { kind: "daily", hour: 9.5, minute: 0 } }],
    [{ ...task(), schedule: { kind: "weekly", weekday: 7, hour: 9, minute: 0 } }],
    [{ ...task(), schedule: { kind: "monthly", hour: 9, minute: 0 } }],
    [{ ...task(), schedule: { kind: "once", runAt: "tomorrow" } }],
    [{ ...task(), schedule: { kind: "once", runAt: 8_640_000_000_000_001 } }],
  ];
  for (const raw of ["", "{broken", ...invalid.map((value) => JSON.stringify(value))]) {
    const parsed = parseScheduledTasksSnapshot(raw);
    assert.deepEqual(parsed.tasks, [], raw);
    assert.ok(parsed.error, raw);
    const store = memoryStore(raw);
    assert.equal(store.storage.saveScheduledTask(task("new"), "create").ok, false);
    assert.equal(store.storage.deleteScheduledTask("daily-report").ok, false);
    assert.equal(store.getRaw(), raw, "must preserve corrupt original data");
    assert.equal(store.writes(), 0);
    assert.equal(store.notifications(), 0);
  }
});

test("create, update, reload and delete preserve all unrelated tasks", () => {
  const store = memoryStore();
  const first = task();
  const second = task("another-report");
  assert.deepEqual(store.storage.saveScheduledTask(first, "create"), { ok: true });
  assert.deepEqual(store.storage.saveScheduledTask(second, "create"), { ok: true });
  const changed = { ...first, name: "每日运营日报", updatedAt: now + 1_000 };
  assert.deepEqual(store.storage.saveScheduledTask(changed, "update"), { ok: true });
  assert.deepEqual(store.read().tasks, [second, changed]);
  const reload = createScheduledTaskStorage({ getStorage: () => store.adapter });
  assert.deepEqual(parseScheduledTasksSnapshot(reload.getScheduledTasksSnapshot()).tasks, [second, changed]);
  assert.deepEqual(store.storage.deleteScheduledTask(first.id), { ok: true });
  assert.deepEqual(store.read().tasks, [second]);
  assert.deepEqual(parseScheduledTasksSnapshot(reload.getScheduledTasksSnapshot()).tasks, [second]);
  assert.equal(store.notifications(), 4);
});

test("duplicate confirmation and repeat deletion do not duplicate or overwrite tasks", () => {
  const store = memoryStore();
  const first = task();
  assert.equal(store.storage.saveScheduledTask(first, "create").ok, true);
  assert.equal(store.storage.saveScheduledTask({ ...first, name: "stale name" }, "create").ok, true);
  assert.deepEqual(store.read().tasks, [first]);
  assert.equal(store.writes(), 1);
  assert.equal(store.notifications(), 1);
  store.storage.deleteScheduledTask(first.id);
  assert.deepEqual(store.storage.deleteScheduledTask(first.id), { ok: true });
  assert.equal(store.writes(), 2);
  assert.equal(store.notifications(), 2);
});

test("each save reads the latest snapshot and updating a deleted task fails", () => {
  const first = task();
  const second = task("created-in-another-tab");
  const store = memoryStore(JSON.stringify([first]));
  store.storage.getScheduledTasksSnapshot();
  store.replaceRaw(JSON.stringify([second, first]));
  const updated = { ...first, name: "更新名称", updatedAt: now + 1_000 };
  assert.equal(store.storage.saveScheduledTask(updated, "update").ok, true);
  assert.deepEqual(store.read().tasks, [second, updated]);
  store.replaceRaw(JSON.stringify([second]));
  const result = store.storage.saveScheduledTask(updated, "update");
  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /已被删除/);
  assert.deepEqual(store.read().tasks, [second]);
});

test("read denial exposes a stable error snapshot and blocks writes", () => {
  for (const failure of ["access", "read"]) {
    let writes = 0;
    const storage = createScheduledTaskStorage({
      getStorage: () => {
        if (failure === "access") throw new Error("access denied");
        return {
          getItem: () => { throw new Error("read denied"); },
          setItem: () => { writes++; },
        };
      },
    });
    const firstSnapshot = storage.getScheduledTasksSnapshot();
    assert.equal(storage.getScheduledTasksSnapshot(), firstSnapshot);
    assert.match(parseScheduledTasksSnapshot(firstSnapshot).error ?? "", /无法读取/);
    assert.equal(storage.saveScheduledTask(task(), "create").ok, false);
    assert.equal(storage.deleteScheduledTask(task().id).ok, false);
    assert.equal(writes, 0);
  }
});

test("quota and other write failures preserve old data without a change notification", () => {
  for (const errorName of ["QuotaExceededError", "SecurityError"]) {
    const raw = JSON.stringify([task()]);
    let notifications = 0;
    const storage = createScheduledTaskStorage({
      getStorage: () => ({
        getItem: () => raw,
        setItem: () => { throw Object.assign(new Error("write failed"), { name: errorName }); },
      }),
      onChange: () => { notifications++; },
    });
    const result = storage.saveScheduledTask(task("second"), "create");
    assert.equal(result.ok, false);
    assert.match(result.error ?? "", errorName === "QuotaExceededError" ? /空间不足/ : /保存失败/);
    assert.equal(storage.deleteScheduledTask(task().id).ok, false);
    assert.equal(storage.getScheduledTasksSnapshot(), raw);
    assert.equal(notifications, 0);
  }
});

test("invalid input does not corrupt stored data", () => {
  const store = memoryStore(JSON.stringify([task()]));
  assert.equal(store.storage.saveScheduledTask({ ...task(), prompt: "" }, "update").ok, false);
  assert.equal(store.storage.deleteScheduledTask("").ok, false);
  assert.equal(store.writes(), 0);
  assert.deepEqual(store.read().tasks, [task()]);
});

test("server rendering is safe without window and mutations fail clearly", () => {
  assert.equal(getScheduledTasksSnapshot(), null);
  assert.equal(saveScheduledTask(task(), "create").ok, false);
  assert.equal(deleteScheduledTask(task().id).ok, false);
  assert.doesNotThrow(() => subscribeToScheduledTasks(() => {})());
});

test("subscribers receive same-page saves, matching storage events and clear events", () => {
  const target = new EventTarget();
  const store = memoryStore();
  Object.assign(target, { localStorage: store.adapter });
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: target });
  try {
    let notifications = 0;
    const unsubscribe = subscribeToScheduledTasks(() => { notifications++; });
    assert.equal(saveScheduledTask(task(), "create").ok, true);
    assert.equal(notifications, 1);
    target.dispatchEvent(Object.assign(new Event("storage"), { key: "unrelated" }));
    assert.equal(notifications, 1);
    target.dispatchEvent(Object.assign(new Event("storage"), { key: SCHEDULED_TASKS_STORAGE_KEY }));
    target.dispatchEvent(Object.assign(new Event("storage"), { key: null }));
    assert.equal(notifications, 3);
    unsubscribe();
    target.dispatchEvent(Object.assign(new Event("storage"), { key: null }));
    assert.equal(deleteScheduledTask(task().id).ok, true);
    assert.equal(notifications, 3);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
