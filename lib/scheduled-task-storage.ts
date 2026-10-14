import type { ScheduledTask, TaskSchedule } from "./scheduled-tasks";

export const SCHEDULED_TASKS_STORAGE_KEY = "trade-agent-scheduled-tasks-v1";
const CHANGED_EVENT = "trade-agent-scheduled-tasks-changed";
const READ_FAILED_SNAPSHOT = "__scheduled_tasks_storage_read_failed__";
const READ_ERROR =
  "无法读取当前浏览器中的定时任务，请检查浏览器存储权限后重试。";
const INVALID_DATA_ERROR =
  "已保存的定时任务数据无法读取，原始数据已保留。请检查浏览器存储中的任务数据后重试。";

type StorageAdapter = Pick<Storage, "getItem" | "setItem">;
export type ScheduledTaskMutationResult = { ok: boolean; error?: string };
export type ScheduledTasksSnapshot = {
  tasks: ScheduledTask[];
  error: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isTimestamp(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= 8_640_000_000_000_000
  );
}

function isSchedule(value: unknown): value is TaskSchedule {
  if (!isRecord(value)) return false;
  if (value.kind === "once") return isTimestamp(value.runAt);
  if (
    !Number.isInteger(value.hour) ||
    typeof value.hour !== "number" ||
    value.hour < 0 ||
    value.hour > 23 ||
    !Number.isInteger(value.minute) ||
    typeof value.minute !== "number" ||
    value.minute < 0 ||
    value.minute > 59
  ) {
    return false;
  }
  if (value.kind === "daily" || value.kind === "weekdays") return true;
  return (
    value.kind === "weekly" &&
    typeof value.weekday === "number" &&
    Number.isInteger(value.weekday) &&
    value.weekday >= 0 &&
    value.weekday <= 6
  );
}

function isTask(value: unknown): value is ScheduledTask {
  return (
    isRecord(value) &&
    isText(value.id) &&
    isText(value.name) &&
    isText(value.prompt) &&
    isSchedule(value.schedule) &&
    isTimestamp(value.createdAt) &&
    isTimestamp(value.updatedAt) &&
    value.updatedAt >= value.createdAt
  );
}

export function parseScheduledTasksSnapshot(
  raw: string | null,
): ScheduledTasksSnapshot {
  if (raw === null) return { tasks: [], error: null };
  if (raw === READ_FAILED_SNAPSHOT) return { tasks: [], error: READ_ERROR };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isTask)) {
      return { tasks: [], error: INVALID_DATA_ERROR };
    }
    const ids = new Set(parsed.map((task) => task.id));
    if (ids.size !== parsed.length) {
      return { tasks: [], error: INVALID_DATA_ERROR };
    }
    return { tasks: parsed, error: null };
  } catch {
    return { tasks: [], error: INVALID_DATA_ERROR };
  }
}

/** A fresh read before every mutation keeps unrelated tasks from other tabs. */
export function createScheduledTaskStorage(options: {
  getStorage: () => StorageAdapter | null;
  onChange?: () => void;
}) {
  function getScheduledTasksSnapshot(): string | null {
    try {
      return options.getStorage()?.getItem(SCHEDULED_TASKS_STORAGE_KEY) ?? null;
    } catch {
      return READ_FAILED_SNAPSHOT;
    }
  }

  function mutate(
    update: (tasks: ScheduledTask[]) => ScheduledTask[] | string,
  ): ScheduledTaskMutationResult {
    let storage: StorageAdapter | null;
    let snapshot: ScheduledTasksSnapshot;
    try {
      storage = options.getStorage();
      if (!storage) return { ok: false, error: READ_ERROR };
      snapshot = parseScheduledTasksSnapshot(
        storage.getItem(SCHEDULED_TASKS_STORAGE_KEY),
      );
    } catch {
      return { ok: false, error: READ_ERROR };
    }
    if (snapshot.error) return { ok: false, error: snapshot.error };

    const next = update(snapshot.tasks);
    if (typeof next === "string") return { ok: false, error: next };
    // Reconfirming a creation or deleting an already removed task is a no-op.
    if (next === snapshot.tasks) return { ok: true };
    try {
      storage.setItem(SCHEDULED_TASKS_STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      const isQuotaError =
        isRecord(error) &&
        (error.name === "QuotaExceededError" ||
          error.name === "NS_ERROR_DOM_QUOTA_REACHED");
      return {
        ok: false,
        error: isQuotaError
          ? "当前浏览器存储空间不足，操作未保存。请释放空间后重试。"
          : "保存失败，请检查浏览器存储权限后重试。原有任务未被更改。",
      };
    }
    // Notification failures must not report a successful write as a failed save.
    try {
      options.onChange?.();
    } catch {
      // The next snapshot read will still return the saved tasks.
    }
    return { ok: true };
  }

  function saveScheduledTask(
    task: ScheduledTask,
    mode: "create" | "update",
  ): ScheduledTaskMutationResult {
    if (!isTask(task)) {
      return { ok: false, error: "任务信息不完整或格式有误，请重新确认。" };
    }
    return mutate((tasks) => {
      const index = tasks.findIndex((item) => item.id === task.id);
      if (mode === "create") {
        return index === -1 ? [task, ...tasks] : tasks;
      }
      if (index === -1) {
        return "该任务已被删除，请取消修改后重新创建。";
      }
      return tasks.map((item) => (item.id === task.id ? task : item));
    });
  }

  function deleteScheduledTask(id: string): ScheduledTaskMutationResult {
    if (!isText(id)) return { ok: false, error: "未找到要删除的任务。" };
    return mutate((tasks) =>
      tasks.some((task) => task.id === id)
        ? tasks.filter((task) => task.id !== id)
        : tasks,
    );
  }

  return {
    getScheduledTasksSnapshot,
    saveScheduledTask,
    deleteScheduledTask,
  };
}

const browserStorage = createScheduledTaskStorage({
  getStorage: () => (typeof window === "undefined" ? null : window.localStorage),
  onChange: () => window.dispatchEvent(new Event(CHANGED_EVENT)),
});

export const getScheduledTasksSnapshot = browserStorage.getScheduledTasksSnapshot;
export const saveScheduledTask = browserStorage.saveScheduledTask;
export const deleteScheduledTask = browserStorage.deleteScheduledTask;

export function subscribeToScheduledTasks(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  function onStorage(event: StorageEvent) {
    if (event.key === SCHEDULED_TASKS_STORAGE_KEY || event.key === null) {
      listener();
    }
  }
  window.addEventListener(CHANGED_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGED_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}
