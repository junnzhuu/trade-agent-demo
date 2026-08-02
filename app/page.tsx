"use client";

import {
  ArrowLeft,
  ArrowUp,
  ArrowDownUp,
  Archive,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Ellipsis,
  FilePlus2,
  Folder,
  LoaderCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Pin,
  Plus,
  RotateCcw,
  Search,
  Share2,
  SlidersHorizontal,
  Square,
  ThumbsDown,
  ThumbsUp,
  Users,
  WandSparkles,
  Workflow,
  X,
} from "lucide-react";
import Image from "next/image";
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
import { ExpertSkillWorkspace } from "@/components/expert-skill-workspace";
import {
  createTaskTitle,
  filterRecentTasks,
  formatRelativeTaskTime,
  formatTaskTimestamp,
  initialRecentTasks,
  prependRecentTask,
  type RecentTask,
  type TaskMessage,
  type TaskTraceStep,
} from "@/lib/task-history";

// 后续功能扩展会从这五类能力进入；首页先保持截图中的极简状态。
const agentCapabilities = [
  "日常运营 Agent",
  "商品运营 Agent",
  "招商 Agent",
  "营销活动 Agent",
  "项目管理 Agent",
];

const composerPlaceholder = "今天帮你做些什么？@ 召唤专家，/ 调用技能";

const modelOptions = [
  { id: "glm-5", label: "glm-5" },
  { id: "qwen3.5-flash", label: "qwen3.5-flash" },
  { id: "deepseek-v4-flash", label: "deepseek-v4-flash" },
  { id: "deepseek-v4-pro", label: "deepseek-v4-pro" },
  { id: "doubao-seed-2-0-lite", label: "doubao-seed-2-0-lite" },
  { id: "qwen3.6-flash", label: "qwen3.6-flash", imageUnderstanding: true },
  { id: "qwen3.7-plus", label: "qwen3.7-plus", imageUnderstanding: true },
  { id: "glm-5.2", label: "glm-5.2" },
] as const;

const feedbackReasons = [
  "不正确或不完整",
  "没有遵循我的指示",
  "偏题/超出范围",
  "丢失上下文",
  "速度慢或有故障",
  "其他",
] as const;

type ModelId = (typeof modelOptions)[number]["id"];

type WorkspaceView = "chat" | "experts" | "automation";

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function stopTaskSnapshot(task: RecentTask): RecentTask {
  return {
    ...task,
    metadata: "已停止",
    status: undefined,
    updatedAt: Date.now(),
    messages: task.messages.map((message) =>
      message.pending
        ? {
            ...message,
            pending: false,
            content: message.content || "已停止生成。",
            trace: message.trace?.map((step) => ({
              ...step,
              status: "completed" as const,
            })),
          }
        : message,
    ),
  };
}

