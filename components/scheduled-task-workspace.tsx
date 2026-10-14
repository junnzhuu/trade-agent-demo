"use client";

import { CalendarClock, Check, ChevronDown, Clock3, Pencil, Plus, Trash2, X } from "lucide-react";
import Image from "next/image";
import { type FormEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  formatBeijingDateTime,
  formatSchedule,
  getNextScheduledAt,
  parseScheduledTaskInput,
  validateScheduledTaskDraft,
  type ScheduledTask,
  type ScheduledTaskDraft,
} from "@/lib/scheduled-tasks";
import {
  deleteScheduledTask,
  getScheduledTasksSnapshot,
  parseScheduledTasksSnapshot,
  saveScheduledTask,
  subscribeToScheduledTasks,
} from "@/lib/scheduled-task-storage";
import styles from "./scheduled-task-workspace.module.css";

const examples = ["每天上午 9 点生成昨日运营日报", "每周一上午 10 点汇总上周销售数据", "明天下午 3 点提醒我查看活动报名进度"];

export function ScheduledTaskWorkspace() {
  const snapshot = useSyncExternalStore(subscribeToScheduledTasks, getScheduledTasksSnapshot, () => null);
  const { tasks, error: storageError } = useMemo(() => parseScheduledTasksSnapshot(snapshot), [snapshot]);
  const [now, setNow] = useState(() => Date.now());
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState<ScheduledTaskDraft>({});
  const [ready, setReady] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState("");
  const [reply, setReply] = useState("");
  const [notice, setNotice] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ScheduledTask | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const editor = useRef<HTMLTextAreaElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const deleteCancel = useRef<HTMLButtonElement>(null);
  const confirmationConsumed = useRef(false);
  const composing = useRef(false);
  const editingTask = tasks.find((task) => task.id === editingId);
  const orderedTasks = useMemo(() => [...tasks].sort((a, b) => b.createdAt - a.createdAt), [tasks]);

  useEffect(() => {
    const refresh = () => setNow(Date.now());
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    const dialog = deleteDialog.current;
    if (!deleteTarget || !dialog) return;
    dialog.showModal();
    deleteCancel.current?.focus();
    return () => dialog.close();
  }, [deleteTarget]);

  const resetDraft = () => {
    setDraft({});
    setEditingId(null);
    setReady(false);
    setInput("");
    setLastRequest("");
    setReply("");
    setNotice("");
    confirmationConsumed.current = false;
    editor.current?.focus();
  };

  const beginEdit = (task: ScheduledTask) => {
    resetDraft();
    setEditingId(task.id);
    setDraft({ name: task.name, prompt: task.prompt, schedule: task.schedule });
    setReply("告诉我想怎么改，例如“改成每天 10 点执行”。未提及的配置会保持不变。");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const request = input.trim();
    if (!request || storageError) return;
    const result = parseScheduledTaskInput(request, draft, Date.now(), Boolean(editingId));
    setDraft(result.draft);
    setReady(result.ready);
    setReply(result.message);
    setLastRequest(request);
    setNotice("");
    setInput("");
    confirmationConsumed.current = false;
    editor.current?.focus();
  };

  const handleConfirm = (timestamp: number) => {
    if (!ready || confirmationConsumed.current) return;
    const validationError = validateScheduledTaskDraft(draft, timestamp);
    if (validationError) {
      setReply(validationError);
      setReady(false);
      return;
    }
    if (editingId && !editingTask) {
      setReply("这条任务已被删除，请取消修改后重新创建。");
      setReady(false);
      return;
    }
    confirmationConsumed.current = true;
    const task: ScheduledTask = {
      id: editingId ?? crypto.randomUUID(),
      name: draft.name!,
      prompt: draft.prompt!,
      schedule: draft.schedule!,
      createdAt: editingTask?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    const result = saveScheduledTask(task, editingId ? "update" : "create");
    if (!result.ok) {
      confirmationConsumed.current = false;
      setReply(result.error ?? "保存失败，请重试。");
      return;
    }
    const message = `已${editingId ? "修改" : "创建"}“${task.name}”`;
    resetDraft();
    confirmationConsumed.current = true;
    setNotice(message);
    setExpandedId(task.id);
    setNow(timestamp);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const result = deleteScheduledTask(deleteTarget.id);
    if (!result.ok) {
      setDeleteError(result.error ?? "删除失败，请重试。");
      return;
    }
    if (editingId === deleteTarget.id) resetDraft();
    if (expandedId === deleteTarget.id) setExpandedId(null);
    setNotice(`已删除“${deleteTarget.name}”`);
    setDeleteTarget(null);
    requestAnimationFrame(() => editor.current?.focus());
  };

  return (
    <section className={styles.workspace} aria-labelledby="scheduled-title">
      <header className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <h1 id="scheduled-title">定时任务</h1>
            <span className={styles.count}>{tasks.length}</span>
          </div>
          <p>用一句话安排任务，随时查看和修改。</p>
        </div>
        <button className={styles.primary} onClick={resetDraft} type="button">
          <Plus size={16} />新建任务
        </button>
      </header>

      {storageError && <p className={styles.error} role="alert">{storageError}</p>}

      <div className={styles.listScroll} aria-label="定时任务列表">
        {tasks.length === 0 && !storageError ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}><CalendarClock size={32} strokeWidth={1.4} /></div>
            <h2>把重复的事，安排好时间</h2>
            <p>还没有定时任务。在下方说说要做什么、什么时候做。</p>
            <div className={styles.examples}>
              {examples.map((example) => (
                <button key={example} type="button" onClick={() => { resetDraft(); setInput(example); }}>
                  <Clock3 size={15} /><span>{example}</span><Plus size={14} />
                </button>
              ))}
            </div>
          </div>
        ) : tasks.length > 0 ? (
          <div className={styles.list}>
            <div className={styles.columnHead} aria-hidden="true">
              <span>任务</span><span>执行周期</span><span>下次计划时间 · 北京时间</span><span>操作</span>
            </div>
            {orderedTasks.map((task) => {
              const nextAt = getNextScheduledAt(task.schedule, now);
              const expanded = expandedId === task.id;
              return (
                <article key={task.id} className={`${styles.task} ${editingId === task.id ? styles.editing : ""}`}>
                  <div className={styles.taskRow}>
                    <button className={styles.taskTitle} aria-expanded={expanded} aria-controls={`scheduled-detail-${task.id}`} onClick={() => setExpandedId(expanded ? null : task.id)} type="button">
                      <span className={styles.taskIcon}><Clock3 size={18} /></span>
                      <span className={styles.taskCopy}><strong>{task.name}</strong><span>{task.prompt}</span></span>
                      <ChevronDown size={14} className={expanded ? styles.rotated : ""} />
                    </button>
                    <div className={styles.schedule}><span className={styles.mobileLabel}>执行周期</span>{formatSchedule(task.schedule)}</div>
                    <div className={`${styles.nextTime} ${nextAt === null ? styles.expired : ""}`}><span className={styles.mobileLabel}>下次计划</span>{nextAt === null ? "计划时间已过" : formatBeijingDateTime(nextAt)}</div>
                    <div className={styles.actions}>
                      <button aria-label={`修改：${task.name}`} onClick={() => beginEdit(task)} type="button"><Pencil size={14} /><span>修改</span></button>
                      <button aria-label={`删除：${task.name}`} onClick={() => { setDeleteError(""); setDeleteTarget(task); }} type="button"><Trash2 size={14} /><span>删除</span></button>
                    </div>
                  </div>
                  {expanded && (
                    <div className={styles.detail} id={`scheduled-detail-${task.id}`}>
                      <span>执行内容</span><p>{task.prompt}</p>
                      <small>创建于 {formatBeijingDateTime(task.createdAt)} · 北京时间</small>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className={styles.bottom}>
        <div className={styles.conversation} aria-live="polite" aria-atomic="true">
          {notice && <p className={styles.notice} role="status"><Check size={16} />{notice}</p>}
          {lastRequest && <p className={styles.request}>{lastRequest}</p>}
          {reply && <p className={styles.reply}>{reply}</p>}
          {ready && (
            <div className={styles.confirmation} aria-label={editingId ? "确认修改定时任务" : "确认新建定时任务"}>
              <dl>
                <div><dt>任务名称</dt><dd>{draft.name}</dd></div>
                <div><dt>执行内容</dt><dd>{draft.prompt}</dd></div>
                <div><dt>执行时间</dt><dd>{draft.schedule && formatSchedule(draft.schedule)} <small>北京时间</small></dd></div>
              </dl>
              <div className={styles.confirmActions}>
                <span>也可以继续输入，调整这条任务</span>
                <button className={styles.secondary} onClick={resetDraft} type="button">取消</button>
                <button className={styles.primary} onClick={() => handleConfirm(Date.now())} disabled={Boolean(storageError)} type="button">{editingId ? "保存修改" : "确认创建"}</button>
              </div>
            </div>
          )}
        </div>

        <form className={`minimal-composer ${styles.composer}`} onSubmit={submit}>
          {editingId ? (
            <div className={styles.context}>
              <Pencil size={13} /><span>正在修改：{editingTask?.name ?? draft.name}</span>
              <button aria-label="取消修改" onClick={resetDraft} type="button"><X size={14} /></button>
            </div>
          ) : (draft.prompt || draft.schedule || lastRequest) ? (
            <div className={styles.context}>
              <Clock3 size={13} /><span>正在新建定时任务</span>
              <button aria-label="取消新建" onClick={resetDraft} type="button"><X size={14} /></button>
            </div>
          ) : null}
          <label className="sr-only" htmlFor="scheduled-input">定时任务输入框</label>
          <textarea
            id="scheduled-input"
            ref={editor}
            className={`composer-editor ${styles.editor}`}
            value={input}
            maxLength={2000}
            rows={2}
            placeholder={editingId ? "说说想怎么改，例如：改成每天 10 点执行" : "例如：每天上午 9 点生成昨日运营日报"}
            onChange={(event) => setInput(event.target.value)}
            onCompositionStart={() => { composing.current = true; }}
            onCompositionEnd={() => { composing.current = false; }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && !composing.current && event.keyCode !== 229) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <div className={`composer-actions ${styles.composerActions}`}>
            <span><Clock3 size={14} />每天、每周、工作日或一次性</span>
            <button className="composer-send" aria-label="发送定时任务需求" disabled={!input.trim() || Boolean(storageError)} type="submit">
              <Image src={input.trim() && !storageError ? "./send-ready.svg" : "./send-empty.svg"} width={24} height={24} alt="" />
            </button>
          </div>
        </form>
        <p className={styles.disclaimer}>演示模式：任务仅保存在当前浏览器，不实际执行</p>
      </div>

      {deleteTarget && (
        <dialog ref={deleteDialog} className={styles.deleteDialog} aria-labelledby="scheduled-delete-title" aria-describedby="scheduled-delete-description" onCancel={() => setDeleteTarget(null)} onClick={(event) => { if (event.target === event.currentTarget) setDeleteTarget(null); }}>
          <h2 id="scheduled-delete-title">删除定时任务？</h2>
          <p id="scheduled-delete-description">确定删除“{deleteTarget.name}”？删除后无法恢复。</p>
          {deleteError && <p className={styles.error} role="alert">{deleteError}</p>}
          <div className={styles.confirmActions}>
            <button ref={deleteCancel} className={styles.secondary} onClick={() => setDeleteTarget(null)} type="button">取消</button>
            <button className={styles.danger} onClick={confirmDelete} type="button">确认删除</button>
          </div>
        </dialog>
      )}
    </section>
  );
}
