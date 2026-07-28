"use client";

import {
  Activity,
  ArrowDownToLine,
  ArrowUp,
  BarChart3,
  Bell,
  Bot,
  Box,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock3,
  Command,
  Database,
  FileBarChart,
  FileSpreadsheet,
  HelpCircle,
  History,
  LayoutGrid,
  ListChecks,
  Menu,
  MessageCircleMore,
  MoreHorizontal,
  PanelRight,
  Plus,
  RotateCcw,
  Search,
  Send,
  Settings2,
  Sparkles,
  Square,
  Store,
  Target,
  ThumbsDown,
  ThumbsUp,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";
import {
  type CSSProperties,
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  runDemoScenario,
  type DemoAgentKey,
} from "@/lib/demo-simulator";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  error?: boolean;
};

type RunEvent = {
  id: string;
  type: string;
  label: string;
  detail?: string;
  status: "running" | "done" | "error";
};

type Artifact = {
  id: string;
  kind: "table" | "report" | "csv";
  title: string;
  columns?: string[];
  rows?: Array<Array<string | number>>;
  lines?: string[];
  filename?: string;
  content?: string;
};

type AgentKey = DemoAgentKey;

const id = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const agents: Array<{
  key: AgentKey;
  name: string;
  short: string;
  description: string;
  icon: typeof Activity;
  tone: string;
}> = [
  {
    key: "operations",
    name: "日常运营 Agent",
    short: "经营诊断",
    description: "GMV、流量、商家与订单",
    icon: Activity,
    tone: "violet",
  },
  {
    key: "product",
    name: "商品运营 Agent",
    short: "商品分析",
    description: "商品表现、趋势词与上架",
    icon: Box,
    tone: "blue",
  },
  {
    key: "merchant",
    name: "招商 Agent",
    short: "招商线索",
    description: "线索筛选、评分与跟进",
    icon: Store,
    tone: "orange",
  },
  {
    key: "campaign",
    name: "营销活动 Agent",
    short: "活动运营",
    description: "报名进度、活动诊断",
    icon: Target,
    tone: "pink",
  },
  {
    key: "project",
    name: "项目管理 Agent",
    short: "项目规划",
    description: "计划、风险与行动项",
    icon: ListChecks,
    tone: "green",
  },
];

const suggestions = [
  {
    title: "经营异动诊断",
    prompt: "分析最近 7 天 GMV 下滑原因，并给出运营建议",
    detail: "多维指标归因与行动建议",
    icon: BarChart3,
    tone: "violet",
  },
  {
    title: "商品表现分析",
    prompt: "诊断商品 SNK-2048 的流量和转化表现",
    detail: "定位流量、点击与转化问题",
    icon: Box,
    tone: "blue",
  },
  {
    title: "高潜招商筛选",
    prompt: "筛选高潜招商商家，并生成本周跟进优先级",
    detail: "线索评分与跟进节奏",
    icon: Store,
    tone: "orange",
  },
  {
    title: "活动进度跟进",
    prompt: "查看夏季超单活动报名进度，导出待跟进清单",
    detail: "报名诊断并生成 CSV",
    icon: Target,
    tone: "pink",
  },
  {
    title: "专项项目规划",
    prompt: "为 8 月交易增长专项制定 4 周项目计划",
    detail: "里程碑、风险与行动项",
    icon: ListChecks,
    tone: "green",
  },
];

const initialMessages: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "你好，我是交易主理人。我会根据任务调度运营、商品、招商、营销活动和项目管理 Agent。",
  },
];

const sampleHistory = [
  "夏季超单活动报名诊断",
  "运动鞋品类周度经营复盘",
  "高潜商家招商名单筛选",
];

function StatusMark({ status }: { status: RunEvent["status"] }) {
  if (status === "done") return <Check aria-hidden="true" size={12} />;
  if (status === "error") return <X aria-hidden="true" size={12} />;
  return <Circle aria-hidden="true" className="status-pulse" size={9} />;
}

