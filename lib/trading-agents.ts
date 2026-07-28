import { Agent, RunStreamEvent, tool } from "@openai/agents";
import { z } from "zod";
import {
  analyzeCampaign,
  buildProjectPlan,
  diagnoseProduct,
  exportCampaignFollowups,
  queryOperationsKpis,
  scoreMerchantLeads,
} from "./demo-tools";

export type NestedAgentEvent = {
  agentName: string;
  event: RunStreamEvent;
};

const model = () => process.env.OPENAI_MODEL || "gpt-5.6-terra";

const modelSettings = {
  reasoning: { effort: "low" as const },
  parallelToolCalls: true,
  store: false,
};

const operationsTool = tool({
  name: "query_operations_kpis",
  description:
    "查询内置演示数据中的交易经营指标。分析 GMV、访客、转化率、订单和退款率时调用。",
  parameters: z.object({ period: z.enum(["7d", "30d"]) }),
  execute: async ({ period }) => JSON.stringify(queryOperationsKpis(period)),
});

const productTool = tool({
  name: "diagnose_product",
  description:
    "根据商品 SKU 查询演示商品数据并生成流量、转化、库存和运营诊断。",
  parameters: z.object({ sku: z.string().min(1).max(40) }),
  execute: async ({ sku }) => JSON.stringify(diagnoseProduct(sku)),
});

const merchantTool = tool({
  name: "score_merchant_leads",
  description: "按潜力分筛选演示招商线索并返回跟进优先级。",
  parameters: z.object({ minScore: z.number().min(0).max(100) }),
  execute: async ({ minScore }) =>
    JSON.stringify(scoreMerchantLeads(minScore)),
});

const campaignAnalysisTool = tool({
  name: "analyze_campaign",
  description: "查询演示营销活动的目标、报名、审核和完成进度。",
  parameters: z.object({ campaignId: z.string().min(1).max(40) }),
  execute: async ({ campaignId }) =>
    JSON.stringify(analyzeCampaign(campaignId)),
});

const campaignExportTool = tool({
  name: "export_campaign_followups",
  description: "生成演示活动待跟进商家的 CSV 清单。",
  parameters: z.object({ campaignId: z.string().min(1).max(40) }),
  execute: async ({ campaignId }) =>
    JSON.stringify(exportCampaignFollowups(campaignId)),
});

const projectTool = tool({
  name: "build_project_plan",
  description: "根据目标和周期生成 2 到 8 周的交易业务项目计划。",
  parameters: z.object({
    objective: z.string().min(2).max(120),
    weeks: z.number().int().min(2).max(8),
  }),
  execute: async ({ objective, weeks }) =>
    JSON.stringify(buildProjectPlan(objective, weeks)),
});

function specialist(
  name: string,
  instructions: string,
  tools: ReturnType<typeof tool>[],
) {
  return new Agent({
    name,
    model: model(),
    modelSettings,
    instructions: `${instructions}

你只使用内置演示数据。必须先调用最相关的业务工具，再基于工具结果输出：
1. 一句话结论；
2. 2-4 条数据依据；
3. 3 条可执行建议。
不要编造工具未返回的数据，明确说明结果来自演示数据。`,
    tools,
  });
}

export function createTradingManager(
  onNestedEvent: (payload: NestedAgentEvent) => void | Promise<void>,
) {
  const operationsAgent = specialist(
    "日常运营 Agent",
    "你负责经营指标、GMV 异动、流量转化、订单和退款分析。",
    [operationsTool],
  );
  const productAgent = specialist(
    "商品运营 Agent",
    "你负责商品表现、流量转化、库存和商品运营动作。",
    [productTool],
  );
  const merchantAgent = specialist(
    "招商 Agent",
    "你负责招商线索筛选、商家潜力评估和跟进优先级。",
    [merchantTool],
  );
  const campaignAgent = specialist(
    "营销活动 Agent",
    "你负责营销活动报名进度、风险诊断和待跟进清单导出。",
    [campaignAnalysisTool, campaignExportTool],
  );
  const projectAgent = specialist(
    "项目管理 Agent",
    "你负责交易业务项目计划、里程碑、行动项和风险管理。",
    [projectTool],
  );

  const asManagedTool = (agent: Agent, toolName: string, description: string) =>
    agent.asTool({
      toolName,
      toolDescription: description,
      onStream: async ({ event }) => {
        await onNestedEvent({ agentName: agent.name, event });
      },
      runConfig: {
        tracingDisabled: true,
        traceIncludeSensitiveData: false,
      },
    });

  return new Agent({
    name: "交易主理人",
    model: model(),
    modelSettings,
    instructions: `你是“交易 Agent”演示工作台的根 Agent，负责理解用户意图、拆解任务、调用专家 Agent 并汇总结果。

规则：
- 每次业务问题必须调用至少一个最相关的专家 Agent，不能直接凭常识回答。
- 跨领域问题可并行调用多个专家，但单次最多调用三个。
- 用户明确指定 Agent 时优先遵循。
- 最终回答使用简洁中文，结构为“结论 / 关键发现 / 建议动作”。
- 所有数据均为演示数据，必须在最终回答结尾注明。
- 如果用户问题不属于五类业务或缺少关键输入，先提出一个简短澄清问题。
- 不执行任何真实写操作，不声称连接了生产系统。`,
    tools: [
      asManagedTool(
        operationsAgent,
        "consult_operations_agent",
        "让日常运营 Agent 分析 GMV、访客、转化、订单或退款问题。",
      ),
      asManagedTool(
        productAgent,
        "consult_product_agent",
        "让商品运营 Agent 诊断商品表现、趋势与运营动作。",
      ),
      asManagedTool(
        merchantAgent,
        "consult_merchant_agent",
        "让招商 Agent 筛选商家线索并制定跟进优先级。",
      ),
      asManagedTool(
        campaignAgent,
        "consult_campaign_agent",
        "让营销活动 Agent 分析报名进度或导出待跟进清单。",
      ),
      asManagedTool(
        projectAgent,
        "consult_project_agent",
        "让项目管理 Agent 生成计划、里程碑和风险清单。",
      ),
    ],
  });
}
