"use client";

import { CalendarClock, Check, Clock3, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { formatSchedule, type ScheduledTask } from "@/lib/scheduled-tasks";
import {
  deleteScheduledTask,
  getScheduledTasksSnapshot,
  parseScheduledTasksSnapshot,
  setScheduledTaskEnabled,
  subscribeToScheduledTasks,
} from "@/lib/scheduled-task-storage";
import styles from "./scheduled-task-workspace.module.css";

type Props = {
  onCreate: () => void;
  onOpenTask: (task: ScheduledTask, editing: boolean) => string | null;
};

export function ScheduledTaskWorkspace({ onCreate, onOpenTask }: Props) {
  const snapshot = useSyncExternalStore(subscribeToScheduledTasks, getScheduledTasksSnapshot, () => null);
  const { tasks, error: storageError } = useMemo(() => parseScheduledTasksSnapshot(snapshot), [snapshot]);
  const orderedTasks = useMemo(() => [...tasks].sort((a, b) => b.createdAt - a.createdAt), [tasks]);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScheduledTask | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const deleteCancel = useRef<HTMLButtonElement>(null);
  const deleteTrigger = useRef<HTMLButtonElement>(null);
  const createButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3_500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const dialog = deleteDialog.current;
    if (!deleteTarget || !dialog) return;
    dialog.showModal();
    deleteCancel.current?.focus();
    return () => dialog.close();
  }, [deleteTarget]);

  const closeDelete = () => {
    setDeleteTarget(null);
    requestAnimationFrame(() => {
      (deleteTrigger.current?.isConnected ? deleteTrigger.current : createButton.current)?.focus();
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const result = deleteScheduledTask(deleteTarget.id);
    if (!result.ok) {
      setDeleteError(result.error ?? "删除失败，请重试。");
      return;
    }
    setNotice({ text: `已删除「${deleteTarget.name}」定时任务` });
    closeDelete();
  };

  const openTask = (task: ScheduledTask, editing: boolean) => {
    const error = onOpenTask(task, editing);
    if (error) setNotice({ text: error, error: true });
  };

  return (
    <section className={styles.workspace} aria-labelledby="scheduled-title">
      {notice && <div className={`${styles.toast} ${notice.error ? styles.toastError : ""}`} role={notice.error ? "alert" : "status"}>{!notice.error && <Check size={16} />}{notice.text}</div>}
      <header className={styles.header}>
        <h1 id="scheduled-title">定时任务</h1>
        <button ref={createButton} className={styles.primary} onClick={onCreate} type="button"><Plus size={16} />新建</button>
      </header>
      {storageError && <p className={styles.error} role="alert">{storageError}</p>}
      <div className={styles.listScroll} aria-label="定时任务列表">
        {tasks.length === 0 && !storageError ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}><CalendarClock size={32} strokeWidth={1.4} /></div>
            <h2>暂无定时任务</h2>
            <p>点击右上角「新建」，通过对话安排任务。</p>
          </div>
        ) : tasks.length > 0 ? (
          <table className={styles.table}>
            <thead><tr><th scope="col">任务名称</th><th scope="col">执行时间</th><th scope="col">操作</th></tr></thead>
            <tbody>{orderedTasks.map((task) => (
              <tr key={task.id}>
                <td><button className={styles.taskTitle} title={task.name} onClick={() => openTask(task, false)} type="button"><Clock3 size={17} /><span>{task.name}</span></button></td>
                <td className={styles.schedule} data-label="执行时间">{formatSchedule(task.schedule)}</td>
                <td><div className={styles.actions}>
                  <button className={`${styles.switch} ${task.enabled !== false ? styles.enabled : ""}`} role="switch" aria-checked={task.enabled !== false} aria-label={`${task.enabled !== false ? "暂停" : "启用"}「${task.name}」定时任务`} type="button" onClick={() => {
                    const enabled = task.enabled === false;
                    const result = setScheduledTaskEnabled(task.id, enabled);
                    setNotice(result.ok ? { text: `已${enabled ? "启用" : "暂停"}「${task.name}」定时任务` } : { text: result.error ?? "保存失败，请重试。", error: true });
                  }}><span /></button>
                  <button className={styles.action} aria-label={`编辑：${task.name}`} onClick={() => openTask(task, true)} type="button"><Pencil size={14} /><span>编辑</span></button>
                  <button className={styles.action} aria-label={`删除：${task.name}`} type="button" onClick={(event) => {
                    deleteTrigger.current = event.currentTarget;
                    setDeleteError("");
                    setDeleteTarget(task);
                  }}><Trash2 size={14} /><span className={styles.deleteText}>删除</span></button>
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        ) : null}
      </div>
      <p className={styles.disclaimer}>演示模式：任务仅保存在当前浏览器，不实际执行。时间均为北京时间。</p>
      {deleteTarget && <dialog ref={deleteDialog} className={styles.deleteDialog} aria-labelledby="scheduled-delete-title" aria-describedby="scheduled-delete-description" onCancel={(event) => { event.preventDefault(); closeDelete(); }}>
        <button className={styles.close} aria-label="关闭删除弹窗" type="button" onClick={closeDelete}><X size={18} /></button>
        <h2 id="scheduled-delete-title">确认删除定时任务？</h2>
        <p id="scheduled-delete-description">{deleteTarget.name} 将被永久删除，后续不再自动执行。此操作无法撤销。</p>
        {deleteError && <p className={styles.error} role="alert">{deleteError}</p>}
        <div className={styles.dialogActions}><button ref={deleteCancel} className={styles.secondary} type="button" onClick={closeDelete}>取消</button><button className={styles.danger} type="button" onClick={confirmDelete}>删除</button></div>
      </dialog>}
    </section>
  );
}