function TraceIcon({ type }: { type: string }) {
  if (type.startsWith("agent:")) return <Bot size={15} />;
  if (type.startsWith("tool:")) return <Database size={15} />;
  if (type.startsWith("artifact:")) return <FileBarChart size={15} />;
  return <WandSparkles size={15} />;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [preferredAgent, setPreferredAgent] = useState<AgentKey | undefined>();
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(
    null,
  );
  const abortRef = useRef<AbortController | null>(null);
  const lastPromptRef = useRef("");
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.key === preferredAgent),
    [preferredAgent],
  );

  const isLanding = messages.length === 1 && !running;
  const agentCount = events.filter((event) =>
    event.type.startsWith("agent:"),
  ).length;
  const completedCount = events.filter(
    (event) => event.status === "done",
  ).length;
  const runProgress = events.length
    ? Math.round((completedCount / events.length) * 100)
    : 0;

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({
      behavior: running ? "smooth" : "auto",
      block: "end",
    });
  }, [messages, running]);

  const addRunEvent = useCallback(
    (
      type: string,
      label: string,
      detail?: string,
      status: RunEvent["status"] = "running",
    ) => {
      const eventId = id();
      setEvents((current) => [
        ...current,
        { id: eventId, type, label, detail, status },
      ]);
      return eventId;
    },
    [],
  );

  const markLatestEvent = useCallback(
    (type: string, status: RunEvent["status"], detail?: string) => {
      setEvents((current) => {
        const next = [...current];
        const reverseIndex = [...next]
          .reverse()
          .findIndex(
            (event) => event.type === type && event.status === "running",
          );
        if (reverseIndex === -1) return next;
        const index = next.length - 1 - reverseIndex;
        next[index] = {
          ...next[index],
          status,
          detail: detail ?? next[index].detail,
        };
        return next;
      });
    },
    [],
  );

  const handleServerEvent = useCallback(
    (eventName: string, rawData: string, assistantId: string) => {
      if (!rawData) return;
      const data = JSON.parse(rawData) as Record<string, unknown>;
      if (eventName === "run.started") {
        addRunEvent("run", "交易主理人开始规划", String(data.detail ?? ""));
      } else if (eventName === "agent.started") {
        addRunEvent(
          `agent:${String(data.name)}`,
          `${String(data.name)} 已接手`,
          String(data.detail ?? "正在理解任务"),
        );
      } else if (eventName === "tool.started") {
        addRunEvent(
          `tool:${String(data.name)}`,
          String(data.label ?? data.name),
          "正在读取演示数据",
        );
      } else if (eventName === "tool.completed") {
        markLatestEvent(
          `tool:${String(data.name)}`,
          "done",
          String(data.detail ?? "已返回结果"),
        );
      } else if (eventName === "tool.failed") {
        markLatestEvent(
          `tool:${String(data.name)}`,
          "error",
          String(data.message ?? "工具执行失败"),
        );
      } else if (eventName === "agent.completed") {
        markLatestEvent(
          `agent:${String(data.name)}`,
          "done",
          String(data.detail ?? "子任务已完成"),
        );
      } else if (eventName === "message.delta") {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  pending: false,
                  content: `${message.content}${String(data.delta ?? "")}`,
                }
              : message,
          ),
        );
      } else if (eventName === "artifact.ready") {
        const artifact = data.artifact as Artifact;
        if (artifact) {
          setArtifacts((current) => [
            ...current,
            { ...artifact, id: artifact.id || id() },
          ]);
          addRunEvent(
            `artifact:${artifact.title}`,
            `已生成 ${artifact.title}`,
            artifact.kind === "csv" ? "CSV 文件可下载" : "点击可查看详情",
            "done",
          );
        }
      } else if (eventName === "run.completed") {
        markLatestEvent("run", "done", "任务已完成");
      }
    },
    [addRunEvent, markLatestEvent],
  );

  const sendPrompt = useCallback(
    async (rawPrompt: string) => {
      const prompt = rawPrompt.trim();
      if (!prompt || running) return;

      lastPromptRef.current = prompt;
      const assistantId = id();
      setMessages((current) => [
        ...current,
        { id: id(), role: "user", content: prompt },
        {
          id: assistantId,
          role: "assistant",
          content: "",
          pending: true,
        },
      ]);
      setInput("");
      setEvents([]);
      setArtifacts([]);
      setRunning(true);
      setRightOpen(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await runDemoScenario({
          prompt,
          preferredAgent,
          signal: controller.signal,
          onEvent: ({ name, data }) =>
            handleServerEvent(name, JSON.stringify(data), assistantId),
        });
      } catch (error) {
        const aborted =
          error instanceof DOMException && error.name === "AbortError";
        const message = aborted
          ? "任务已停止，你可以调整问题后重新执行。"
          : error instanceof Error
            ? error.message
            : "演示服务暂时不可用";
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantId
              ? { ...item, pending: false, error: !aborted, content: message }
              : item,
          ),
        );
        if (aborted) {
          markLatestEvent("run", "error", "任务已停止");
        } else {
          addRunEvent("run", "任务执行失败", message, "error");
        }
      } finally {
        setRunning(false);
        abortRef.current = null;
      }
    },
    [
      addRunEvent,
      handleServerEvent,
      markLatestEvent,
      preferredAgent,
      running,
    ],
  );

  const newTask = useCallback(() => {
    abortRef.current?.abort();
    setMessages(initialMessages);
    setEvents([]);
    setArtifacts([]);
    setInput("");
    setPreferredAgent(undefined);
    setLeftOpen(false);
    setRightOpen(false);
    lastPromptRef.current = "";
  }, []);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        newTask();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [newTask]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void sendPrompt(input);
  };

  const handleComposerKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (input.trim()) void sendPrompt(input);
    }
  };

  const downloadArtifact = (artifact: Artifact) => {
    const blob = new Blob([artifact.content ?? ""], {
      type: "text/csv;charset=utf-8",
    });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = artifact.filename ?? "交易Agent导出.csv";
    anchor.click();
    URL.revokeObjectURL(href);
  };

  return (
    <main className="app-shell">
      <a className="skip-link" href="#conversation">
        跳到对话区
      </a>

      <header className="global-header">
        <div className="global-brand">
          <button
            aria-label="打开导航"
            className="header-mobile-button"
            onClick={() => setLeftOpen(true)}
            type="button"
          >
            <Menu size={19} />
          </button>
          <div className="brand-glyph" aria-hidden="true">
            <Sparkles size={18} />
          </div>
          <strong>交易 Agent</strong>
          <span className="sr-only">交易业务智能工作台</span>
          <span className="version-pill">DEMO</span>
        </div>
        <nav aria-label="主导航" className="top-navigation">
          <button className="active" type="button">
            <MessageCircleMore size={16} />
            智能工作台
          </button>
          <button type="button">
            <LayoutGrid size={16} />
            Agent 广场
          </button>
          <button type="button">
            <Database size={16} />
            数据空间
          </button>
        </nav>
        <div className="global-actions">
          <button aria-label="全局搜索" className="header-search" type="button">
            <Search size={16} />
            <span>搜索</span>
            <kbd>⌘ /</kbd>
          </button>
          <button aria-label="帮助中心" className="round-button" type="button">
            <HelpCircle size={17} />
          </button>
          <button aria-label="通知" className="round-button" type="button">
            <Bell size={17} />
            <i />
          </button>
          <button className="profile-button" type="button">
            <span>JZ</span>
            <ChevronDown size={14} />
          </button>
          <button
            aria-label="打开执行过程"
            className="header-mobile-button"
            onClick={() => setRightOpen(true)}
            type="button"
          >
            <PanelRight size={19} />
          </button>
        </div>
      </header>

      {(leftOpen || rightOpen) && (
        <button
          aria-label="关闭侧栏"
          className="mobile-scrim"
          onClick={() => {
            setLeftOpen(false);
            setRightOpen(false);
          }}
          type="button"
        />
      )}

      <div className="workspace">
        <aside
          aria-label="任务导航"
          className={`sidebar ${leftOpen ? "mobile-open" : ""}`}
        >
          <div className="sidebar-mobile-title">
            <strong>交易 Agent</strong>
            <button
              aria-label="关闭导航"
              className="round-button"
              onClick={() => setLeftOpen(false)}
              type="button"
            >
              <X size={17} />
            </button>
          </div>

          <button className="new-task-button" onClick={newTask} type="button">
            <span>
              <Plus size={17} />
              新建任务
            </span>
            <kbd>⌘ K</kbd>
          </button>

          <div className="sidebar-scroll">
            <section className="sidebar-section">
              <div className="sidebar-heading">
                <span>我的 Agent</span>
                <button aria-label="管理 Agent" type="button">
                  <Settings2 size={14} />
                </button>
              </div>
              <div className="agent-nav-list">
                {agents.map((agent) => {
                  const Icon = agent.icon;
                  const selected = preferredAgent === agent.key;
                  return (
                    <button
                      aria-pressed={selected}
                      className={selected ? "selected" : ""}
                      key={agent.key}
                      onClick={() =>
                        setPreferredAgent(selected ? undefined : agent.key)
                      }
                      type="button"
                    >
                      <span className={`agent-symbol ${agent.tone}`}>
                        <Icon size={16} />
                      </span>
                      <span>
                        <strong>{agent.short}</strong>
                        <small>{agent.description}</small>
                      </span>
                      {selected && <CheckCircle2 size={15} />}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="sidebar-section history-section">
              <div className="sidebar-heading">
                <span>最近任务</span>
                <History size={14} />
              </div>
              <div className="history-list">
                {lastPromptRef.current && (
                  <button className="current" type="button">
                    <MessageCircleMore size={14} />
                    <span>{lastPromptRef.current}</span>
                    <MoreHorizontal size={14} />
                  </button>
                )}
                {sampleHistory.map((item) => (
                  <button key={item} type="button">
                    <MessageCircleMore size={14} />
                    <span>{item}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="sidebar-footer">
            <div className="demo-status">
              <span className="demo-status-icon">
                <Database size={15} />
              </span>
              <span>
                <strong>演示数据空间</strong>
                <small>5 个数据集 · 刚刚更新</small>
              </span>
              <ChevronRight size={14} />
            </div>
            <p>
              <span />
              前端交互演示，不连接真实业务系统
            </p>
          </div>
        </aside>

        <section className="conversation-panel" id="conversation">
          <header className="conversation-header">
            <div className="conversation-title">
              <span className="header-agent-avatar">
                <Sparkles size={17} />
              </span>
              <div>
                <h1>
                  {lastPromptRef.current
                    ? lastPromptRef.current.slice(0, 24)
                    : "交易主理人"}
                </h1>
                <p>
                  <span />
                  {running
                    ? "正在调度业务 Agent"
                    : "在线 · 可调用 5 个业务 Agent"}
                </p>
              </div>
            </div>
            <div className="conversation-actions">
              <span className="data-badge">
                <Database size={13} />
                演示数据
              </span>
              <button aria-label="任务详情" className="round-button" type="button">
                <MoreHorizontal size={18} />
              </button>
            </div>
          </header>

          <div aria-live="polite" className="conversation-scroll">
            {isLanding ? (
              <section className="welcome-stage">
                <div className="ambient ambient-one" />
                <div className="ambient ambient-two" />
                <div className="welcome-content">
                  <div className="ai-orb" aria-hidden="true">
                    <span className="orb-ring ring-one" />
                    <span className="orb-ring ring-two" />
                    <span className="orb-core">
                      <Sparkles size={30} />
                    </span>
                  </div>
                  <div className="welcome-copy">
                    <span className="welcome-kicker">
                      <Zap size={13} />
                      MULTI-AGENT WORKSPACE
                    </span>
                    <h2>
                      你好，我是<span>交易主理人</span>
                    </h2>
                    <p>
                      把经营问题交给我。我会理解你的目标，调度合适的业务
                      Agent，并把分析过程和生成结果实时呈现出来。
                    </p>
                  </div>

                  <div className="capability-strip">
                    {agents.map((agent) => {
                      const Icon = agent.icon;
                      return (
                        <button
                          key={agent.key}
                          onClick={() => setPreferredAgent(agent.key)}
                          type="button"
                        >
                          <span className={`agent-symbol ${agent.tone}`}>
                            <Icon size={16} />
                          </span>
                          <span>
                            <strong>{agent.short}</strong>
                            <small>{agent.name}</small>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="prompt-gallery">
                    <div className="gallery-heading">
                      <span>
                        <Sparkles size={14} />
                        试试这些任务
                      </span>
                      <small>基于内置演示数据</small>
                    </div>
                    <div className="prompt-grid">
                      {suggestions.map((suggestion, index) => {
                        const Icon = suggestion.icon;
                        return (
                          <button
                            className={index === 0 ? "featured" : ""}
                            key={suggestion.prompt}
                            onClick={() => void sendPrompt(suggestion.prompt)}
                            type="button"
                          >
                            <span className={`prompt-icon ${suggestion.tone}`}>
                              <Icon size={18} />
                            </span>
                            <span>
                              <strong>{suggestion.title}</strong>
                              <small>{suggestion.detail}</small>
                            </span>
                            <ArrowUp size={15} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <div className="message-stream">
                <div className="task-context-card">
                  <span className="context-icon">
                    <Command size={16} />
                  </span>
                  <div>
                    <strong>任务上下文</strong>
                    <p>交易业务演示数据 · 最多调度 3 个 Agent</p>
                  </div>
                  <span className="context-ready">
                    <Check size={12} />
                    已就绪
                  </span>
                </div>

                {messages
                  .filter((message) => message.id !== "welcome")
                  .map((message) => (
                    <article
                      className={`message ${message.role} ${
                        message.error ? "message-error" : ""
                      }`}
                      key={message.id}
                    >
                      <div className="message-avatar">
                        {message.role === "assistant" ? (
                          <Sparkles size={17} />
                        ) : (
                          <span>JZ</span>
                        )}
                      </div>
                      <div className="message-body">
                        <div className="message-meta">
                          <strong>
                            {message.role === "assistant"
                              ? "交易主理人"
                              : "你"}
                          </strong>
                          {message.role === "assistant" && (
                            <span>AI 助手</span>
                          )}
                          <time>刚刚</time>
                        </div>
                        <div className="message-card">
                          {message.pending && !message.content ? (
                            <div className="thinking-state">
                              <span className="thinking-icon">
                                <Sparkles size={16} />
                              </span>
                              <div>
                                <strong>正在理解任务并规划执行步骤</strong>
                                <p>选择最合适的 Agent 和数据工具…</p>
                              </div>
                              <span className="typing-dots">
                                <i />
                                <i />
                                <i />
                              </span>
                            </div>
                          ) : (
                            <div className="message-text">{message.content}</div>
                          )}
                        </div>
                        {message.role === "assistant" &&
                          !message.pending &&
                          message.content && (
                            <div className="message-toolbar">
                              <button aria-label="回答有帮助" type="button">
                                <ThumbsUp size={14} />
                              </button>
                              <button aria-label="回答需改进" type="button">
                                <ThumbsDown size={14} />
                              </button>
                              <button
                                onClick={() =>
                                  void sendPrompt(lastPromptRef.current)
                                }
                                type="button"
                              >
                                <RotateCcw size={14} />
                                重新执行
                              </button>
                            </div>
                          )}
                      </div>
                    </article>
                  ))}
                <div ref={messageEndRef} />
              </div>
            )}
          </div>

          <div className="composer-zone">
            <div className="composer-shell">
              {selectedAgent && (
                <div className="selected-agent">
                  <span className={`agent-symbol ${selectedAgent.tone}`}>
                    <selectedAgent.icon size={14} />
                  </span>
                  优先交给 {selectedAgent.name}
                  <button
                    aria-label="取消指定 Agent"
                    onClick={() => setPreferredAgent(undefined)}
                    type="button"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
              <form onSubmit={submit}>
                <textarea
                  aria-label="输入任务"
                  maxLength={2000}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleComposerKey}
                  placeholder="描述一个交易业务问题，或让 Agent 执行一项任务…"
                  rows={2}
                  value={input}
                />
                <div className="composer-footer">
                  <div className="composer-tools">
                    <button aria-label="选择能力" type="button">
                      <Sparkles size={15} />
                      自动选择 Agent
                      <ChevronDown size={13} />
                    </button>
                    <span />
                    <button aria-label="数据范围" type="button">
                      <Database size={15} />
                      演示数据
                    </button>
                  </div>
                  <div className="composer-submit">
                    <small>{input.length}/2000</small>
                    {running ? (
                      <button
                        aria-label="停止生成"
                        className="send-button stop"
                        onClick={() => abortRef.current?.abort()}
                        type="button"
                      >
                        <Square size={12} fill="currentColor" />
                      </button>
                    ) : (
                      <button
                        aria-label="发送任务"
                        className="send-button"
                        disabled={!input.trim()}
                        type="submit"
                      >
                        <Send size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
            <p className="composer-note">
              AI 生成内容仅用于产品演示，请核对重要信息
              <span>Enter 发送 · Shift + Enter 换行</span>
            </p>
          </div>
        </section>

        <aside
          aria-label="Agent 执行过程"
          className={`run-panel ${rightOpen ? "mobile-open" : ""}`}
        >
          <header className="run-header">
            <div>
              <span className="run-kicker">LIVE TRACE</span>
              <h2>执行过程</h2>
            </div>
            <div>
              {running && <span className="live-badge">运行中</span>}
              <button
                aria-label="关闭执行过程"
                className="round-button mobile-only"
                onClick={() => setRightOpen(false)}
                type="button"
              >
                <X size={17} />
              </button>
            </div>
          </header>

          <div className="run-panel-scroll">
            <section className="run-overview">
              <div
                className="progress-ring"
                style={{ "--progress": `${runProgress * 3.6}deg` } as CSSProperties}
              >
                <span>{events.length ? `${runProgress}%` : "—"}</span>
              </div>
              <div>
                <small>当前任务</small>
                <strong>
                  {running
                    ? "多 Agent 协作执行中"
                    : events.length
                      ? "任务执行完成"
                      : "等待新任务"}
                </strong>
                <p>
                  <Bot size={13} />
                  {agentCount} 个 Agent
                  <i />
                  <Clock3 size={13} />
                  {events.length ? "约 6 秒" : "—"}
                </p>
              </div>
            </section>

            <section className="trace-section">
              <div className="panel-section-title">
                <span>执行时间线</span>
                {events.length > 0 && <small>{events.length} 个步骤</small>}
              </div>
              <div className="trace-list" aria-live="polite">
                {events.length === 0 ? (
                  <div className="trace-empty">
                    <div className="empty-flow" aria-hidden="true">
                      <span>
                        <Sparkles size={16} />
                      </span>
                      <i />
                      <span>
                        <Bot size={16} />
                      </span>
                      <i />
                      <span>
                        <Database size={16} />
                      </span>
                    </div>
                    <strong>执行轨迹将在这里出现</strong>
                    <p>发送任务后，可实时查看路由、Agent 与工具调用。</p>
                  </div>
                ) : (
                  events.map((event, index) => (
                    <div
                      className={`trace-event ${event.status}`}
                      key={event.id}
                    >
                      <div className="trace-line">
                        <span className="trace-symbol">
                          <TraceIcon type={event.type} />
                        </span>
                        {index < events.length - 1 && <i />}
                      </div>
                      <div className="trace-copy">
                        <strong>{event.label}</strong>
                        {event.detail && <p>{event.detail}</p>}
                        <small>
                          {event.status === "running"
                            ? "执行中"
                            : event.status === "error"
                              ? "已中止"
                              : "已完成"}
                        </small>
                      </div>
                      <span className={`trace-status ${event.status}`}>
                        <StatusMark status={event.status} />
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            {artifacts.length > 0 && (
              <section className="artifact-section">
                <div className="panel-section-title">
                  <span>生成结果</span>
                  <small>{artifacts.length} 个文件</small>
                </div>
                <div className="artifact-list">
                  {artifacts.map((artifact) => (
                    <button
                      key={artifact.id}
                      onClick={() => setSelectedArtifact(artifact)}
                      type="button"
                    >
                      <span
                        className={`artifact-icon ${
                          artifact.kind === "csv" ? "green" : "violet"
                        }`}
                      >
                        {artifact.kind === "csv" ? (
                          <FileSpreadsheet size={18} />
                        ) : (
                          <FileBarChart size={18} />
                        )}
                      </span>
                      <span>
                        <strong>{artifact.title}</strong>
                        <small>
                          {artifact.kind === "csv"
                            ? "CSV · 可下载"
                            : "分析结果 · 点击预览"}
                        </small>
                      </span>
                      <ChevronRight size={14} />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>

          <footer className="run-footer">
            <span>
              <BriefcaseBusiness size={14} />
              工作区仅使用演示数据
            </span>
          </footer>
        </aside>
      </div>

      {selectedArtifact && (
        <div
          aria-labelledby="artifact-title"
          aria-modal="true"
          className="modal-layer"
          role="dialog"
        >
          <button
            aria-label="关闭结果预览"
            className="modal-scrim"
            onClick={() => setSelectedArtifact(null)}
            type="button"
          />
          <section className="artifact-modal">
            <header>
              <div className="modal-title">
                <span
                  className={`artifact-icon ${
                    selectedArtifact.kind === "csv" ? "green" : "violet"
                  }`}
                >
                  {selectedArtifact.kind === "csv" ? (
                    <FileSpreadsheet size={20} />
                  ) : (
                    <FileBarChart size={20} />
                  )}
                </span>
                <div>
                  <span>Agent 生成结果</span>
                  <h2 id="artifact-title">{selectedArtifact.title}</h2>
                </div>
              </div>
              <button
                aria-label="关闭结果预览"
                className="round-button"
                onClick={() => setSelectedArtifact(null)}
                type="button"
              >
                <X size={18} />
              </button>
            </header>
            <div className="artifact-content">
              {selectedArtifact.rows && selectedArtifact.columns && (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {selectedArtifact.columns.map((column) => (
                          <th key={column}>{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedArtifact.rows.map((row, rowIndex) => (
                        <tr key={`${selectedArtifact.id}-${rowIndex}`}>
                          {row.map((cell, cellIndex) => (
                            <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {selectedArtifact.lines && (
                <ol className="report-lines">
                  {selectedArtifact.lines.map((line, index) => (
                    <li key={line}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      {line}
                    </li>
                  ))}
                </ol>
              )}
              {selectedArtifact.kind === "csv" && (
                <pre>{selectedArtifact.content}</pre>
              )}
            </div>
            <footer>
              <span>生成于刚刚 · 演示数据</span>
              {selectedArtifact.kind === "csv" && (
                <button
                  className="download-button"
                  onClick={() => downloadArtifact(selectedArtifact)}
                  type="button"
                >
                  <ArrowDownToLine size={15} />
                  下载 CSV
                </button>
              )}
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
