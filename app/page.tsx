"use client";

import {
  Activity,
  ArrowDownToLine,
  ArrowUp,
  BarChart3,
  Bot,
  Box,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  FileSpreadsheet,
  ListChecks,
  Menu,
  MessageSquareText,
  PanelRight,
  Plus,
  RotateCcw,
  Search,
  Square,
  Store,
  Target,
  X,
} from "lucide-react";
import {
  FormEvent,
  KeyboardEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

type Role = "user" | "assistant";
type AgentKey =
  | "operations"
  | "product"
  | "merchant"
  | "campaign"
  | "project";

type Message = {
  id: string;
  role: Role;
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

const agents: Array<{
  key: AgentKey;
  name: string;
  short: string;
  description: string;
  icon: typeof Activity;
}> = [
  {
    key: "operations",
    name: "日常运营 Agent",
    short: "运营",
    description: "GMV、流量、商家与订单诊断",
    icon: Activity,
  },
  {
    key: "product",
    name: "商品运营 Agent",
    short: "商品",
    description: "商品表现、趋势词与上架建议",
    icon: Box,
  },
  {
    key: "merchant",
    name: "招商 Agent",
    short: "招商",
    description: "线索筛选、商家评分与跟进建议",
    icon: Store,
  },
  {
    key: "campaign",
    name: "营销活动 Agent",
    short: "营销",
    description: "报名进度、活动诊断与清单导出",
    icon: Target,
  },
  {
    key: "project",
    name: "项目管理 Agent",
    short: "项目",
    description: "计划拆解、风险识别与行动项",
    icon: ListChecks,
  },
];

const suggestions = [
  "分析最近 7 天 GMV 下滑原因，并给出运营建议",
  "诊断商品 SNK-2048 的流量和转化表现",
  "筛选高潜招商商家，并生成本周跟进优先级",
  "查看夏季超单活动报名进度，导出待跟进清单",
  "为 8 月交易增长专项制定 4 周项目计划",
];

const initialMessages: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "你好，我是交易主理人。\n\n我会根据任务调度运营、商品、招商、营销活动和项目管理 Agent，并在右侧展示完整执行过程。当前所有业务数据均为演示数据。",
  },
];

const id = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function parseSseBlock(block: string) {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    if (line.startsWith("data:")) data.push(line.slice(5).trim());
  }
  return { event, data: data.join("\n") };
}

