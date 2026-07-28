import { run, RunStreamEvent, setDefaultOpenAIKey } from "@openai/agents";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { DemoArtifact } from "../../../lib/demo-tools";
import {
  createTradingManager,
  NestedAgentEvent,
} from "../../../lib/trading-agents";
import { checkRateLimit } from "../../../lib/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(20),
  preferredAgent: z
    .enum(["operations", "product", "merchant", "campaign", "project"])
    .optional(),
});

const toolLabels: Record<string, string> = {
  consult_operations_agent: "调用日常运营 Agent",
  consult_product_agent: "调用商品运营 Agent",
  consult_merchant_agent: "调用招商 Agent",
  consult_campaign_agent: "调用营销活动 Agent",
  consult_project_agent: "调用项目管理 Agent",
  query_operations_kpis: "查询经营指标",
  diagnose_product: "读取商品表现",
  score_merchant_leads: "筛选招商线索",
  analyze_campaign: "分析活动进度",
  export_campaign_followups: "生成跟进清单",
  build_project_plan: "生成项目计划",
};

function rawItem(event: RunStreamEvent) {
  if (event.type !== "run_item_stream_event") return undefined;
  return event.item.rawItem as
    | {
        name?: string;
        output?: string | { type?: string; text?: string };
      }
    | undefined;
}

function extractArtifact(output: unknown): DemoArtifact | undefined {
  let text: string | undefined;
  if (typeof output === "string") text = output;
  if (
    output &&
    typeof output === "object" &&
    "text" in output &&
    typeof output.text === "string"
  ) {
    text = output.text;
  }
  if (!text) return;
  try {
    const parsed = JSON.parse(text) as { artifact?: DemoArtifact };
    return parsed.artifact;
  } catch {
    return;
  }
}

function formatInput(
  messages: z.infer<typeof bodySchema>["messages"],
  preferredAgent?: z.infer<typeof bodySchema>["preferredAgent"],
) {
  const labels: Record<string, string> = {
    operations: "日常运营 Agent",
    product: "商品运营 Agent",
    merchant: "招商 Agent",
    campaign: "营销活动 Agent",
    project: "项目管理 Agent",
  };
  const transcript = messages
    .map(
      (message) =>
        `${message.role === "user" ? "用户" : "助手"}：${message.content}`,
    )
    .join("\n\n");
  return preferredAgent
    ? `用户指定优先交给“${labels[preferredAgent]}”。\n\n${transcript}`
    : transcript;
}

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "请求内容无效，请缩短输入后重试。" },
      { status: 400 },
    );
  }

  const runtime = env as unknown as {
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
  };
  const apiKey = runtime.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "演示服务尚未配置 OpenAI API 密钥。" },
      { status: 503 },
    );
  }
  if (runtime.OPENAI_MODEL) process.env.OPENAI_MODEL = runtime.OPENAI_MODEL;
  setDefaultOpenAIKey(apiKey);

  const limit = await checkRateLimit(request);
  if (!limit.allowed) {
    return Response.json(
      { error: "演示调用次数已达上限，请稍后再试。" },
      {
        status: 429,
        headers: { "retry-after": String(limit.retryAfterSeconds ?? 3600) },
      },
    );
  }

  const encoder = new TextEncoder();
  let closed = false;

  return new Response(
    new ReadableStream({
      start(controller) {
        const emit = (event: string, data: Record<string, unknown>) => {
          if (closed) return;
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
        };

        const handleNestedEvent = async ({
          agentName,
          event,
        }: NestedAgentEvent) => {
          if (event.type === "agent_updated_stream_event") {
            emit("agent.started", {
              name: event.agent.name,
              detail: "专家 Agent 正在分析",
            });
          }
          if (event.type === "run_item_stream_event") {
            const item = rawItem(event);
            if (event.name === "tool_called") {
              const name = item?.name || "business_tool";
              emit("tool.started", {
                name,
                label: toolLabels[name] || `${agentName} 调用工具`,
              });
            }
            if (event.name === "tool_output") {
              const name = item?.name || "business_tool";
              emit("tool.completed", {
                name,
                detail: "演示数据已返回",
              });
              const artifact = extractArtifact(item?.output);
              if (artifact) {
                emit("artifact.ready", {
                  artifact: { ...artifact, id: crypto.randomUUID() },
                });
              }
            }
          }
        };

        void (async () => {
          emit("run.started", {
            detail: `模型：${runtime.OPENAI_MODEL || process.env.OPENAI_MODEL || "gpt-5.6-terra"}`,
          });
          try {
            const manager = createTradingManager(handleNestedEvent);
            const stream = await run(
              manager,
              formatInput(parsed.data.messages, parsed.data.preferredAgent),
              {
                stream: true,
                signal: request.signal,
                maxTurns: 8,
                tracing: undefined,
                toolExecution: { maxFunctionToolConcurrency: 3 },
              },
            );

            for await (const event of stream) {
              if (event.type === "raw_model_stream_event") {
                if (event.data.type === "output_text_delta") {
                  emit("message.delta", { delta: event.data.delta });
                }
              } else if (event.type === "run_item_stream_event") {
                const item = rawItem(event);
                if (event.name === "tool_called") {
                  const name = item?.name || "agent_tool";
                  emit("tool.started", {
                    name,
                    label: toolLabels[name] || "调度专家 Agent",
                  });
                }
                if (event.name === "tool_output") {
                  const name = item?.name || "agent_tool";
                  emit("tool.completed", {
                    name,
                    detail: "专家分析已返回",
                  });
                }
              }
            }

            await stream.completed;
            emit("run.completed", { output: stream.finalOutput ?? "" });
          } catch (error) {
            if (request.signal.aborted) return;
            emit("run.failed", {
              message:
                error instanceof Error ? error.message : "多 Agent 执行失败",
            });
          } finally {
            if (!closed) {
              closed = true;
              controller.close();
            }
          }
        })();
      },
      cancel() {
        closed = true;
      },
    }),
    {
      headers: {
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "content-type": "text/event-stream; charset=utf-8",
        "x-accel-buffering": "no",
      },
    },
  );
}
