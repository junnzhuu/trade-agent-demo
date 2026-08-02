import assert from "node:assert/strict";
import test from "node:test";
import {
  filterRecentTasks,
  formatRelativeTaskTime,
  initialRecentTasks,
  prependRecentTask,
  type RecentTask,
} from "../lib/task-history";

test("filters recent tasks by title and metadata", () => {
  assert.deepEqual(
    filterRecentTasks(initialRecentTasks, "出价").map((task) => task.id),
    ["preset-bid-limits"],
  );
  assert.deepEqual(
    filterRecentTasks(initialRecentTasks, "新手指引").map((task) => task.id),
    ["preset-feishu-title"],
  );
});

test("returns all tasks for a blank query and none for no match", () => {
  assert.equal(filterRecentTasks(initialRecentTasks, "   ").length, 2);
  assert.deepEqual(filterRecentTasks(initialRecentTasks, "不存在的任务"), []);
});

test("prepends a completed task and replaces a duplicate id", () => {
  const task: RecentTask = {
    id: "preset-bid-limits",
    title: "更新后的任务",
    metadata: "2026-07-30 10:30",
    icon: "folder",
    messages: [],
    updatedAt: new Date("2026-07-30T10:30:00+08:00").getTime(),
    status: "completed",
  };
  const result = prependRecentTask(initialRecentTasks, task);

  assert.equal(result[0].title, "更新后的任务");
  assert.equal(result.length, initialRecentTasks.length);
  assert.equal(result.filter((item) => item.id === task.id).length, 1);
  assert.equal(result[0].status, "completed");
});

test("formats relative task time without calendar noise", () => {
  const now = new Date("2026-08-03T12:00:00+08:00").getTime();
  assert.equal(formatRelativeTaskTime(now - 20_000, now), "刚刚");
  assert.equal(formatRelativeTaskTime(now - 12 * 60_000, now), "12分钟前");
  assert.equal(formatRelativeTaskTime(now - 3 * 60 * 60_000, now), "3小时前");
  assert.equal(formatRelativeTaskTime(now - 4 * 24 * 60 * 60_000, now), "4天前");
});