function StatusMark({ status }: { status: RunEvent["status"] }) {
  if (status === "done") return <Check aria-hidden="true" size={13} />;
  if (status === "error") return <X aria-hidden="true" size={13} />;
  return <Circle aria-hidden="true" className="status-pulse" size={11} />;
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

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.key === preferredAgent),
    [preferredAgent],
  );

  const addRunEvent = useCallback(
    (type: string, label: string, detail?: string, status: RunEvent["status"] = "running") => {
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
        const index = [...next]
          .reverse()
          .findIndex((event) => event.type === type && event.status === "running");
        if (index === -1) return next;
        const realIndex = next.length - 1 - index;
        next[realIndex] = { ...next[realIndex], status, detail: detail ?? next[realIndex].detail };
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
        addRunEvent("run", "交易主理人开始分析", String(data.detail ?? ""));
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
          "读取演示数据",
        );
      } else if (eventName === "tool.completed") {
        markLatestEvent(
          `tool:${String(data.name)}`,
          "done",
          String(data.detail ?? "已返回结果"),
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
            `生成结果：${artifact.title}`,
            artifact.kind === "csv" ? "可下载 CSV" : "可展开查看",
            "done",
          );
        }
      } else if (eventName === "run.completed") {
        markLatestEvent("run", "done", "任务已完成");
      } else if (eventName === "run.failed") {
        markLatestEvent("run", "error", String(data.message ?? "执行失败"));
      }
    },
    [addRunEvent, markLatestEvent],
  );

  const sendPrompt = useCallback(
    async (rawPrompt: string) => {
      const prompt = rawPrompt.trim();
      if (!prompt || running) return;

      lastPromptRef.current = prompt;
      const userMessage: Message = { id: id(), role: "user", content: prompt };
      const assistantId = id();
      const assistantMessage: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        pending: true,
      };
      const contextMessages = [...messages, userMessage]
        .filter((message) => message.id !== "welcome")
        .slice(-12)
        .map(({ role, content }) => ({ role, content }));

      setMessages((current) => [...current, userMessage, assistantMessage]);
      setInput("");
      setEvents([]);
      setArtifacts([]);
      setRunning(true);
      setRightOpen(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/runs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            messages: contextMessages,
            preferredAgent,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(payload.error || `请求失败（${response.status}）`);
        }
        if (!response.body) throw new Error("服务未返回流式内容");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() ?? "";
          for (const block of blocks) {
            const parsed = parseSseBlock(block);
            handleServerEvent(parsed.event, parsed.data, assistantId);
          }
        }
      } catch (error) {
        const aborted = error instanceof DOMException && error.name === "AbortError";
        const message = aborted
          ? "任务已停止。"
          : error instanceof Error
            ? error.message
            : "服务暂时不可用";
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantId
              ? { ...item, pending: false, error: !aborted, content: message }
              : item,
          ),
        );
        if (!aborted) {
          addRunEvent("run", "任务执行失败", message, "error");
        }
      } finally {
        setRunning(false);
        abortRef.current = null;
      }
    },
    [addRunEvent, handleServerEvent, messages, preferredAgent, running],
  );

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

  const newTask = () => {
    abortRef.current?.abort();
    setMessages(initialMessages);
    setEvents([]);
    setArtifacts([]);
    setInput("");
    setPreferredAgent(undefined);
    setLeftOpen(false);
    setRightOpen(false);
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
    <main className="workspace-shell">
      <a className="skip-link" href="#conversation">
        跳到对话区
      </a>

      <header className="mobile-header">
        <button
          aria-label="打开 Agent 列表"
          className="icon-button"
          onClick={() => setLeftOpen(true)}
          type="button"
        >
          <Menu size={18} />
        </button>
        <strong>交易 Agent</strong>
        <button
          aria-label="打开执行过程"
          className="icon-button"
          onClick={() => setRightOpen(true)}
          type="button"
        >
          <PanelRight size={18} />
        </button>
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

      <aside
        aria-label="Agent 与示例任务"
        className={`left-rail ${leftOpen ? "mobile-open" : ""}`}
      >
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">
            TA
          </div>
          <div>
            <strong>交易 Agent</strong>
            <span>Multi-agent workspace</span>
          </div>
          <button
            aria-label="关闭 Agent 列表"
            className="icon-button mobile-only"
            onClick={() => setLeftOpen(false)}
            type="button"
          >
            <X size={17} />
          </button>
        </div>

        <button className="new-task-button" onClick={newTask} type="button">
          <Plus size={16} />
          新建任务
          <span>⌘ K</span>
        </button>

        <section className="rail-section">
          <div className="section-label">
            <span>业务 Agent</span>
            <span>5</span>
          </div>
          <div className="agent-list">
            {agents.map((agent) => {
              const Icon = agent.icon;
              const selected = preferredAgent === agent.key;
              return (
                <button
                  aria-pressed={selected}
                  className={`agent-row ${selected ? "selected" : ""}`}
                  key={agent.key}
                  onClick={() =>
                    setPreferredAgent(selected ? undefined : agent.key)
                  }
                  type="button"
                >
                  <span className="agent-icon">
                    <Icon size={16} />
                  </span>
                  <span>
                    <strong>{agent.name}</strong>
                    <small>{agent.description}</small>
                  </span>
                  <ChevronRight size={14} />
                </button>
              );
            })}
          </div>
        </section>

        <section className="rail-section examples-section">
          <div className="section-label">
            <span>演示任务</span>
          </div>
          <div className="example-list">
            {suggestions.slice(0, 3).map((suggestion, index) => (
              <button
                key={suggestion}
                onClick={() => {
                  setLeftOpen(false);
                  void sendPrompt(suggestion);
                }}
                type="button"
              >
                <span>0{index + 1}</span>
                {suggestion}
              </button>
            ))}
          </div>
        </section>

        <div className="rail-footer">
          <span className="demo-dot" />
          <span>
            <strong>演示环境</strong>
            <small>全部业务数据均为虚构</small>
          </span>
        </div>
      </aside>

      <section className="conversation-panel" id="conversation">
        <header className="conversation-header">
          <div>
            <span className="eyebrow">CURRENT WORKSPACE</span>
            <h1>交易业务智能工作台</h1>
          </div>
          <div className="header-actions">
            <span className="outline-badge">
              <Circle size={8} />
              演示数据
            </span>
            <button
              aria-label="搜索当前对话"
              className="icon-button"
              type="button"
            >
              <Search size={17} />
            </button>
          </div>
        </header>

        <div aria-live="polite" className="message-scroller">
          <div className="message-column">
            {messages.map((message) => (
              <article
                className={`message ${message.role} ${message.error ? "message-error" : ""}`}
                key={message.id}
              >
                <div className="message-author">
                  <span className="avatar">
                    {message.role === "assistant" ? (
                      <Bot size={15} />
                    ) : (
                      <span>你</span>
                    )}
                  </span>
                  <strong>
                    {message.role === "assistant" ? "交易主理人" : "你"}
                  </strong>
                  <time>{message.id === "welcome" ? "现在" : "刚刚"}</time>
                </div>
                <div className="message-content">
                  {message.pending && !message.content ? (
                    <span className="typing-row">
                      <span />
                      <span />
                      <span />
                      正在调度业务 Agent
                    </span>
                  ) : (
                    message.content
                  )}
                </div>
                {message.error && (
                  <button
                    className="inline-action"
                    onClick={() => void sendPrompt(lastPromptRef.current)}
                    type="button"
                  >
                    <RotateCcw size={14} />
                    重新执行
                  </button>
                )}
              </article>
            ))}

            {!running && messages.length === 1 && (
              <section className="starter-area">
                <div className="starter-heading">
                  <div className="wire-orbit" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <Bot size={21} />
                  </div>
                  <div>
                    <h2>从一个业务问题开始</h2>
                    <p>主理人会识别意图，并把任务交给最合适的 Agent。</p>
                  </div>
                </div>
                <div className="suggestion-grid">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={suggestion}
                      onClick={() => void sendPrompt(suggestion)}
                      type="button"
                    >
                      <span>0{index + 1}</span>
                      <strong>{suggestion}</strong>
                      <ArrowUp size={15} />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        <div className="composer-wrap">
          {selectedAgent && (
            <div className="selected-agent-chip">
              <span>优先交给：{selectedAgent.name}</span>
              <button
                aria-label="取消指定 Agent"
                onClick={() => setPreferredAgent(undefined)}
                type="button"
              >
                <X size={13} />
              </button>
            </div>
          )}
          <form className="composer" onSubmit={submit}>
            <textarea
              aria-label="输入任务"
              maxLength={4000}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleComposerKey}
              placeholder="描述一个交易业务问题，或让 Agent 执行一项任务…"
              rows={2}
              value={input}
            />
            <div className="composer-footer">
              <span>
                <MessageSquareText size={14} />
                Enter 发送 · Shift + Enter 换行
              </span>
              {running ? (
                <button
                  aria-label="停止生成"
                  className="send-button"
                  onClick={() => abortRef.current?.abort()}
                  type="button"
                >
                  <Square size={13} fill="currentColor" />
                </button>
              ) : (
                <button
                  aria-label="发送任务"
                  className="send-button"
                  disabled={!input.trim()}
                  type="submit"
                >
                  <ArrowUp size={16} />
                </button>
              )}
            </div>
          </form>
          <p className="composer-note">
            交易 Agent 可能会出错，请核对重要信息。当前仅使用内置演示数据。
          </p>
        </div>
      </section>

      <aside
        aria-label="Agent 执行过程"
        className={`right-rail ${rightOpen ? "mobile-open" : ""}`}
      >
        <header className="right-header">
          <div>
            <span className="eyebrow">RUN TRACE</span>
            <h2>执行过程</h2>
          </div>
          <button
            aria-label="关闭执行过程"
            className="icon-button mobile-only"
            onClick={() => setRightOpen(false)}
            type="button"
          >
            <X size={17} />
          </button>
        </header>

        <div className="run-summary">
          <div>
            <Clock3 size={15} />
            <span>
              <small>当前状态</small>
              <strong>{running ? "执行中" : events.length ? "已完成" : "等待任务"}</strong>
            </span>
          </div>
          <div>
            <BriefcaseBusiness size={15} />
            <span>
              <small>已调度</small>
              <strong>
                {events.filter((event) => event.type.startsWith("agent:")).length} Agent
              </strong>
            </span>
          </div>
        </div>

        <div className="trace-list" aria-live="polite">
          {events.length === 0 ? (
            <div className="trace-empty">
              <div className="trace-empty-map" aria-hidden="true">
                <span>主</span>
                <i />
                <span>子</span>
                <i />
                <span>工</span>
              </div>
              <strong>尚未开始执行</strong>
              <p>发送任务后，这里会显示 Agent 调度、工具调用和生成结果。</p>
            </div>
          ) : (
            events.map((event) => (
              <div className={`trace-event ${event.status}`} key={event.id}>
                <span className="trace-marker">
                  <StatusMark status={event.status} />
                </span>
                <div>
                  <strong>{event.label}</strong>
                  {event.detail && <p>{event.detail}</p>}
                </div>
              </div>
            ))
          )}
        </div>

        {artifacts.length > 0 && (
          <section className="artifact-section">
            <div className="section-label">
              <span>生成结果</span>
              <span>{artifacts.length}</span>
            </div>
            <div className="artifact-list">
              {artifacts.map((artifact) => (
                <button
                  key={artifact.id}
                  onClick={() => setSelectedArtifact(artifact)}
                  type="button"
                >
                  {artifact.kind === "csv" ? (
                    <FileSpreadsheet size={17} />
                  ) : (
                    <BarChart3 size={17} />
                  )}
                  <span>
                    <strong>{artifact.title}</strong>
                    <small>
                      {artifact.kind === "csv" ? "CSV 文件" : "分析结果"}
                    </small>
                  </span>
                  <ChevronRight size={14} />
                </button>
              ))}
            </div>
          </section>
        )}
      </aside>

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
              <div>
                <span className="eyebrow">ARTIFACT</span>
                <h2 id="artifact-title">{selectedArtifact.title}</h2>
              </div>
              <button
                aria-label="关闭结果预览"
                className="icon-button"
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
                  {selectedArtifact.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ol>
              )}
              {selectedArtifact.kind === "csv" && (
                <pre>{selectedArtifact.content}</pre>
              )}
            </div>
            {selectedArtifact.kind === "csv" && (
              <footer>
                <button
                  className="download-button"
                  onClick={() => downloadArtifact(selectedArtifact)}
                  type="button"
                >
                  <ArrowDownToLine size={15} />
                  下载 CSV
                </button>
              </footer>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
