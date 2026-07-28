"use client";

import {
  ArrowDownUp,
  BrainCircuit,
  Check,
  ChevronDown,
  CornerDownLeft,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Plus,
  Square,
} from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { runDemoScenario } from "@/lib/demo-simulator";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
};

const recentChats = ["出价上下限", "飞书机器人默认标题"];

// 后续功能扩展会从这五类能力进入；首页先保持截图中的极简状态。
const agentCapabilities = [
  "日常运营 Agent",
  "商品运营 Agent",
  "招商 Agent",
  "营销活动 Agent",
  "项目管理 Agent",
];

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  const startNewChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
    setRunning(false);
    setMobileSidebarOpen(false);
  }, []);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({
      behavior: running ? "smooth" : "auto",
      block: "end",
    });
  }, [messages, running]);

  const sendPrompt = useCallback(
    async (rawPrompt: string) => {
      const prompt = rawPrompt.trim();
      if (!prompt || running) return;

      const assistantId = createId();
      setMessages((current) => [
        ...current,
        { id: createId(), role: "user", content: prompt },
        {
          id: assistantId,
          role: "assistant",
          content: "",
          pending: true,
        },
      ]);
      setInput("");
      setRunning(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await runDemoScenario({
          prompt,
          signal: controller.signal,
          onEvent: ({ name, data }) => {
            if (name !== "message.delta") return;
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
          },
        });
      } catch (error) {
        const stopped =
          error instanceof DOMException && error.name === "AbortError";
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? {
                  ...message,
                  pending: false,
                  content: stopped
                    ? "已停止生成。"
                    : "演示任务执行失败，请稍后重试。",
                }
              : message,
          ),
        );
      } finally {
        abortRef.current = null;
        setRunning(false);
      }
    },
    [running],
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void sendPrompt(input);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendPrompt(input);
    }
  };

  return (
    <main
      className={`minimal-app ${sidebarOpen ? "" : "sidebar-collapsed"}`}
    >
      <span className="sr-only">
        交易业务智能工作台，使用演示数据，支持{" "}
        {agentCapabilities.join("、")}
      </span>

      <aside
        aria-label="对话导航"
        className={`minimal-sidebar ${sidebarOpen ? "open" : ""} ${
          mobileSidebarOpen ? "mobile-open" : ""
        }`}
      >
        <header className="sidebar-brand">
          <span className="brand-mark" aria-hidden="true">
            <MessageSquare size={18} strokeWidth={1.8} />
          </span>
          <strong>交易 Agent</strong>
          <button
            aria-label="收起侧栏"
            className="sidebar-toggle"
            onClick={() => {
              setSidebarOpen(false);
              setMobileSidebarOpen(false);
            }}
            type="button"
          >
            <PanelLeftClose size={18} strokeWidth={1.8} />
          </button>
        </header>

        <button className="new-chat" onClick={startNewChat} type="button">
          <Plus size={19} strokeWidth={1.8} />
          新建
        </button>

        <section className="recent-section">
          <h2>最近对话</h2>
          <nav aria-label="最近对话">
            {recentChats.map((chat) => (
              <button
                key={chat}
                onClick={() => setInput(chat)}
                type="button"
              >
                {chat}
              </button>
            ))}
          </nav>
        </section>

        <button className="account-menu" type="button">
          <span className="account-avatar" aria-hidden="true">
            <span>咪</span>
          </span>
          <strong>哈基咪(Manbo)</strong>
          <ArrowDownUp size={15} strokeWidth={1.8} />
        </button>
      </aside>

      <section className="minimal-main">
        <button
          aria-label="展开侧栏"
          className="open-sidebar"
          onClick={() => {
            setSidebarOpen(true);
            setMobileSidebarOpen(true);
          }}
          type="button"
        >
          <PanelLeftOpen size={19} />
        </button>

        {messages.length === 0 ? (
          <div className="empty-state">
            <h1>Hi 哈基咪(Manbo)，有什么可以帮你的？</h1>
            <Composer
              input={input}
              onInput={setInput}
              onKeyDown={handleKeyDown}
              onSubmit={submit}
              onStop={() => abortRef.current?.abort()}
              running={running}
              thinking={thinking}
              toggleThinking={() => setThinking((current) => !current)}
            />
          </div>
        ) : (
          <>
            <div aria-live="polite" className="chat-scroll">
              <div className="chat-column">
                {messages.map((message) => (
                  <article className={`chat-message ${message.role}`} key={message.id}>
                    <div className="chat-avatar" aria-hidden="true">
                      {message.role === "assistant" ? (
                        <MessageSquare size={16} />
                      ) : (
                        "咪"
                      )}
                    </div>
                    <div>
                      <strong>
                        {message.role === "assistant"
                          ? "交易 Agent"
                          : "哈基咪(Manbo)"}
                      </strong>
                      <p>
                        {message.pending && !message.content
                          ? "正在思考…"
                          : message.content}
                      </p>
                    </div>
                  </article>
                ))}
                <div ref={scrollEndRef} />
              </div>
            </div>
            <div className="docked-composer">
              <Composer
                input={input}
                onInput={setInput}
                onKeyDown={handleKeyDown}
                onSubmit={submit}
                onStop={() => abortRef.current?.abort()}
                running={running}
                thinking={thinking}
                toggleThinking={() => setThinking((current) => !current)}
              />
            </div>
          </>
        )}
      </section>

      {mobileSidebarOpen && (
        <button
          aria-label="关闭侧栏"
          className="sidebar-scrim"
          onClick={() => setMobileSidebarOpen(false)}
          type="button"
        />
      )}
    </main>
  );
}

function Composer({
  input,
  onInput,
  onKeyDown,
  onSubmit,
  onStop,
  running,
  thinking,
  toggleThinking,
}: {
  input: string;
  onInput: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: (event: FormEvent) => void;
  onStop: () => void;
  running: boolean;
  thinking: boolean;
  toggleThinking: () => void;
}) {
  return (
    <form className="minimal-composer" onSubmit={onSubmit}>
      <textarea
        aria-label="有什么可以帮你的？"
        maxLength={2000}
        onChange={(event) => onInput(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="有什么可以帮你的？"
        rows={2}
        value={input}
      />
      <div className="composer-actions">
        <div className="composer-left-actions">
          <button aria-label="添加附件" type="button">
            <Paperclip size={18} strokeWidth={1.7} />
            <span>附件</span>
          </button>
          <button
            aria-pressed={thinking}
            className={thinking ? "active" : ""}
            onClick={toggleThinking}
            type="button"
          >
            <BrainCircuit size={18} strokeWidth={1.7} />
            <span>思考</span>
            {thinking && <Check size={12} />}
          </button>
          <button className="model-selector" type="button">
            GLM-5
            <ChevronDown size={13} />
          </button>
        </div>

        {running ? (
          <button
            aria-label="停止生成"
            className="composer-send"
            onClick={onStop}
            type="button"
          >
            <Square fill="currentColor" size={12} />
          </button>
        ) : (
          <button
            aria-label="发送"
            className="composer-send"
            disabled={!input.trim()}
            type="submit"
          >
            <CornerDownLeft size={18} strokeWidth={1.8} />
          </button>
        )}
      </div>
    </form>
  );
}
