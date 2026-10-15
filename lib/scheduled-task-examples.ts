import { formatSchedule, type ScheduledTask } from "./scheduled-tasks";

/** Local, editable examples so the management demo can be reviewed immediately. */
export function createScheduledTaskExamples(now: number): ScheduledTask[] {
  const examples: Omit<ScheduledTask, "id" | "createdAt" | "updatedAt">[] = [
    { name: "上海每周天气预报", prompt: "发我一份上海当周的天气预报", schedule: { kind: "weekly", weekday: 1, hour: 9, minute: 0 }, enabled: true },
    { name: "每日运营日报", prompt: "生成昨日运营日报，汇总GMV、订单量及变化情况", schedule: { kind: "daily", hour: 9, minute: 0 }, enabled: true },
    { name: "工作日业务巡检", prompt: "检查核心业务指标，汇总异常波动", schedule: { kind: "weekdays", hour: 10, minute: 0 }, enabled: false },
  ];
  return examples.map((example, index) => {
    const id = `scheduled-demo-example-${index + 1}`;
    const createdAt = now - index * 60_000;
    return { ...example, id, createdAt, updatedAt: createdAt, sourceConversation: {
      id: `conversation-${id}`, title: example.name, createdAt, updatedAt: createdAt,
      messages: [
        { id: `${id}-request`, role: "user", content: `帮我创建定时任务：${formatSchedule(example.schedule)}${example.prompt}` },
        { id: `${id}-reply`, role: "assistant", content: `这是一条可编辑的演示任务「${example.name}」，执行时间：${formatSchedule(example.schedule)}。演示模式下不实际执行。` },
      ],
    } };
  });
}