export default function Home() {
  const [activeView, setActiveView] = useState<WorkspaceView>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [planMode, setPlanMode] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<ModelId>("glm-5");
  const [messages, setMessages] = useState<TaskMessage[]>([]);
  const [recentTasks, setRecentTasks] =
    useState<RecentTask[]>(initialRecentTasks);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [relativeTimeNow, setRelativeTimeNow] = useState(() => Date.now());
  const [feedbackTargetId, setFeedbackTargetId] = useState<string | null>(null);
  const [selectedFeedbackReasons, setSelectedFeedbackReasons] = useState<
    string[]
  >([]);
  const [feedbackDetail, setFeedbackDetail] = useState("");
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const [pinnedExpanded, setPinnedExpanded] = useState(true);
  const [recentExpanded, setRecentExpanded] = useState(true);
  const [taskMenuId, setTaskMenuId] = useState<string | null>(null);
  const [renamingTaskId, setRenamingTaskId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const runTokenRef = useRef(0);
  const runStartedAtRef = useRef(0);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const searchButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const feedbackCloseRef = useRef<HTMLButtonElement | null>(null);

  const filteredTasks = useMemo(
    () => filterRecentTasks(recentTasks, searchQuery),
    [recentTasks, searchQuery],
  );
  const pinnedTasks = useMemo(
    () => recentTasks.filter((task) => task.pinned && !task.archived),
    [recentTasks],
  );
  const unpinnedTasks = useMemo(
    () => recentTasks.filter((task) => !task.pinned && !task.archived),
    [recentTasks],
  );

  useEffect(() => {
    if (!taskMenuId) return;
    const closeTaskMenu = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        !event.target.closest(".recent-task-row")
      ) {
        setTaskMenuId(null);
      }
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setTaskMenuId(null);
    };
    document.addEventListener("pointerdown", closeTaskMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeTaskMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [taskMenuId]);

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
    if (running && activeTaskId) {
      setRecentTasks((current) =>
        current.map((task) =>
          task.id === activeTaskId ? stopTaskSnapshot(task) : task,
        ),
      );
    }
    runTokenRef.current += 1;
    abortRef.current?.abort();
    setMessages([]);
    setInput("");
    setRunning(false);
    setActiveTaskId(null);
    setActiveView("chat");
    setMobileSidebarOpen(false);
  }, [activeTaskId, running]);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({
      behavior: running ? "smooth" : "auto",
      block: "end",
    });
  }, [messages, running]);

  useEffect(() => {
    if (!running) return;
    const updateElapsed = () => {
      setElapsedMs(performance.now() - runStartedAtRef.current);
    };
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 100);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    const timer = window.setInterval(
      () => setRelativeTimeNow(Date.now()),
      60_000,
    );
    return () => window.clearInterval(timer);
  }, []);

  const sendPrompt = useCallback(
    async (rawPrompt: string, baseMessagesOverride?: TaskMessage[]) => {
      const prompt = rawPrompt.trim();
      if (!prompt || running) return;

      const currentTask = activeTaskId
        ? recentTasks.find((task) => task.id === activeTaskId)
        : undefined;
      const conversationMessages =
        baseMessagesOverride ?? (activeTaskId ? messages : []);
      const taskId = activeTaskId ?? createId();
      const assistantId = createId();
      const userMessage: TaskMessage = {
        id: createId(),
        role: "user",
        content: prompt,
      };
      const runToken = runTokenRef.current + 1;
      runTokenRef.current = runToken;
      let assistantText = "";
      let assistantTrace: TaskTraceStep[] = [];
      let generationStarted = false;
      let traceSequence = 0;
      const startedAt = performance.now();
      const taskTitle = currentTask?.title ?? createTaskTitle(prompt);
      const taskIcon = currentTask?.icon ?? "folder";
      const taskPinned = currentTask?.pinned;
      const pendingAssistantMessage: TaskMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        pending: true,
        trace: [],
      };

      const appendTrace = (title: string, detail: string) => {
        assistantTrace = [
          ...assistantTrace.map((step) => ({
            ...step,
            status: "completed" as const,
          })),
          {
            id: `${assistantId}-trace-${traceSequence++}`,
            title,
            detail,
            status: "running",
          },
        ];
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId
              ? { ...message, trace: assistantTrace }
              : message,
          ),
        );
      };

      const pendingConversation = [
        ...conversationMessages,
        userMessage,
        pendingAssistantMessage,
      ];
      setMessages(pendingConversation);
      setInput("");
      setElapsedMs(0);
      runStartedAtRef.current = startedAt;
      setRunning(true);
      setActiveTaskId(taskId);
      setRecentTasks((current) =>
        prependRecentTask(current, {
          id: taskId,
          title: taskTitle,
          metadata: "处理中",
          icon: taskIcon,
          messages: pendingConversation,
          updatedAt: Date.now(),
          pinned: taskPinned,
          status: "running",
        }),
      );

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await runDemoScenario({
          prompt,
          signal: controller.signal,
          onEvent: ({ name, data }) => {
            if (runTokenRef.current !== runToken) return;

            if (name === "run.started") {
              appendTrace(
                "理解问题并规划执行路径",
                String(data.detail ?? "识别任务意图与所需业务能力"),
              );
            } else if (name === "agent.started") {
              appendTrace(
                `召唤 ${String(data.name ?? "业务专家")}`,
                String(data.detail ?? "将任务拆解后交给领域专家处理"),
              );
            } else if (name === "tool.started") {
              appendTrace(
                `调用 Skill · ${String(data.label ?? data.name ?? "业务查询")}`,
                `使用 ${String(data.name ?? "确定性业务工具")} 查询内置演示数据`,
              );
            } else if (name === "tool.completed") {
              appendTrace(
                `Skill 返回 · ${String(data.name ?? "业务查询")}`,
                String(data.detail ?? "已获得可用于回答的数据证据"),
              );
            } else if (name === "tool.failed") {
              appendTrace(
                `Skill 执行异常 · ${String(data.name ?? "业务查询")}`,
                String(data.message ?? "未获得可用结果，准备调整回答"),
              );
            } else if (name === "agent.completed") {
              appendTrace(
                `${String(data.name ?? "业务专家")} 完成分析`,
                String(data.detail ?? "专家结果已返回交易主理人"),
              );
            } else if (name === "reasoning.started") {
              appendTrace(
                "深度分析并核验结论",
                String(data.detail ?? "检查数据证据与建议之间的逻辑一致性"),
              );
            } else if (name === "message.delta") {
              if (!generationStarted) {
                generationStarted = true;
                appendTrace(
                  "汇总分析并组织回复",
                  "整合各专家结论、数据证据与下一步行动建议",
                );
              }
              const delta = String(data.delta ?? "");
              assistantText += delta;
              setMessages((current) =>
                current.map((message) =>
                  message.id === assistantId
                    ? {
                        ...message,
                        content: `${message.content}${delta}`,
                      }
                    : message,
                ),
              );
            }
          },
        });

        if (runTokenRef.current === runToken && assistantText) {
          const finalElapsedMs = performance.now() - startedAt;
          const completedTrace = assistantTrace.map((step) => ({
            ...step,
            status: "completed" as const,
          }));
          const completedAssistantMessage: TaskMessage = {
            id: assistantId,
            role: "assistant",
            content: assistantText,
            elapsedMs: finalElapsedMs,
            trace: completedTrace,
          };
          setElapsedMs(finalElapsedMs);
          const completedConversation = [
            ...conversationMessages,
            userMessage,
            completedAssistantMessage,
          ];
          setMessages(completedConversation);
          const completedAt = new Date();
          setRecentTasks((current) =>
            prependRecentTask(current, {
              id: taskId,
              title: taskTitle,
              metadata: formatTaskTimestamp(completedAt),
              icon: taskIcon,
              messages: completedConversation,
              updatedAt: completedAt.getTime(),
              pinned: taskPinned,
              status: "completed",
            }),
          );
        }
      } catch (error) {
        if (runTokenRef.current !== runToken) return;
        const stopped =
          error instanceof DOMException && error.name === "AbortError";
        const failureText = stopped
          ? "已停止生成。"
          : "演示任务执行失败，请稍后重试。";
        const finalElapsedMs = performance.now() - startedAt;
        const failedAssistantMessage: TaskMessage = {
          id: assistantId,
          role: "assistant",
          pending: false,
          content: failureText,
          elapsedMs: finalElapsedMs,
          trace: assistantTrace.map((step) => ({
            ...step,
            status: "completed",
          })),
        };
        setElapsedMs(finalElapsedMs);
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId ? failedAssistantMessage : message,
          ),
        );
        setRecentTasks((current) =>
          prependRecentTask(current, {
            id: taskId,
            title: taskTitle,
            metadata: stopped ? "已停止" : "执行失败",
            icon: taskIcon,
            messages: [
              ...conversationMessages,
              userMessage,
              failedAssistantMessage,
            ],
            updatedAt: Date.now(),
            pinned: taskPinned,
          }),
        );
      } finally {
        if (runTokenRef.current === runToken) {
          abortRef.current = null;
          setRunning(false);
        }
      }
    },
    [activeTaskId, messages, recentTasks, running],
  );

  const regenerateMessage = useCallback(
    (assistantMessageId: string) => {
      if (running) return;
      const assistantIndex = messages.findIndex(
        (message) => message.id === assistantMessageId,
      );
      if (assistantIndex < 1) return;
      let userIndex = assistantIndex - 1;
      while (userIndex >= 0 && messages[userIndex].role !== "user") {
        userIndex -= 1;
      }
      const sourcePrompt = messages[userIndex]?.content;
      if (!sourcePrompt || userIndex < 0) return;
      void sendPrompt(sourcePrompt, messages.slice(0, userIndex));
    },
    [messages, running, sendPrompt],
  );

  const closeFeedback = useCallback(() => {
    setFeedbackTargetId(null);
    setSelectedFeedbackReasons([]);
    setFeedbackDetail("");
  }, []);

  const openFeedback = useCallback((messageId: string) => {
    setFeedbackTargetId(messageId);
    setSelectedFeedbackReasons([]);
    setFeedbackDetail("");
    requestAnimationFrame(() => feedbackCloseRef.current?.focus());
  }, []);

  const handleFeedbackKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeFeedback();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])',
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

  const submitFeedback = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedFeedbackReasons.length && !feedbackDetail.trim()) return;
    closeFeedback();
    setFeedbackNotice("感谢反馈，我们会持续优化交易智能助手");
    window.setTimeout(() => setFeedbackNotice(""), 3_000);
  };

  const openTask = useCallback(
    (task: RecentTask) => {
      if (running && activeTaskId === task.id) {
        setMobileSidebarOpen(false);
        closeSearch();
        return;
      }
      if (running && activeTaskId) {
        setRecentTasks((current) =>
          current.map((currentTask) =>
            currentTask.id === activeTaskId
              ? stopTaskSnapshot(currentTask)
              : currentTask,
          ),
        );
      }
      runTokenRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      setRunning(false);
      setMessages(task.messages);
      setActiveTaskId(task.id);
      setActiveView("chat");
      setInput("");
      setMobileSidebarOpen(false);
      closeSearch();
    },
    [activeTaskId, closeSearch, running],
  );

  const commitTaskRename = (taskId: string) => {
    const title = renameValue.trim();
    if (title) {
      setRecentTasks((current) =>
        current.map((task) => (task.id === taskId ? { ...task, title } : task)),
      );
    }
    setRenamingTaskId(null);
    setRenameValue("");
  };

  const toggleTaskPin = (taskId: string) => {
    setRecentTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, pinned: !task.pinned } : task,
      ),
    );
    setTaskMenuId(null);
  };

  const archiveTask = (taskId: string) => {
    setRecentTasks((current) =>
      current.map((task) =>
        task.id === taskId ? { ...task, archived: true, pinned: false } : task,
      ),
    );
    setTaskMenuId(null);
    if (activeTaskId === taskId) {
      setMessages([]);
      setActiveTaskId(null);
      setActiveView("chat");
    }
  };

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

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
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

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLElement>) => {
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
    <main className={`minimal-app ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
      <span className="sr-only">
        交易业务智能工作台，使用演示数据，支持 {agentCapabilities.join("、")}
      </span>

      <aside
        aria-label="对话导航"
        className={`minimal-sidebar ${sidebarOpen ? "open" : ""} ${
          mobileSidebarOpen ? "mobile-open" : ""
        }`}
      >
        <header className="sidebar-brand">
          {sidebarOpen ? (
            <>
              <span className="brand-mark" aria-hidden="true">
                <Image alt="" height={23} src="./logo.svg" width={28} />
              </span>
              <strong>交易智能助手</strong>
              <div className="sidebar-header-actions">
                <button
                  aria-label="收起侧栏"
                  className="sidebar-toggle"
                  onClick={() => setSidebarOpen(false)}
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
            </>
          ) : (
            <button
              aria-label="展开侧栏"
              className="collapsed-sidebar-toggle"
              onClick={() => setSidebarOpen(true)}
              type="button"
            >
              <PanelLeftOpen size={19} strokeWidth={1.8} />
            </button>
          )}
        </header>

        <nav aria-label="工作台导航" className="primary-sidebar-nav">
          <button aria-label="新建任务" onClick={startNewChat} type="button">
            <Plus size={19} strokeWidth={1.8} />
            <span>新建任务</span>
          </button>
          <button
            aria-current={activeView === "experts" ? "page" : undefined}
            className={activeView === "experts" ? "active" : ""}
            onClick={() => {
              setActiveView("experts");
              setMobileSidebarOpen(false);
            }}
            type="button"
          >
            <Users size={18} strokeWidth={1.7} />
            <span>专家 · 技能</span>
          </button>
          <button
            aria-current={activeView === "automation" ? "page" : undefined}
            className={activeView === "automation" ? "active" : ""}
            onClick={() => {
              setActiveView("automation");
              setMobileSidebarOpen(false);
            }}
            type="button"
          >
            <Workflow size={18} strokeWidth={1.7} />
            <span>自动化</span>
          </button>
        </nav>

        {pinnedTasks.length ? (
          <SidebarTaskSection
            title="置顶任务"
            expanded={pinnedExpanded}
            onToggle={() => setPinnedExpanded((value) => !value)}
            tasks={pinnedTasks}
            {...{
              activeTaskId,
              relativeTimeNow,
              taskMenuId,
              renamingTaskId,
              renameValue,
              openTask,
              setTaskMenuId,
              setRenamingTaskId,
              setRenameValue,
              commitTaskRename,
              toggleTaskPin,
              archiveTask,
            }}
          />
        ) : null}
        <SidebarTaskSection
          title="最近任务"
          expanded={recentExpanded}
          onToggle={() => setRecentExpanded((value) => !value)}
          tasks={unpinnedTasks}
          {...{
            activeTaskId,
            relativeTimeNow,
            taskMenuId,
            renamingTaskId,
            renameValue,
            openTask,
            setTaskMenuId,
            setRenamingTaskId,
            setRenameValue,
            commitTaskRename,
            toggleTaskPin,
            archiveTask,
          }}
        />

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

        {activeView === "experts" ? (
          <ExpertSkillWorkspace />
        ) : activeView === "automation" ? (
          <AutomationWorkspace />
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <h1>Hi 哈基咪(Manbo)，有什么可以帮你的？</h1>
            <Composer
              input={input}
              onInput={setInput}
              onKeyDown={handleKeyDown}
              onSubmit={submit}
              onStop={() => abortRef.current?.abort()}
              openExperts={() => {
                setActiveView("experts");
                setMobileSidebarOpen(false);
              }}
              openSkills={() => {
                setActiveView("experts");
                setMobileSidebarOpen(false);
              }}
              planMode={planMode}
              running={running}
              selectedModelId={selectedModelId}
              selectModel={setSelectedModelId}
              thinking={thinking}
              togglePlanMode={() => setPlanMode((current) => !current)}
              toggleThinking={() => setThinking((current) => !current)}
            />
          </div>
        ) : (
          <>
            <div aria-live="polite" className="chat-scroll">
              <div className="chat-column">
                {messages.map((message) => (
                  <article
                    aria-label={
                      message.role === "assistant" ? "Agent 回复" : "用户消息"
                    }
                    className={`chat-message ${message.role}`}
                    key={message.id}
                  >
                    <div className="chat-message-content">
                      {message.role === "assistant" ? (
                        <>
                          <AssistantExecution
                            elapsedMs={
                              message.pending
                                ? elapsedMs
                                : (message.elapsedMs ?? 0)
                            }
                            message={message}
                          />
                          {!message.pending ? (
                            <AnswerActions
                              content={message.content}
                              disabled={running}
                              onDislike={() => openFeedback(message.id)}
                              onRegenerate={() => regenerateMessage(message.id)}
                            />
                          ) : null}
                        </>
                      ) : (
                        <p>{message.content}</p>
                      )}
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
                openExperts={() => {
                  setActiveView("experts");
                  setMobileSidebarOpen(false);
                }}
                openSkills={() => {
                  setActiveView("experts");
                  setMobileSidebarOpen(false);
                }}
                planMode={planMode}
                running={running}
                selectedModelId={selectedModelId}
                selectModel={setSelectedModelId}
                thinking={thinking}
                togglePlanMode={() => setPlanMode((current) => !current)}
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

      {feedbackTargetId && (
        <div className="feedback-modal-layer">
          <button
            aria-label="关闭反馈弹窗"
            className="feedback-modal-scrim"
            onClick={closeFeedback}
            type="button"
          />
          <form
            aria-labelledby="feedback-dialog-title"
            aria-modal="true"
            className="feedback-dialog"
            onKeyDown={handleFeedbackKeyDown}
            onSubmit={submitFeedback}
            role="dialog"
          >
            <header>
              <h2 id="feedback-dialog-title">提交反馈</h2>
              <button
                aria-label="关闭反馈"
                onClick={closeFeedback}
                ref={feedbackCloseRef}
                type="button"
              >
                <X size={22} strokeWidth={1.7} />
              </button>
            </header>

            <div aria-label="反馈原因" className="feedback-reasons">
              {feedbackReasons.map((reason) => {
                const selected = selectedFeedbackReasons.includes(reason);
                return (
                  <button
                    aria-pressed={selected}
                    className={selected ? "selected" : ""}
                    key={reason}
                    onClick={() =>
                      setSelectedFeedbackReasons((current) =>
                        current.includes(reason)
                          ? current.filter((item) => item !== reason)
                          : [...current, reason],
                      )
                    }
                    type="button"
                  >
                    <Plus size={15} strokeWidth={1.7} />
                    {reason}
                  </button>
                );
              })}
            </div>

            <textarea
              aria-label="反馈详情"
              onChange={(event) => setFeedbackDetail(event.target.value)}
              placeholder="填写详情（选填）"
              value={feedbackDetail}
            />

            <p className="feedback-help">
              您的反馈可帮助我们持续优化交易智能助手
              <button
                onClick={() => {
                  setFeedbackNotice("反馈群入口为演示功能");
                  window.setTimeout(() => setFeedbackNotice(""), 3_000);
                }}
                type="button"
              >
                点击加入反馈群
              </button>
            </p>

            <button
              className="feedback-submit"
              disabled={
                !selectedFeedbackReasons.length && !feedbackDetail.trim()
              }
              type="submit"
            >
              提交
            </button>
          </form>
        </div>
      )}

      {feedbackNotice ? (
        <div aria-live="polite" className="feedback-toast" role="status">
          {feedbackNotice}
        </div>
      ) : null}
    </main>
  );
}

function AutomationWorkspace() {
  return (
    <div className="automation-workspace">
      <div className="automation-mark" aria-hidden="true">
        <Workflow size={26} strokeWidth={1.6} />
      </div>
      <h1>自动化</h1>
      <p>把重复的运营任务交给 Agent 按计划自动执行。</p>
      <span>演示能力即将开放</span>
    </div>
  );
}

function SidebarTaskSection({
  title,
  expanded,
  onToggle,
  tasks,
  activeTaskId,
  relativeTimeNow,
  taskMenuId,
  renamingTaskId,
  renameValue,
  openTask,
  setTaskMenuId,
  setRenamingTaskId,
  setRenameValue,
  commitTaskRename,
  toggleTaskPin,
  archiveTask,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  tasks: RecentTask[];
  activeTaskId: string | null;
  relativeTimeNow: number;
  taskMenuId: string | null;
  renamingTaskId: string | null;
  renameValue: string;
  openTask: (task: RecentTask) => void;
  setTaskMenuId: (id: string | null) => void;
  setRenamingTaskId: (id: string | null) => void;
  setRenameValue: (value: string) => void;
  commitTaskRename: (id: string) => void;
  toggleTaskPin: (id: string) => void;
  archiveTask: (id: string) => void;
}) {
  return (
    <section
      className={`recent-section ${title === "置顶任务" ? "pinned-section" : ""}`}
    >
      <button
        aria-expanded={expanded}
        className="task-section-toggle"
        onClick={onToggle}
        type="button"
      >
        <span>
          {title}
          {title === "置顶任务" ? ` (${tasks.length})` : ""}
        </span>
        <ChevronDown className={expanded ? "open" : ""} size={15} />
      </button>
      {expanded ? (
        <nav aria-label={title}>
          {tasks.map((task) => {
            const relativeTime = formatRelativeTaskTime(
              task.updatedAt,
              relativeTimeNow,
            );
            return (
              <div className="recent-task-row" key={task.id}>
                {renamingTaskId === task.id ? (
                  <input
                    aria-label="编辑任务名称"
                    autoFocus
                    className="task-rename-input"
                    onBlur={() => commitTaskRename(task.id)}
                    onChange={(event) => setRenameValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") commitTaskRename(task.id);
                      if (event.key === "Escape") setRenamingTaskId(null);
                    }}
                    value={renameValue}
                  />
                ) : (
                  <button
                    aria-current={activeTaskId === task.id ? "page" : undefined}
                    className={`task-open-button ${activeTaskId === task.id ? "current" : ""}`}
                    onClick={() => openTask(task)}
                    type="button"
                  >
                    <span className="recent-task-title">{task.title}</span>
                    <span className="recent-task-meta">
                      {task.status === "running" ? (
                        <LoaderCircle
                          aria-hidden="true"
                          className="recent-task-spinner"
                          size={14}
                        />
                      ) : (
                        <>
                          <time
                            dateTime={new Date(task.updatedAt).toISOString()}
                          >
                            {relativeTime}
                          </time>
                          {task.status === "completed" ? (
                            <span
                              aria-label="已完成"
                              className="recent-task-complete"
                            />
                          ) : null}
                        </>
                      )}
                    </span>
                  </button>
                )}
                <button
                  aria-label={`管理任务：${task.title}`}
                  className="task-more-button"
                  onClick={() =>
                    setTaskMenuId(taskMenuId === task.id ? null : task.id)
                  }
                  type="button"
                >
                  <Ellipsis size={17} />
                </button>
                {taskMenuId === task.id ? (
                  <div
                    aria-label="任务操作"
                    className="task-context-menu"
                    role="menu"
                  >
                    <button
                      onClick={() => {
                        setRenamingTaskId(task.id);
                        setRenameValue(task.title);
                        setTaskMenuId(null);
                      }}
                      role="menuitem"
                      type="button"
                    >
                      <Pencil size={16} />
                      重命名
                    </button>
                    <button
                      onClick={() => toggleTaskPin(task.id)}
                      role="menuitem"
                      type="button"
                    >
                      <Pin size={16} />
                      {task.pinned ? "取消置顶" : "置顶"}
                    </button>
                    <button
                      onClick={() => archiveTask(task.id)}
                      role="menuitem"
                      type="button"
                    >
                      <Archive size={16} />
                      归档
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      ) : null}
    </section>
  );
}

function formatElapsedTime(elapsedMs: number) {
  const minutes = Math.floor(elapsedMs / 60_000);
  const seconds = Math.floor((elapsedMs % 60_000) / 1_000);
  return `${minutes}m ${seconds}s`;
}

function AssistantExecution({
  elapsedMs,
  message,
}: {
  elapsedMs: number;
  message: TaskMessage;
}) {
  const hasExecutionTrace = Boolean(message.trace?.length || message.pending);

  if (!hasExecutionTrace) return <p>{message.content}</p>;

  return (
    <section
      aria-label="Agent 执行过程"
      className={`assistant-execution ${message.pending ? "running" : "completed"}`}
    >
      <div className="execution-duration">
        <span aria-hidden="true" className="execution-duration-mark" />
        <span>已处理</span>
        <time>{formatElapsedTime(elapsedMs)}</time>
      </div>

      {message.trace?.length ? (
        <ol aria-label="思考与 Skill 调用步骤" className="execution-trace">
          {message.trace.map((step) => (
            <li className={step.status} key={step.id}>
              <span aria-hidden="true" className="trace-node">
                {step.status === "running" ? (
                  <LoaderCircle size={13} strokeWidth={1.9} />
                ) : (
                  <Check size={12} strokeWidth={2} />
                )}
              </span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      {message.content ? (
        <div className="assistant-final-answer">
          <p>{message.content}</p>
        </div>
      ) : null}

      {message.pending ? (
        <div aria-live="polite" className="generating-reply" role="status">
          <span>生成回复中</span>
          <span aria-hidden="true" className="generating-dots">
            <i />
            <i />
            <i />
          </span>
        </div>
      ) : null}
    </section>
  );
}

function AnswerActions({
  content,
  disabled,
  onDislike,
  onRegenerate,
}: {
  content: string;
  disabled: boolean;
  onDislike: () => void;
  onRegenerate: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);

  const copyAnswer = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_800);
  };

  const shareAnswer = async () => {
    if (navigator.share) {
      await navigator.share({ title: "交易智能助手回答", text: content });
    } else {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_800);
    }
  };

  return (
    <div aria-label="回答操作" className="answer-actions" role="toolbar">
      <button
        aria-label={copied ? "已复制" : "复制回答"}
        onClick={() => void copyAnswer()}
        type="button"
      >
        {copied ? <Check size={17} /> : <Copy size={17} />}
      </button>
      <button
        aria-label="点赞"
        aria-pressed={liked}
        className={liked ? "active" : ""}
        onClick={() => {
          setLiked((current) => !current);
          setDisliked(false);
        }}
        type="button"
      >
        <ThumbsUp size={17} />
      </button>
      <button
        aria-label="点踩"
        aria-pressed={disliked}
        className={disliked ? "active" : ""}
        onClick={() => {
          setDisliked(true);
          setLiked(false);
          onDislike();
        }}
        type="button"
      >
        <ThumbsDown size={17} />
      </button>
      <button
        aria-label="重新生成回答"
        disabled={disabled}
        onClick={onRegenerate}
        type="button"
      >
        <RotateCcw size={17} />
      </button>
      <button
        aria-label="分享回答"
        onClick={() => void shareAnswer()}
        type="button"
      >
        <Share2 size={17} />
      </button>
      <button aria-label="更多操作" type="button">
        <Ellipsis size={18} />
      </button>
    </div>
  );
}

function Composer({
  input,
  onInput,
  onKeyDown,
  onSubmit,
  onStop,
  openExperts,
  openSkills,
  planMode,
  running,
  selectedModelId,
  selectModel,
  thinking,
  togglePlanMode,
  toggleThinking,
}: {
  input: string;
  onInput: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: (event: FormEvent) => void;
  onStop: () => void;
  openExperts: () => void;
  openSkills: () => void;
  planMode: boolean;
  running: boolean;
  selectedModelId: ModelId;
  selectModel: (modelId: ModelId) => void;
  thinking: boolean;
  togglePlanMode: () => void;
  toggleThinking: () => void;
}) {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [addMenuView, setAddMenuView] = useState<"main" | "mode">("main");
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const addControlRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const modelControlRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!addMenuOpen && !modelMenuOpen) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (event.target instanceof Node) {
        if (addMenuOpen && !addControlRef.current?.contains(event.target)) {
          setAddMenuOpen(false);
          setAddMenuView("main");
        }
        if (modelMenuOpen && !modelControlRef.current?.contains(event.target)) {
          setModelMenuOpen(false);
        }
      }
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setAddMenuOpen(false);
        setAddMenuView("main");
        setModelMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [addMenuOpen, modelMenuOpen]);

  return (
    <form className="minimal-composer" onSubmit={onSubmit}>
      <textarea
        aria-label="任务输入框"
        maxLength={2000}
        onChange={(event) => onInput(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={composerPlaceholder}
        rows={2}
        value={input}
      />
      <div className="composer-actions">
        <div className="composer-left-actions">
          <div className="add-control" ref={addControlRef}>
            <input
              hidden
              multiple
              onChange={() => {
                setAddMenuOpen(false);
                setAddMenuView("main");
              }}
              ref={fileInputRef}
              type="file"
            />
            <button
              aria-expanded={addMenuOpen}
              aria-haspopup="menu"
              aria-label="打开添加菜单"
              className="composer-add-button"
              onClick={() => {
                setAddMenuOpen((current) => !current);
                setAddMenuView("main");
              }}
              type="button"
            >
              <Plus size={19} strokeWidth={1.8} />
            </button>

            {addMenuOpen && addMenuView === "main" && (
              <div aria-label="添加内容" className="add-menu" role="menu">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  role="menuitem"
                  type="button"
                >
                  <FilePlus2 size={18} strokeWidth={1.7} />
                  <span>添加文件</span>
                </button>
                <button
                  onClick={() => setAddMenuView("mode")}
                  role="menuitem"
                  type="button"
                >
                  <SlidersHorizontal size={18} strokeWidth={1.7} />
                  <span>模式</span>
                  <ChevronRight className="menu-trailing-icon" size={15} />
                </button>
                <button
                  onClick={() => {
                    setAddMenuOpen(false);
                    openExperts();
                  }}
                  role="menuitem"
                  type="button"
                >
                  <Users size={18} strokeWidth={1.7} />
                  <span>专家</span>
                </button>
                <button
                  onClick={() => {
                    setAddMenuOpen(false);
                    openSkills();
                  }}
                  role="menuitem"
                  type="button"
                >
                  <WandSparkles size={18} strokeWidth={1.7} />
                  <span>技能</span>
                </button>
              </div>
            )}

            {addMenuOpen && addMenuView === "mode" && (
              <div
                aria-label="模式设置"
                className="add-menu mode-menu"
                role="dialog"
              >
                <header>
                  <button
                    aria-label="返回添加菜单"
                    onClick={() => setAddMenuView("main")}
                    type="button"
                  >
                    <ArrowLeft size={17} strokeWidth={1.8} />
                  </button>
                  <strong>模式</strong>
                </header>
                <button
                  aria-checked={planMode}
                  className="mode-switch-row"
                  onClick={togglePlanMode}
                  role="switch"
                  type="button"
                >
                  <span>
                    <strong>计划模式</strong>
                    <small>先制定计划，再执行任务</small>
                  </span>
                  <span className="switch-track" aria-hidden="true">
                    <span />
                  </span>
                </button>
                <button
                  aria-checked={thinking}
                  className="mode-switch-row"
                  onClick={toggleThinking}
                  role="switch"
                  type="button"
                >
                  <span>
                    <strong>深度思考</strong>
                    <small>投入更多时间分析复杂问题</small>
                  </span>
                  <span className="switch-track" aria-hidden="true">
                    <span />
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="composer-right-actions">
          <div className="model-control" ref={modelControlRef}>
            <button
              aria-expanded={modelMenuOpen}
              aria-haspopup="menu"
              className="model-selector"
              onClick={() => setModelMenuOpen((current) => !current)}
              type="button"
            >
              {selectedModelId}
              <ChevronDown className={modelMenuOpen ? "open" : ""} size={13} />
            </button>

            {modelMenuOpen && (
              <div aria-label="选择模型" className="model-menu" role="menu">
                {modelOptions.map((model) => (
                  <button
                    aria-checked={model.id === selectedModelId}
                    className={model.id === selectedModelId ? "selected" : ""}
                    key={model.id}
                    onClick={() => {
                      selectModel(model.id);
                      setModelMenuOpen(false);
                    }}
                    role="menuitemradio"
                    type="button"
                  >
                    <span>{model.label}</span>
                    {"imageUnderstanding" in model &&
                      model.imageUnderstanding && (
                        <span className="image-capability">图片理解</span>
                      )}
                    {model.id === selectedModelId && (
                      <Check
                        className="model-selected-check"
                        size={17}
                        strokeWidth={2.4}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
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
              <ArrowUp size={19} strokeWidth={1.9} />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
