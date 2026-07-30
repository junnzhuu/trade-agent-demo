"use client";

import {
  ArrowDownUp,
  BrainCircuit,
  Check,
  ChevronDown,
  CornerDownLeft,
  Folder,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Plus,
  Search,
  Share2,
  Square,
  X,
} from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { runDemoScenario } from "@/lib/demo-simulator";
import {
  createTaskTitle,
  filterRecentTasks,
  formatTaskTimestamp,
  initialRecentTasks,
  prependRecentTask,
  type RecentTask,
  type TaskMessage,
} from "@/lib/task-history";

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
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [recentTasks, setRecentTasks] =
    useState<RecentTask[]>(initialRecentTasks);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const runTokenRef = useRef(0);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const searchButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const filteredTasks = useMemo(
    () => filterRecentTasks(recentTasks, searchQuery),
    [recentTasks, searchQuery],
  );

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
    setActiveResultIndex(0);
    requestAnimationFrame(() => searchButtonRef.current?.focus());
  }, []);

  const openSearch = useCallback(() => {
    setMobileSidebarOpen(false);
    setSearchQuery("");
    setActiveResultIndex(0);
    setSearchOpen(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, []);

  const startNewChat = useCallback(() => {
    runTokenRef.current += 1;
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
    setRunning(false);
    setActiveTaskId(null);
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

      const taskId = createId();
      const assistantId = createId();
      const userMessage: TaskMessage = {
        id: createId(),
        role: "user",
        content: prompt,
      };
      const runToken = runTokenRef.current + 1;
      runTokenRef.current = runToken;
      let assistantText = "";

      setMessages([
        userMessage,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          pending: true,
        },
      ]);
      setInput("");
      setRunning(true);
      setActiveTaskId(taskId);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await runDemoScenario({
          prompt,
          signal: controller.signal,
          onEvent: ({ name, data }) => {
            if (
              name !== "message.delta" ||
              runTokenRef.current !== runToken
            ) {
              return;
            }
            const delta = String(data.delta ?? "");
            assistantText += delta;
            setMessages((current) =>
              current.map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      pending: false,
                      content: `${message.content}${delta}`,
                    }
                  : message,
              ),
            );
          },
        });

        if (runTokenRef.current === runToken && assistantText) {
          setRecentTasks((current) =>
            prependRecentTask(current, {
              id: taskId,
              title: createTaskTitle(prompt),
              metadata: formatTaskTimestamp(new Date()),
              icon: "folder",
              messages: [
                userMessage,
                {
                  id: assistantId,
                  role: "assistant",
                  content: assistantText,
                },
              ],
            }),
          );
        }
      } catch (error) {
        if (runTokenRef.current !== runToken) return;
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
        if (runTokenRef.current === runToken) {
          abortRef.current = null;
          setRunning(false);
        }
      }
    },
    [running],
  );

  const openTask = useCallback(
    (task: RecentTask) => {
      runTokenRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      setRunning(false);
      setMessages(task.messages);
      setActiveTaskId(task.id);
      setInput("");
      setMobileSidebarOpen(false);
      closeSearch();
    },
    [closeSearch],
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

  const handleSearchKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveResultIndex((current) =>
        filteredTasks.length
          ? Math.min(current + 1, filteredTasks.length - 1)
          : 0,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveResultIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && filteredTasks[activeResultIndex]) {
      event.preventDefault();
      openTask(filteredTasks[activeResultIndex]);
    }
  };

  const handleDialogKeyDown = (
    event: KeyboardEvent<HTMLElement>,
  ) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSearch();
      return;
    }

    if (event.key !== "Tab") return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'input, button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
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
          <div className="sidebar-header-actions">
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
            <button
              aria-label="搜索最近任务"
              className="sidebar-search-button"
              onClick={openSearch}
              ref={searchButtonRef}
              type="button"
            >
              <Search size={18} strokeWidth={1.8} />
            </button>
          </div>
        </header>

        <button className="new-chat" onClick={startNewChat} type="button">
          <Plus size={19} strokeWidth={1.8} />
          新建
        </button>

        <section className="recent-section">
          <h2>最近任务</h2>
          <nav aria-label="最近任务">
            {recentTasks.map((task) => (
              <button
                aria-current={activeTaskId === task.id ? "page" : undefined}
                className={activeTaskId === task.id ? "current" : ""}
                key={task.id}
                onClick={() => openTask(task)}
                type="button"
              >
                {task.title}
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

      {searchOpen && (
        <div className="search-modal-layer">
          <button
            aria-label="关闭任务搜索"
            className="search-modal-scrim"
            onClick={closeSearch}
            type="button"
          />
          <section
            aria-labelledby="search-dialog-title"
            aria-modal="true"
            className="search-dialog"
            onKeyDown={handleDialogKeyDown}
            role="dialog"
          >
            <div className="search-dialog-header">
              <label className="task-search-field">
                <Search aria-hidden="true" size={23} strokeWidth={1.7} />
                <span className="sr-only">搜索任务</span>
                <input
                  aria-activedescendant={
                    filteredTasks[activeResultIndex]
                      ? `recent-task-result-${filteredTasks[activeResultIndex].id}`
                      : undefined
                  }
                  aria-controls="recent-task-results"
                  autoComplete="off"
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setActiveResultIndex(0);
                  }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="搜索任务"
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                />
              </label>
              <button
                aria-label="关闭搜索"
                className="search-dialog-close"
                onClick={closeSearch}
                type="button"
              >
                <X size={24} strokeWidth={1.7} />
              </button>
            </div>

            <h2 id="search-dialog-title">最近任务</h2>
            <ul
              aria-live="polite"
              className="search-results"
              id="recent-task-results"
            >
              {filteredTasks.length ? (
                filteredTasks.map((task, index) => (
                  <li key={task.id}>
                    <button
                      aria-current={
                        activeTaskId === task.id ? "page" : undefined
                      }
                      className={`search-result ${
                        activeResultIndex === index ? "active" : ""
                      }`}
                      id={`recent-task-result-${task.id}`}
                      onClick={() => openTask(task)}
                      onMouseEnter={() => setActiveResultIndex(index)}
                      type="button"
                    >
                      <strong>{task.title}</strong>
                      <span>
                        {task.icon === "project" ? (
                          <Share2 size={17} strokeWidth={1.7} />
                        ) : (
                          <Folder size={17} strokeWidth={1.7} />
                        )}
                        <span>{task.metadata}</span>
                      </span>
                    </button>
                  </li>
                ))
              ) : (
                <li className="search-empty">
                  <Search size={24} strokeWidth={1.5} />
                  <strong>未找到相关任务</strong>
                  <span>换个关键词试试</span>
                </li>
              )}
            </ul>
          </section>
        </div>
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
