export type TaskTraceStep = {
  id: string;
  title: string;
  detail: string;
  status: "running" | "completed";
};

export type TaskMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  elapsedMs?: number;
  trace?: TaskTraceStep[];
  favorited?: boolean;
};

export type RecentTask = {
  id: string;
  title: string;
  metadata: string;
  icon: "folder" | "project";
  messages: TaskMessage[];
  updatedAt: number;
  pinned?: boolean;
  archived?: boolean;
  status?: "running" | "completed";
  startedAt?: number;
  unreadCompletion?: boolean;
  favorited?: boolean;
};

export type FavoriteAnswer = {
  taskId: string;
  taskTitle: string;
  message: TaskMessage;
};

export type TaskActivityIndicator = "spinner" | "attention" | "time";

export function getTaskActivityIndicator(
  task: RecentTask,
  isViewing: boolean,
): TaskActivityIndicator {
  if (task.status === "running") {
    return "spinner";
  }
  return task.unreadCompletion && !isViewing ? "attention" : "time";
}

const initialTaskTime = Date.now();

export const initialRecentTasks: RecentTask[] = [
  {
    id: "preset-bid-limits",
    title: "出价上下限",
    metadata: "2026-07-29 10:20",
    icon: "folder",
    updatedAt: initialTaskTime - 60 * 60 * 1_000,
    messages: [
      {
        id: "preset-bid-limits-user",
        role: "user",
        content: "请帮我梳理活动商品的出价上下限规则。",
      },
      {
        id: "preset-bid-limits-assistant",
        role: "assistant",
        content:
          "已基于演示规则完成梳理：建议最低出价覆盖基础获客成本，最高出价不超过目标毛利可承受范围；对高转化商品可上浮 10%，低转化商品应先优化素材与详情页，再逐步调整出价。",
      },
    ],
  },
  {
    id: "preset-feishu-title",
    title: "飞书机器人默认标题",
    metadata: "项目新手指引",
    icon: "project",
    updatedAt: initialTaskTime - 4 * 24 * 60 * 60 * 1_000,
    messages: [
      {
        id: "preset-feishu-title-user",
        role: "user",
        content: "飞书机器人创建任务时，默认标题应该如何生成？",
      },
      {
        id: "preset-feishu-title-assistant",
        role: "assistant",
        content:
          "默认标题建议优先取用户请求的首句，并去除无意义前缀、换行和多余标点；标题超过 28 个字符时截断并补充省略号。无法提取有效文本时，可回退为“新建交易任务”。",
      },
    ],
  },
];

export function filterRecentTasks(
  tasks: RecentTask[],
  rawQuery: string,
): RecentTask[] {
  const query = rawQuery.trim().toLocaleLowerCase("zh-CN");
  const visibleTasks = tasks.filter((task) => !task.archived);
  if (!query) return visibleTasks;

  return visibleTasks.filter((task) =>
    `${task.title} ${task.metadata}`.toLocaleLowerCase("zh-CN").includes(query),
  );
}

export function prependRecentTask(
  tasks: RecentTask[],
  task: RecentTask,
): RecentTask[] {
  return [task, ...tasks.filter((item) => item.id !== task.id)];
}

export function getFavoriteTasks(tasks: RecentTask[]): RecentTask[] {
  return tasks.filter((task) => task.favorited);
}

export function getFavoriteAnswers(tasks: RecentTask[]): FavoriteAnswer[] {
  return tasks.flatMap((task) =>
    task.messages
      .filter((message) => message.role === "assistant" && message.favorited)
      .map((message) => ({ taskId: task.id, taskTitle: task.title, message })),
  );
}

export function createTaskTitle(prompt: string, maxLength = 28): string {
  const title = prompt.replace(/\s+/g, " ").trim() || "新建交易任务";
  return title.length > maxLength ? `${title.slice(0, maxLength)}…` : title;
}

export function formatTaskTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join(
      "-",
    ) + ` ${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function restoreArchivedTask(
  tasks: RecentTask[],
  taskId: string,
  restoredAt = Date.now(),
): RecentTask[] {
  const task = tasks.find((item) => item.id === taskId);
  if (!task?.archived) return tasks;
  return prependRecentTask(tasks, {
    ...task,
    archived: false,
    pinned: false,
    updatedAt: restoredAt,
    metadata: formatTaskTimestamp(new Date(restoredAt)),
  });
}

export function formatRelativeTaskTime(
  updatedAt: number,
  now = Date.now(),
): string {
  const elapsedMinutes = Math.max(0, Math.floor((now - updatedAt) / 60_000));
  if (elapsedMinutes < 1) return "刚刚";
  if (elapsedMinutes < 60) return `${elapsedMinutes}分钟前`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}小时前`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays}天前`;
}
