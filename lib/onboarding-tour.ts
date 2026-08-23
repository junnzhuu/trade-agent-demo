export type OnboardingPlacement =
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "center";

export type OnboardingStepId =
  | "welcome"
  | "workspace-navigation"
  | "sidebar-tools"
  | "recent-tasks"
  | "task-management"
  | "account-content"
  | "task-composer"
  | "add-menu"
  | "run-modes"
  | "model-and-send"
  | "quick-skills"
  | "agent-execution"
  | "answer-actions"
  | "feedback"
  | "experts-and-skills"
  | "automation";

export type OnboardingStep = {
  id: OnboardingStepId;
  targetId?: string;
  title: string;
  description: string;
  placement: OnboardingPlacement;
};

export const onboardingSteps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "欢迎使用交易智能助手",
    description:
      "这是一个由多个业务 Agent 协同的演示工作台。接下来将沿着真实用户动线，快速了解任务执行、专家技能和结果管理。",
    placement: "center",
  },
  {
    id: "workspace-navigation",
    targetId: "workspace-navigation",
    title: "三个核心工作入口",
    description:
      "“新建任务”开启新对话；“专家 · 技能”查看业务能力；“自动化”用于承接可定时执行的重复工作。",
    placement: "right",
  },
  {
    id: "sidebar-tools",
    targetId: "sidebar-tools",
    title: "搜索与收起侧栏",
    description:
      "搜索支持按任务标题和来源信息实时筛选；侧栏可收起，为对话和分析结果腾出更大空间。",
    placement: "right",
  },
  {
    id: "recent-tasks",
    targetId: "recent-tasks",
    title: "最近任务与后台状态",
    description:
      "点击历史任务可继续同一会话。时间会动态更新；执行中显示加载圈，后台完成且未查看时显示提醒点。系统最多同时运行 3 个任务。",
    placement: "right",
  },
  {
    id: "task-management",
    targetId: "task-management",
    title: "管理单个任务",
    description:
      "悬浮任务后打开三点菜单，可以重命名、置顶、收藏或归档。归档任务不能直接查看，需在“我的归档”中恢复。",
    placement: "right",
  },
  {
    id: "account-content",
    targetId: "account-content",
    title: "个人中心",
    description:
      "这里可以查看收藏内容、加入反馈群和完成飞书授权。之后也可从这里重新播放本指引。",
    placement: "right",
  },
  {
    id: "task-composer",
    targetId: "task-composer",
    title: "用自然语言下达任务",
    description:
      "直接输入业务问题，输入 / 可搜索并多选技能，选中后可继续补充需求。Enter 发送，Shift + Enter 换行。",
    placement: "top",
  },
  {
    id: "add-menu",
    targetId: "add-menu",
    title: "添加内容与能力",
    description:
      "加号菜单包含添加文件和计划模式。可从首页专家推荐或专家 · 技能页面选择专家，输入 / 仍可调用技能。",
    placement: "right",
  },
  {
    id: "run-modes",
    targetId: "run-modes",
    title: "计划模式",
    description:
      "开启后，Agent 会先拆解任务、形成执行计划，再依次完成各步骤。开关可直接在加号菜单中设置。",
    placement: "right",
  },
  {
    id: "model-and-send",
    targetId: "model-and-send",
    title: "选择模型并启动执行",
    description:
      "可根据速度、推理能力和图片理解需求切换模型。输入非空时发送按钮可用；任务执行中，同一位置变为停止按钮。",
    placement: "left",
  },
  {
    id: "quick-skills",
    targetId: "quick-skills",
    title: "快捷专家与技能",
    description:
      "按业务场景选择专家后，输入框会带入专家标准问，并展示该专家的推荐技能；选择技能会保留专家路由并用技能标准问替换正文。",
    placement: "top",
  },
  {
    id: "agent-execution",
    targetId: "agent-execution",
    title: "查看 Agent 思考和 Skill 调用",
    description:
      "执行中会展示已处理时长、路由到的专家、工具查询和每步逻辑。答案完成后思考过程默认折叠，可随时重新展开。",
    placement: "left",
  },
  {
    id: "answer-actions",
    targetId: "answer-actions",
    title: "答案后续操作",
    description:
      "每个答案支持复制、点赞、点踩、重新生成和分享。更多菜单中可收藏答案或复制演示请求 ID。",
    placement: "bottom",
  },
  {
    id: "feedback",
    targetId: "feedback",
    title: "提交有针对性的反馈",
    description:
      "点踩后可选择不正确、未遵循指示、偏题等原因并补充详情。账号菜单中的通用反馈还支持最多 6 张图片。",
    placement: "bottom",
  },
  {
    id: "experts-and-skills",
    targetId: "experts-and-skills",
    title: "场景、专家与技能目录",
    description:
      "先选择业务场景，再按子 Agent 专家筛选能力。技能卡会展示用途、标准问，并支持一键带入新任务。",
    placement: "bottom",
  },
  {
    id: "automation",
    targetId: "automation",
    title: "将重复工作交给 Agent",
    description:
      "自动化用于承接定时运营监控、活动跟进和项目检查等重复任务。你已了解当前演示版的全部主要能力。",
    placement: "bottom",
  },
];
