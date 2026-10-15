import { deriveTaskName, formatSchedule, parseScheduledTaskInput, validateScheduledTaskDraft, type ScheduledConversation, type ScheduledTask, type ScheduledTaskDraft } from "./scheduled-tasks";
import type { RecentTask } from "./task-history";

export const CREATE_SCHEDULED_TASK_PROMPT = "帮我创建定时任务：";
export const EDIT_SCHEDULED_TASK_PROMPT = "帮我修改这条定时任务，";

export type ScheduledChatDraft = { mode: "create" | "update"; values: ScheduledTaskDraft; awaitingConfirmation?: boolean };
export type ScheduledChatResult = { message: string; draft?: ScheduledChatDraft; task?: ScheduledTask; mode?: "create" | "update" };

/** Only scheduling requests enter this local demo parser; normal chat keeps its existing routing. */
export function processScheduledTaskChat(
  input: string,
  conversationId: string,
  tasks: ScheduledTask[],
  pending: ScheduledChatDraft | undefined,
  now: number,
  newId: () => string,
): ScheduledChatResult | null {
  const prompt = input.trim();
  const naturalRequest = prompt.replace(/^(?:(?:请|帮我|帮忙|为我)\s*)+/, "");
  const recurringRequest = /^(?:每天|每日|每个工作日|工作日|每周[一二三四五六日天1-7]|每星期[一二三四五六日天1-7])/.test(naturalRequest);
  const onceRequest = /^(?:今天|明天|\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2})/.test(naturalRequest) && /(?:\d{1,2}[:：]\d{2}|[0-9一二两三四五六七八九十]+[点时]|上午|下午|早上|晚上)/.test(naturalRequest);
  const creating = /^(?:请)?帮我创建定时任务\s*[:：]?/.test(prompt) || /^(?:请|帮我|帮忙)?(?:创建|新建|设置|安排).*(?:定时任务)/.test(prompt) || (!pending && (recurringRequest || onceRequest));
  const editing = /^(?:请)?帮我修改这条定时任务\s*[，,：:]?/.test(prompt);
  const current = tasks.find((task) => task.sourceConversation?.id === conversationId);
  const shortEdit = Boolean(current && /^(?:改成|改为|调整为|名称改为|任务名称改为|执行内容改为|执行时间改为|时间改为)/.test(prompt));
  if (!creating && !editing && !shortEdit && !pending) return null;
  if (/^(?:取消|算了|不创建了|不修改了|不用了)[。！!]*$/.test(prompt)) return { message: "已取消本次定时任务操作。" };
  const mode = creating ? "create" : editing || shortEdit ? "update" : pending!.mode;
  if (mode === "update" && !current) return { message: "未找到这段对话中的定时任务。请在定时任务列表中选择已有任务，或新建一条任务。" };
  const values = !creating && pending?.mode === mode ? pending.values : mode === "update" ? {
    name: current!.name, prompt: current!.prompt, schedule: current!.schedule,
  } : {};
  const text = prompt.replace(/^(?:请)?帮我创建定时任务\s*[:：]?\s*/, "")
    .replace(/^(?:请)?帮我修改这条定时任务\s*[，,：:]?\s*/, "");
  const confirmingSuggestion = pending?.awaitingConfirmation && /^(?:确认|确认创建|确认修改|好|好的|可以|就这个时间|按这个时间)[。！!]*$/.test(text);
  const retrying = pending && /^(?:重试|再试一次)[。！!]*$/.test(text);
  const result = (confirmingSuggestion || retrying) && !validateScheduledTaskDraft(values, now)
    ? { ready: true, draft: values, message: "" }
    : parseScheduledTaskInput(text, values, now, mode === "update");
  if (!result.ready) {
    const period = result.draft.pendingPeriod;
    const suggestedClock = period && ({ 早上: "上午9点", 早晨: "上午9点", 上午: "上午9点", 下午: "下午3点", 晚上: "晚上8点", 晚间: "晚上8点", 中午: "中午12点", 凌晨: "凌晨0点" } as Record<string, string>)[period];
    if (suggestedClock && result.draft.pendingSchedule && !result.draft.schedule) {
      const proposed = parseScheduledTaskInput(suggestedClock, result.draft, now, mode === "update");
      if (proposed.ready) return {
        message: `你说的“${period}”还没有具体时刻，建议按${formatSchedule(proposed.draft.schedule!)}${mode === "create" ? "创建" : "修改"}「${proposed.draft.name}」。回复“确认”即可保存，也可以告诉我其他时间，例如“10点”。`,
        draft: { mode, values: { ...proposed.draft, pendingPeriod: period }, awaitingConfirmation: true },
      };
    }
    return { message: result.message, draft: { mode, values: result.draft } };
  }
  const task: ScheduledTask = {
    id: mode === "update" ? current!.id : newId(),
    name: result.draft.name ?? deriveTaskName(result.draft.prompt!),
    prompt: result.draft.prompt!,
    schedule: result.draft.schedule!,
    enabled: true,
    createdAt: mode === "update" ? current!.createdAt : now,
    updatedAt: now,
    sourceConversation: current?.sourceConversation,
  };
  return { task, mode, message: `已${mode === "create" ? "创建" : "修改"}「${task.name}」定时任务，执行时间：${formatSchedule(task.schedule)}。` };
}

export function snapshotScheduledConversation(task: RecentTask): ScheduledConversation {
  return {
    id: task.id, title: task.title, createdAt: task.createdAt, updatedAt: task.updatedAt,
    messages: task.messages.map(({ id, role, content }) => ({ id, role, content })),
  };
}

export function restoreScheduledConversation(task: ScheduledTask): RecentTask {
  const source = task.sourceConversation;
  return {
    id: source?.id ?? `scheduled-source-${task.id}`,
    title: source?.title ?? task.name,
    createdAt: source?.createdAt ?? task.createdAt,
    updatedAt: source?.updatedAt ?? task.updatedAt,
    icon: "folder", metadata: "定时任务", status: "completed",
    messages: source?.messages ?? [{
      id: `scheduled-source-message-${task.id}`, role: "assistant",
      content: `这条任务创建于旧版演示，已根据保存的数据恢复对话。\n${task.name}：${task.prompt}\n执行时间：${formatSchedule(task.schedule)}。`,
    }],
  };
}
