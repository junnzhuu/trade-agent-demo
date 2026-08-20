export type AgentSkillDefinition = {
  id: string;
  mountKey: string;
  name: string;
  description: string;
  standardQuestion: string;
};

export type SubAgentDefinition = {
  id: string;
  originalName: string;
  name: string;
  description: string;
  standardQuestion: string;
  skills: AgentSkillDefinition[];
};

export type SceneDefinition = {
  id: "merchant" | "product" | "acquisition" | "campaign" | "project";
  name: string;
  status: "available" | "coming-soon";
  agents: SubAgentDefinition[];
};

type SkillInput = Omit<AgentSkillDefinition, "mountKey">;
type AgentInput = Omit<SubAgentDefinition, "skills"> & { skills: SkillInput[] };

function defineAgent(agent: AgentInput): SubAgentDefinition {
  return {
    ...agent,
    skills: agent.skills.map((skill) => ({
      ...skill,
      mountKey: `${agent.id}:${skill.id}`,
    })),
  };
}

export const merchantOperationAgents: SubAgentDefinition[] = [
  defineAgent({
    id: "merchant-operation-agent",
    originalName: "商家运营专家",
    name: "商家运营专家",
    description: "处理商家运营、风控与信息查询，并查找商家联系方式和负责小二。",
    standardQuestion:
      "请召唤商家运营专家，查询商家【商家ID】的联系渠道和内部负责小二。",
    skills: [],
  }),
  defineAgent({
    id: "data-analysis-agent",
    originalName: "数据分析专家",
    name: "商品经营分析专家",
    description: "分析商品价格竞争力与单品经营表现，定位价格、销售等关键问题。",
    standardQuestion:
      "请召唤商品经营分析专家，诊断 SPU=【SPUID】在【时间范围】内的经营表现和异常原因。",
    skills: [
      {
        id: "compare_price_analysis",
        name: "价格力分析",
        description: "分析商品或品类在指定时间段的价格竞争力，并支持按条件筛选查看结果。",
        standardQuestion: "帮我分析 SPU=【SPUID】在【时间范围】内的价格力，看看与外网相比是否有高价问题。",
      },
      {
        id: "spu_diagnosis",
        name: "单品诊断",
        description: "对单个 SPU 的价格、GMV、订单和供给等表现进行多维诊断。",
        standardQuestion: "帮我诊断商品 SPU=【SPUID】在【时间范围】内 GMV 下跌的原因。",
      },
    ],
  }),
  defineAgent({
    id: "ab-analysis-agent",
    originalName: "AB实验数据分析专家",
    name: "AB 实验专家",
    description: "设计 AB 实验、分析实验结果，并给出推全、继续观测或回退建议。",
    standardQuestion:
      "请召唤 AB 实验专家，分析 paramsId=【paramsId】对应的实验结果并给出是否推全的建议。",
    skills: [
      {
        id: "ab-analysis-assistant",
        name: "AB 实验结果分析",
        description: "读取已有 AB 实验报告或平台数据，分析核心指标并给出实验结论。",
        standardQuestion: "帮我分析这个 AB 实验结果，paramsId=【paramsId】。",
      },
      {
        id: "ab-design-assistant",
        name: "AB 实验设计",
        description: "从业务想法出发设计实验假设、指标、样本量、分流和决策标准。",
        standardQuestion: "我想对【业务方案】开展 AB 实验，帮我设计实验假设、指标体系、样本量、分流方案和决策标准。",
      },
    ],
  }),
  defineAgent({
    id: "deposit-agent",
    originalName: "寄存领域专家",
    name: "寄存业务专家",
    description: "查询寄存单据，诊断入仓准入、直发托管和库存流向等寄存问题。",
    standardQuestion:
      "请召唤寄存业务专家，分析入仓单【AP或JS入仓单号】的状态和库存流向。",
    skills: [
      {
        id: "deposit-bill-basic-query",
        name: "寄存单据查询",
        description: "按单号查询寄存域各类单据详情，并根据单据前缀自动匹配查询方式。",
        standardQuestion: "帮我查询寄存单据【PF单据号】的详情。",
      },
      {
        id: "deposit-inbound-access-analysis",
        name: "入仓准入诊断",
        description: "判断指定商家和商品可入仓园区，并定位配额、库容、黑名单等阻塞原因。",
        standardQuestion: "帮我判断 sellerId=【sellerId】、SPU=【SPUID】、SKU=【SKUID】能否入仓，哪些园区可以入，不能入的原因是什么？",
      },
      {
        id: "deposit-inbound-direct-delivery-analysis",
        name: "入仓直发托管分析",
        description: "分析 AP 入仓单的直发托管状态及未走直发履约的原因。",
        standardQuestion: "帮我分析入仓单【AP入仓单号】的直发托管情况，以及没有走直发履约的原因。",
      },
      {
        id: "deposit-inbound-flow-analysis",
        name: "入仓库存流向分析",
        description: "查询 AP/JS 入仓单完整信息，并分析库存后续流向。",
        standardQuestion: "帮我分析入仓单【AP或JS入仓单号】的库存流向。",
      },
    ],
  }),
  defineAgent({
    id: "trade-data-query",
    originalName: "交易域数据查询专家",
    name: "交易实时查询专家",
    description: "查询订单、商品、物流、出价库存等交易域实时明细。",
    standardQuestion:
      "请召唤交易实时查询专家，查询采购单【采购单编号】的实时明细。",
    skills: [
      {
        id: "dewu-trade-api-invoke",
        name: "交易实时查询",
        description: "通过交易域实时接口查询订单、物流、支付、商品、预约单、采购单和库存等明细。",
        standardQuestion: "帮我查询采购单编号【采购单编号】的采购单信息。",
      },
      {
        id: "commodity_data_query_guide",
        name: "商品基础信息查询",
        description: "查询 SPU、SKU、品牌和类目等商品基础与聚合信息。",
        standardQuestion: "帮我查询 SPU=【SPUID】的商品基础信息，包括品牌、类目和 SKU 信息。",
      },
    ],
  }),
  defineAgent({
    id: "offline_data_query_agent",
    originalName: "Galaxy离线数仓数据分析专家",
    name: "离线数据分析专家",
    description: "通过离线数仓完成交易、逆向、价格力、直播等数据查询与分析。",
    standardQuestion:
      "请召唤离线数据分析专家，通过离线数仓查询【时间范围】内的订单数据并按状态汇总。",
    skills: [
      {
        id: "galaxy-price-power-analysis",
        name: "离线价格力分析",
        description: "基于离线数仓分析 SKU/渠道价格力、高价天数、价差等指标。",
        standardQuestion: "帮我用离线数仓分析 SPU=【SPUID】在【时间范围】内的价格力，看看高价 SKU 和主要价差来源。",
      },
      {
        id: "refund-info-query",
        name: "退货退款数据查询",
        description: "查询退货退款单、操作流水、退款原因、金额、拦截单和签收异常等逆向数据。",
        standardQuestion: "帮我查询【时间范围】内退货退款单的退款原因分布，并生成查询 SQL。",
      },
      {
        id: "galaxyMcp-trade-query-rule",
        name: "交易离线数据查询",
        description: "通过 Galaxy 查询订单、商品、商家、出价库存等交易域离线数据。",
        standardQuestion: "帮我用 Galaxy 查询【日期范围】的订单数据，并按订单状态汇总。",
      },
      {
        id: "active-service-query",
        name: "主动服务数据查询",
        description: "查询主动服务规则、业务拦截、退货审核、物流异常和策略执行数据。",
        standardQuestion: "帮我查询【时间范围】内主动服务拦截单数据，并分析各规则的执行情况。",
      },
      {
        id: "live-danmu-analysis",
        name: "直播弹幕分析",
        description: "按直播场次分析弹幕内容，提炼用户反馈、热点与问题。",
        standardQuestion: "帮我分析直播场次 ID=【场次ID】的弹幕内容，并输出结构化分析报告。",
      },
      {
        id: "live-stream-data-report",
        name: "直播场次数据报告",
        description: "按直播场次汇总流量、成交和商品表现，生成结构化数据报告。",
        standardQuestion: "帮我生成直播场次 ID=【场次ID】的流量和成交数据报告。",
      },
      {
        id: "live-stream-coupon-analysis",
        name: "主播券分析",
        description: "分析直播场次中的主播券发放、使用与成交贡献。",
        standardQuestion: "帮我分析直播场次 ID=【场次ID】的主播券使用和成交贡献。",
      },
      {
        id: "live-stream-daily-report",
        name: "直播 GMV 日报",
        description: "生成直播每日 GMV、订单等核心指标播报。",
        standardQuestion: "帮我生成【日期】的直播 GMV 日报。",
      },
      {
        id: "live-anchor-conversion-report",
        name: "达人转化率播报",
        description: "汇总达人主播流量与成交数据，输出转化率表现与关键洞察。",
        standardQuestion: "帮我生成【时间范围】的达人转化率播报。",
      },
      {
        id: "live-incubation-detail",
        name: "孵化达人明细看板",
        description: "查看重点孵化达人场次明细、等级和波动异常。",
        standardQuestion: "帮我查看【时间范围】内重点孵化达人明细和波动异常。",
      },
      {
        id: "live-incubation-overview",
        name: "孵化达人大盘",
        description: "汇总重点孵化达人大盘 GMV、企卖品占比、转化排名和未开播情况。",
        standardQuestion: "帮我生成【时间范围】的孵化达人速览，查看大盘 GMV 和转化率排名。",
      },
    ],
  }),
  defineAgent({
    id: "trade-order-agent",
    originalName: "交易订单智能体",
    name: "订单业务专家",
    description: "处理租赁、履约、国补、服务标、跨境、转赠等订单查询与诊断。",
    standardQuestion:
      "请召唤订单业务专家，分析子订单号【租赁子订单号】的订单状态和异常原因。",
    skills: [
      {
        id: "galaxy-adhoc",
        name: "临时取数",
        description: "将临时取数需求转为 SQL 并通过 Galaxy 查询，返回结构化结果。",
        standardQuestion: "帮我临时取数：查询【表名】在【分区】的前【条数】条数据。",
      },
      {
        id: "quota_diagnosis",
        name: "用户补贴额度诊断",
        description: "查询指定用户的补贴额度、使用情况和明细。",
        standardQuestion: "查询用户 ID=【用户ID】的补贴额度。",
      },
      {
        id: "rental-conversion-analysis",
        name: "租赁转化漏斗分析",
        description: "分析租赁业务流量漏斗、订单漏斗和创单错误，定位主要流失环节。",
        standardQuestion: "帮我分析【时间范围】内租赁订单转化率和转化漏斗，找出主要流失环节并生成可视化报告。",
      },
      {
        id: "violate-payment-query",
        name: "违约追缴订单查询",
        description: "查询违约追缴订单的新增、追缴中、追缴成功及金额情况。",
        standardQuestion: "/violate-payment-query 查询违约追缴订单情况。",
      },
      {
        id: "lease-return-stat",
        name: "租赁归还统计",
        description: "统计今日待归还、逾期未归还和已归还未揽收的租赁订单。",
        standardQuestion: "调用 lease-return-stat，查询【日期】待归还订单数和逾期未归还订单明细。",
      },
      {
        id: "resell-order-voucher-query",
        name: "转赠订单凭证查询",
        description: "根据 110 子单号查询转赠类型、履约信息及买卖家凭证。",
        standardQuestion: "帮我查询【转赠子订单号】的转赠订单凭证和转赠类型。",
      },
      {
        id: "order-biz-analysis",
        name: "订单业务诊断",
        description: "识别租赁、履约、国补、退运补贴、预约单、服务标等订单场景并执行对应诊断。",
        standardQuestion: "帮我分析这笔租赁业务：子订单号【租赁子订单号】，查看订单状态和异常原因。",
      },
      {
        id: "lease-bidding-seller-rank",
        name: "租赁出价明细",
        description: "基于最新租赁出价数据生成多商家出价明细飞书表格。",
        standardQuestion: "帮我生成【日期】的租赁出价明细飞书表格，数据使用 du_all.lease_bidding。",
      },
    ],
  }),
  defineAgent({
    id: "merchant-quit-diagnosis-expert",
    originalName: "商家退出问题定位专家",
    name: "商家退出诊断专家",
    description: "定位商家无法退出入驻的阻塞原因，快速找到待处理项。",
    standardQuestion:
      "请召唤商家退出诊断专家，检查商家【商家ID】无法退出入驻的阻塞原因。",
    skills: [
      {
        id: "merchant-quit-diagnosis",
        name: "商家退出诊断",
        description: "查询商家退出校验结果，定位导致无法退出入驻的阻塞项。",
        standardQuestion: "商家 ID=【商家ID】为什么不能退出入驻？帮我做退出校验并定位阻塞原因。",
      },
      {
        id: "dewu-trade-api-invoke",
        name: "交易实时查询",
        description: "通过交易域实时接口查询订单、物流、支付、商品、预约单、采购单和库存等明细。",
        standardQuestion: "帮我查询采购单编号【采购单编号】的采购单信息。",
      },
    ],
  }),
  defineAgent({
    id: "refund-agent1",
    originalName: "逆向agent",
    name: "逆向业务分析专家",
    description: "查询退货退款、主动服务和 CPO 数据，支持逆向业务分析与取数。",
    standardQuestion:
      "请召唤逆向业务分析专家，查询【时间范围】内退货退款原因分布并生成 SQL。",
    skills: [
      {
        id: "cpo-query",
        name: "CPO 数据分析",
        description: "查询和拆解 CPO 数据，分析会话量、订单量及各模块趋势。",
        standardQuestion: "帮我分析【时间范围】内 CPO 趋势，并按业务模块拆解会话量和订单量。",
      },
      {
        id: "refund-info-query",
        name: "退货退款数据查询",
        description: "查询退货退款单、操作流水、退款原因、金额、拦截单和签收异常等逆向数据。",
        standardQuestion: "帮我查询【时间范围】内退货退款单的退款原因分布，并生成查询 SQL。",
      },
      {
        id: "active-service-query",
        name: "主动服务数据查询",
        description: "查询主动服务规则、业务拦截、退货审核、物流异常和策略执行数据。",
        standardQuestion: "帮我查询【时间范围】内主动服务拦截单数据，并分析各规则的执行情况。",
      },
    ],
  }),
  defineAgent({
    id: "commodity-dress-up-agent",
    originalName: "穿搭项目agent",
    name: "女装穿搭运营专家",
    description: "完成女装穿搭项目的数据观测、供给分析、日报产出和图片链路诊断。",
    standardQuestion: "请召唤女装穿搭运营专家，生成【日期】的女装穿搭日报。",
    skills: [
      {
        id: "dress-up-guashangka",
        name: "穿搭图片挂品识别",
        description: "根据 SPU 和商品图片识别对应规格 PV ID，并区分接口失败与未识别。",
        standardQuestion: "帮我识别 SPU=【SPUID】、图片URL=【图片URL】对应的规格 PV ID。",
      },
      {
        id: "dress-up-spu-monitor",
        name: "穿搭图片供给监控",
        description: "监控女装 SPU/CSPU 图片供给，识别高商详 PV 但优质图不足的商品。",
        standardQuestion: "帮我查询 SPU=【SPUID】的图片供给情况。",
      },
      {
        id: "dress-up-report",
        name: "女装穿搭报告与推送",
        description: "生成女装穿搭日报、V3 进度报告，并支持飞书文档与消息发布。",
        standardQuestion: "生成【日期】的女装穿搭日报并发布到飞书。",
      },
      {
        id: "dress-up-data",
        name: "女装穿搭数据查询",
        description: "查询女装穿搭供给、覆盖、标注、场域差异等 ODPS 数据并校验口径。",
        standardQuestion: "帮我查询【日期】女装穿搭合格及优质图片供给量和覆盖率，并给出 SQL 口径。",
      },
      {
        id: "dress-up-image-check",
        name: "穿搭图片状态诊断",
        description: "诊断图片从来源、挂品、打标、审核到 C 端分发的完整状态。",
        standardQuestion: "帮我诊断 media_pool_id=【media_pool_id】这张穿搭图片从挂品、打标、审核到 C 端分发的完整状态。",
      },
    ],
  }),
  defineAgent({
    id: "Security Service Desk",
    originalName: "安全服务台",
    name: "安全服务专家",
    description: "处理得物安全相关咨询与安全服务台问题。",
    standardQuestion: "请召唤安全服务专家，帮我处理这个安全问题：【安全问题】。",
    skills: [],
  }),
  defineAgent({
    id: "ai-acl-agent",
    originalName: "权限智能体",
    name: "权限服务专家",
    description: "处理权限相关查询、问题定位与使用咨询。",
    standardQuestion:
      "请召唤权限服务专家，查询并定位这个权限问题：【权限问题】。",
    skills: [],
  }),
];

