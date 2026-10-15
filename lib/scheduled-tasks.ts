/** Schedule configuration only. The demo never starts a timer or executes a task. */
export type TaskSchedule =
  | { kind: "daily" | "weekdays"; hour: number; minute: number }
  | { kind: "weekly"; weekday: number; hour: number; minute: number }
  | { kind: "once"; runAt: number };

export type ScheduledTask = {
  id: string;
  name: string;
  prompt: string;
  schedule: TaskSchedule;
  createdAt: number;
  updatedAt: number;
  enabled?: boolean;
  sourceConversation?: ScheduledConversation;
};

export type ScheduledConversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: { id: string; role: "user" | "assistant"; content: string }[];
};

type ScheduleHint =
  | { kind: "daily" | "weekdays" }
  | { kind: "weekly"; weekday: number }
  | { kind: "once"; year: number; month: number; day: number };

export type ScheduledTaskDraft = {
  name?: string;
  prompt?: string;
  schedule?: TaskSchedule;
  /** Unconfirmed conversational context; never persisted as a task. */
  pendingSchedule?: ScheduleHint;
  pendingTime?: { hour: number; minute: number };
  pendingPeriod?: string;
};

const BEIJING_OFFSET = 8 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
const pad = (value: number) => String(value).padStart(2, "0");
const inBeijing = (timestamp: number) => new Date(timestamp + BEIJING_OFFSET);

function beijingTimestamp(year: number, month: number, day: number, hour: number, minute: number) {
  return Date.UTC(year, month - 1, day, hour, minute) - BEIJING_OFFSET;
}

function validDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return year >= 2000 && year <= 9999 && date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function validSchedule(schedule: TaskSchedule) {
  if (schedule.kind === "once") return Number.isFinite(schedule.runAt);
  return ["daily", "weekdays", "weekly"].includes(schedule.kind) &&
    Number.isInteger(schedule.hour) && schedule.hour >= 0 && schedule.hour <= 23 &&
    Number.isInteger(schedule.minute) && schedule.minute >= 0 && schedule.minute <= 59 &&
    (schedule.kind !== "weekly" || (Number.isInteger(schedule.weekday) && schedule.weekday >= 0 && schedule.weekday <= 6));
}

export function formatBeijingDateTime(timestamp: number): string {
  const date = inBeijing(timestamp);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

export function formatSchedule(schedule: TaskSchedule): string {
  if (schedule.kind === "once") return `${formatBeijingDateTime(schedule.runAt)}（一次性）`;
  const cycle = schedule.kind === "weekly" ? `每周${WEEKDAYS[schedule.weekday]}` : schedule.kind === "daily" ? "每天" : "工作日";
  return `${cycle} ${pad(schedule.hour)}:${pad(schedule.minute)}`;
}

export function getNextScheduledAt(schedule: TaskSchedule, now: number): number | null {
  if (!validSchedule(schedule) || !Number.isFinite(now)) return null;
  if (schedule.kind === "once") return schedule.runAt > now ? schedule.runAt : null;
  const current = inBeijing(now);
  const today = Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate()) - BEIJING_OFFSET;
  for (let offset = 0; offset <= 7; offset += 1) {
    const midnight = today + offset * DAY;
    const weekday = inBeijing(midnight).getUTCDay();
    if (schedule.kind === "weekly" && weekday !== schedule.weekday) continue;
    if (schedule.kind === "weekdays" && (weekday === 0 || weekday === 6)) continue;
    const candidate = midnight + (schedule.hour * 60 + schedule.minute) * 60_000;
    if (candidate > now) return candidate;
  }
  return null;
}

export function deriveTaskName(prompt: string): string {
  const name = prompt.trim().replace(/^(?:请|帮我|帮忙|为我)+/, "").replace(/[。！!？?]+$/, "");
  return name.length > 18 ? `${name.slice(0, 18)}…` : name;
}

export function validateScheduledTaskDraft(draft: ScheduledTaskDraft, now: number): string | null {
  if (!draft.prompt?.trim()) return "请补充要执行的内容，例如：生成昨日运营日报。";
  if (!draft.name?.trim()) return "请补充任务名称。";
  if (!draft.schedule) return "请补充执行时间，例如：每天上午 9 点。";
  if (!validSchedule(draft.schedule)) return "执行时间无效，请重新描述。";
  if (draft.schedule.kind === "once" && draft.schedule.runAt <= now) return "这个一次性执行时间已经过去，请设置未来的时间。";
  return null;
}

