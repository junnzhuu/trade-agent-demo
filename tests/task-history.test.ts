import assert from "node:assert/strict";
import test from "node:test";
import {
  filterRecentTasks,
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
    status: "completed",
  };
  const result = prependRecentTask(initialRecentTasks, task);

  assert.equal(result[0].title, "更新后的任务");
  assert.equal(result.length, initialRecentTasks.length);
  assert.equal(result.filter((item) => item.id === task.id).length, 1);
  assert.equal(result[0].status, "completed");
});