export const quickComposerExperts: SubAgentDefinition[] = [
  merchantOperationAgents[0],
  defineAgent({
    id: "marketing-acquisition-campaign-agent",
    originalName: "营销招商活动专家",
    name: "营销招商活动专家",
    description: "处理营销活动、招商推进、商家沟通和执行方案制定。",
    standardQuestion:
      "请召唤营销招商活动专家，围绕【活动/招商需求】制定执行方案和商家沟通建议。",
    skills: [],
  }),
  defineAgent({
    id: "mrd-writing-agent",
    originalName: "MRD撰写专家",
    name: "MRD撰写专家",
    description: "根据业务背景、用户问题和目标输出结构化 MRD。",
    standardQuestion:
      "请召唤 MRD 撰写专家，根据【需求背景】撰写一份完整的 MRD。",
    skills: [],
  }),
  defineAgent({
    id: "product-operation-agent",
    originalName: "商品运营专家",
    name: "商品运营专家",
    description: "分析商品经营表现、问题原因并提供运营建议。",
    standardQuestion:
      "请召唤商品运营专家，分析商品【商品ID】在【时间范围】内的经营表现并给出运营建议。",
    skills: [],
  }),
];

export const sceneCatalog: SceneDefinition[] = [
  {
    id: "merchant",
    name: "商家运营",
    status: "available",
    agents: merchantOperationAgents,
  },
  { id: "product", name: "商品运营", status: "coming-soon", agents: [] },
  { id: "acquisition", name: "招商", status: "coming-soon", agents: [] },
  { id: "campaign", name: "营销活动", status: "coming-soon", agents: [] },
  { id: "project", name: "项目管理", status: "coming-soon", agents: [] },
];

export function getSceneStats(scene: SceneDefinition) {
  return {
    expertCount: scene.agents.length,
    skillCount: scene.agents.reduce(
      (total, agent) => total + agent.skills.length,
      0,
    ),
  };
}