function chineseNumber(value: string): number {
  if (/^\d+$/.test(value)) return Number(value);
  const digits: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  if (value.length === 1 && value in digits) return digits[value];
  if (/^[一二三四五六七八九]?十[一二三四五六七八九]?$/.test(value)) {
    const [tens, units] = value.split("十");
    return (tens ? digits[tens] : 1) * 10 + (units ? digits[units] : 0);
  }
  return Number.NaN;
}

const CLOCK = /(?:(凌晨|早上|早晨|上午|中午|下午|晚上|晚间)\s*)?([0-9零〇一二两三四五六七八九十]{1,3})\s*(?:([:：])\s*([0-9零〇一二两三四五六七八九十]{0,3})(?:\s*分)?|(点|时)\s*([0-9]{1,3}|[零〇一二两三四五六七八九十]{1,3}(?=\s*分))?\s*(?:分)?\s*(半|一刻|三刻)?)/g;

function readClock(match: RegExpMatchArray, pendingPeriod?: string) {
  let hour = chineseNumber(match[2]);
  const period = match[1] || pendingPeriod;
  if (match[3] && !match[4]) return null;
  if (match[6] && match[7]) return null;
  const minute = match[7] ? ({ 半: 30, 一刻: 15, 三刻: 45 }[match[7]] ?? 0) : chineseNumber(match[4] || match[6] || "0");
  if (period === "下午" || period === "晚上" || period === "晚间") {
    if (hour < 1 || hour > 12 || ((period === "晚上" || period === "晚间") && hour === 12)) return null;
    if (hour < 12) hour += 12;
  } else if (period === "中午") {
    if (hour < 11 || hour > 13) return null;
  } else if (period && hour > 11) return null;
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function hintFromSchedule(schedule: TaskSchedule): ScheduleHint {
  if (schedule.kind !== "once") return schedule.kind === "weekly" ? { kind: "weekly", weekday: schedule.weekday } : { kind: schedule.kind };
  const date = inBeijing(schedule.runAt);
  return { kind: "once", year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function timeFromSchedule(schedule: TaskSchedule) {
  if (schedule.kind !== "once") return { hour: schedule.hour, minute: schedule.minute };
  const date = inBeijing(schedule.runAt);
  return { hour: date.getUTCHours(), minute: date.getUTCMinutes() };
}

function tidyContent(value: string) {
  return value.trim().replace(/^[，,。；;\s]+|[，,。；;\s]+$/g, "").replace(/^(?:请|帮我|帮忙|为我)+/, "").replace(/^的?\s*执行\s*/, "").replace(/^(?:执行内容|执行指令|任务内容)[：:]\s*/, "").replace(/的定时任务$/, "").trim();
}

type ParseResult = { draft: ScheduledTaskDraft; ready: boolean; message: string };

/** A deliberately bounded parser. Unknown schedules are rejected instead of guessed. */
export function parseScheduledTaskInput(input: string, draft: ScheduledTaskDraft, now: number, editing = false): ParseResult {
  const original = { ...draft };
  const next = { ...draft };
  const text = input.trim();
  const fail = (message: string): ParseResult => ({ draft: original, ready: false, message });
  if (!text) return fail("请描述要创建或修改的定时任务。");

  // Split only at explicit field labels, preserving punctuation inside execution content.
  const clauses = text.split(/[，,；;\n]\s*(?=(?:(?:把|将)?(?:任务)?(?:名称|名字|执行内容|执行指令|任务内容|执行时间|时间|执行周期|周期)))/);
  let temporalText = "";
  let understoodField = false;
  for (const clause of clauses) {
    const name = clause.match(/^(?:把|将)?(?:任务)?(?:名称|名字)(?:改为|改成|设置为|设为|为|是|[:：])\s*(.*)$/);
    const prompt = clause.match(/^(?:把|将)?(?:执行内容|执行指令|任务内容|内容)(?:改为|改成|设置为|设为|为|是|[:：])\s*(.*)$/);
    const time = clause.match(/^(?:把|将)?(?:执行时间|时间|执行周期|周期)(?:改为|改成|设置为|设为|为|是|[:：])\s*(.*)$/);
    if (name) {
      if (!name[1].trim()) return fail("请补充新的任务名称。");
      next.name = name[1].trim().replace(/^[“「"]|[”」"]$/g, "");
      understoodField = true;
    } else if (prompt) {
      if (!prompt[1].trim()) return fail("请补充新的执行内容。");
      next.prompt = prompt[1].trim();
      understoodField = true;
    } else {
      if (time && !time[1].trim()) return fail("请补充新的执行时间，例如：每天上午 9 点。");
      temporalText += `${temporalText ? "，" : ""}${time ? time[1] : clause}`;
      if (time) understoodField = true;
    }
  }

  if (temporalText) {
    const value = temporalText.replace(/^(?:(?:请|帮我|帮忙|为我|把它|将它)\s*)*/, "")
      .replace(/^(?:(?:创建|新建|设置|安排)(?:一个|一条|个)?(?:定时任务)?[：:]?\s*)/, "")
      .replace(/^(?:改成|改为|调整为|调整成)\s*/, "").replace(/^在\s*/, "").trim();
    if (/(?:每月|每年|每隔|每小时|每分钟|每秒|每\s*[0-9一二两三四五六七八九十]+\s*(?:分钟|小时|天|周)|隔天|周末|节假日|Cron|cron|后天|下周|下星期|本周|本星期|月底|月初|小时后|分钟后|秒后)/.test(value)) {
      return fail("当前支持每天、工作日、每周某一天，以及明确日期或今天／明天的一次性任务。请用这些方式描述执行时间。");
    }
    const rulePattern = /每天|每日|每个工作日|工作日|每(?:周|星期)[一二三四五六日天1-7]?|\d{4}[-/.年]\d{1,2}[-/.月]\d{1,2}(?:日|号)?|今天|明天/g;
    const rules = [...value.matchAll(rulePattern)];
    // Mask recurrence/date text before scanning clocks: “每周一九点” contains
    // two adjacent Chinese numerals that otherwise look like one invalid hour.
    const clockText = rules.reduce((masked, rule) => masked.slice(0, rule.index) + " ".repeat(rule[0].length) + masked.slice((rule.index ?? 0) + rule[0].length), value);
    const clocks = [...clockText.matchAll(CLOCK)];
    // A task prompt may itself mention today/tomorrow. Only interpret the first schedule clause.
    const firstClock = clocks[0];
    const firstRule = rules[0];
    const withoutRule = firstRule ? value.slice(0, firstRule.index) + value.slice((firstRule.index ?? 0) + firstRule[0].length) : value;
    const incompletePeriod = !firstClock ? withoutRule.match(/^\s*(?:在\s*)?(凌晨|早上|早晨|上午|中午|下午|晚上|晚间)/)?.[1] : undefined;
    if (/^\s*(?:在\s*)?(?:早点|晚点|早一点|晚一点|早一些|晚一些)/.test(withoutRule)) {
      return fail("执行时间有歧义，请指定准确的单个时间，例如：每天上午 9 点。");
    }
    if ((!firstRule && /(?:\d{1,2}月\d{1,2}|\d{1,2}[-/]\d{1,2}|周[一二三四五六日天]|星期[一二三四五六日天])/.test(value)) || /\d+\.\d+\s*(?:点|时)/.test(value)) {
      return fail("执行日期或时间不够明确，请使用“每周一 9 点”或包含年份的日期，例如：2026-10-20 9 点。");
    }
    const boundary = firstClock ? (firstClock.index ?? 0) + firstClock[0].length : Number.POSITIVE_INFINITY;
    const scheduleRules = rules.filter((rule) => (rule.index ?? 0) < boundary);
    if (scheduleRules.length > 1 || (firstRule && /^(?:[至到\-、和或]|\s*[、和或])/.test(value.slice((firstRule.index ?? 0) + firstRule[0].length)))) {
      return fail("这段时间包含多个日期或周期，请每次设置一个执行时间，例如：每周一上午 9 点。");
    }
    if (clocks.length > 1) return fail("当前每个任务支持一个执行时间，请分别创建多个任务。");
    if (firstClock && !readClock(firstClock, next.pendingPeriod)) return fail("时间无效或有歧义，请使用明确时间，例如：上午 9 点、下午 3 点半或 21:30。");
    let hint: ScheduleHint | undefined;
    if (firstRule) {
      const rule = firstRule[0];
      if (rule === "每天" || rule === "每日") hint = { kind: "daily" };
      else if (rule.includes("工作日")) hint = { kind: "weekdays" };
      else if (/^每(?:周|星期)/.test(rule)) {
        const day = rule.replace(/^每(?:周|星期)/, "");
        if (!day) return fail("请说明每周几执行，例如：每周一上午 9 点。");
        hint = { kind: "weekly", weekday: /^[1-7]$/.test(day) ? Number(day) % 7 : day === "天" ? 0 : WEEKDAYS.indexOf(day) };
      } else {
        const current = inBeijing(now + (rule === "明天" ? DAY : 0));
        const date = rule.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})/);
        const year = date ? Number(date[1]) : current.getUTCFullYear();
        const month = date ? Number(date[2]) : current.getUTCMonth() + 1;
        const day = date ? Number(date[3]) : current.getUTCDate();
        if (!validDate(year, month, day)) return fail("日期不存在，请使用有效日期，例如：2026-10-20 上午 9 点。");
        hint = { kind: "once", year, month, day };
      }
    }
    const clock = firstClock ? readClock(firstClock, next.pendingPeriod)! : undefined;
    if (!hint && !clock && /(?:\d{1,2}月\d{1,2}|\d{1,2}[-/]\d{1,2}|周[一二三四五六日天]|星期[一二三四五六日天]|\d+分钟|几点|定时|执行时间)/.test(value)) {
      return fail("没有识别到明确的执行时间。请使用“每天 9 点”“每周一 9 点”或“2026-10-20 9 点”。");
    }
    if (hint || clock || incompletePeriod) {
      const contextHint = hint ?? next.pendingSchedule ?? (next.schedule ? hintFromSchedule(next.schedule) : undefined);
      const contextTime = clock ?? (incompletePeriod ? undefined : next.pendingTime ?? (next.schedule ? timeFromSchedule(next.schedule) : undefined));
      if (contextHint && contextTime) {
        next.schedule = contextHint.kind === "once"
          ? { kind: "once", runAt: beijingTimestamp(contextHint.year, contextHint.month, contextHint.day, contextTime.hour, contextTime.minute) }
          : { ...contextHint, ...contextTime };
        delete next.pendingSchedule;
        delete next.pendingTime;
        delete next.pendingPeriod;
      } else {
        delete next.schedule;
        next.pendingSchedule = contextHint;
        next.pendingTime = contextTime;
        if (incompletePeriod) next.pendingPeriod = incompletePeriod;
      }
      let content = value;
      // Remove from the right so the earlier match's indexes stay stable.
      const ranges = [firstRule, firstClock].filter((match): match is RegExpExecArray => Boolean(match)).sort((a, b) => (b.index ?? 0) - (a.index ?? 0));
      for (const range of ranges) content = content.slice(0, range.index) + content.slice((range.index ?? 0) + range[0].length);
      content = tidyContent(content).replace(/^(?:的|时|在)\s*/, "").trim();
      if (!clock) content = content.replace(/^(?:上午|下午|早上|早晨|晚上|晚间|凌晨|中午)\s*/, "");
      if (firstClock && /^[零〇一二两三四五六七八九十]{2,}/.test(value.slice((firstClock.index ?? 0) + firstClock[0].length))) {
        return fail("分钟没有表达完整，请使用明确时间，例如：每天上午九点十五分。");
      }
      if (/^(?:左右|前|后|之前|之后|到|至|和|或|之间|以后|以前|大约|大概|约|每|[~～\-.:：])/.test(content) || /(?:[0-9一二三四五六七八九十]+\s*(?:点|时|分|秒)|上午|下午|晚上)/.test(content)) {
        return fail("执行时间有歧义，请指定准确的单个时间，例如：每天上午 9 点。");
      }
      if (content && !/^(?:定时任务|任务|执行|运行|执行一次|一次|开始|即可)$/.test(content)) next.prompt = content;
    } else if (value) {
      if (editing) return fail("请说明要修改的字段，例如：“名称改为运营日报”“执行内容改为查询北京今日气温”或“改成每天 10 点执行”。");
      if (/^(?:好|好的|确认|确认创建|确认修改|取消|删除|修改|查看|查询任务|有哪些任务|帮我创建一个任务|任务)$/.test(value)) return fail("请描述执行内容和时间，例如：每天上午 9 点生成昨日运营日报。");
      next.prompt = tidyContent(value);
    } else if (!understoodField) return fail("请描述执行内容和时间，例如：每天上午 9 点生成昨日运营日报。");
  } else if (!understoodField) return fail("请描述执行内容和时间，例如：每天上午 9 点生成昨日运营日报。");

  if (!next.name && next.prompt) next.name = deriveTaskName(next.prompt);
  const error = validateScheduledTaskDraft(next, now);
  if (error) {
    const missing = !next.prompt ? "请补充要执行的内容，例如：生成昨日运营日报。" : next.pendingSchedule ? "已记住执行周期，请补充具体时间，例如：上午 9 点。" : next.pendingTime ? "已记住执行时刻，请补充日期或周期，例如：每天、每周一或明天。" : error;
    return { draft: next, ready: false, message: missing };
  }
  return { draft: next, ready: true, message: editing ? "请确认以下修改，确认后更新原任务。" : "请确认任务内容和执行时间，确认后创建。" };
}
