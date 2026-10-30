"use client";

import { useState, useEffect } from "react";
import type { Task } from "../type/task";
import EdgeDock from "@/components/EdgeDock";
import TaskCard from "@/components/TaskCard";
import { 
  getTasks, 
  createTask, 
  updateTask, 
  deleteTask as deleteStoredTask,
  restoreTask,
} from "@/lib/task-storage";

function toLocalInputValue(value?: string | null): string {
  if(!value) return "";

  const date = new Date(value);
  const pad = (number: number) => String(number).padStart(2, "0");

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );  
}

const TASK_GROUPS = [
  { key: "overdue", label: "已逾期" },
  { key: "today", label: "今天" },
  { key: "soon", label: "即將到期" },
  { key: "later", label: "稍後" },
  { key: "undated", label: "未設定日期" },
  { key: "completed", label: "已完成" },
] as const;

type TaskGroupKey = (typeof TASK_GROUPS)[number]["key"];

function getTaskGroup(task: Task, now: number): TaskGroupKey {
  if (task.completed) return "completed";
  if (!task.dueAt) return "undated";

  const due = Date.parse(task.dueAt);

  if (!Number.isFinite(due)) return "undated";
  if (due < now) return "overdue";

  const tomorrow = new Date(now);
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (due < tomorrow.getTime()) return "today";

  // 明天至未來第 7 天，包含第 7 天整天。
  const upcomingEnd = new Date(tomorrow);
  upcomingEnd.setDate(upcomingEnd.getDate() + 7);

  return due < upcomingEnd.getTime() ? "soon" : "later";
}

export default function Home() {

  const [newTaskTitle, setNewTaskTitle] = useState<string>("");
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending">("all");
  const [sortOrder, setSortOrder] = useState<"due" | "newest" | "oldest">("due");
  const [storageLoading, setStorageLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);
  const [newDueAt, setNewDueAt] = useState("");
  const [editingDueAt, setEditingDueAt] = useState("");
  const [enteringTaskId, setEnteringTaskId] = useState<number | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const [deletedTasks, setDeletedTasks] = useState<Task[]>([]);

  const [tasks, setTasks] = useState<Task[]>([]);

async function toggleTask(id: number) {
  if (updatingTaskId !== null || deletingTaskId !== null || isSubmitting) {
    return;
  }

  const task = tasks.find((item) => item.id === id);

  if (!task) {
    return;
  }

  setUpdatingTaskId(id);
  setActionError(null);

  try {   
    const updatedTask = await updateTask(id, {
      completed: !task.completed,
    });

    setTasks((prevTasks) =>
      prevTasks.map((item) =>
        item.id === id ? updatedTask : item
      )
    );
  } catch (error: unknown) {
    setActionError(
      error instanceof Error
        ? error.message
        : "更新任務狀態失敗"
    );
  } finally {
    setUpdatingTaskId(null);
  }
}

async function addTask(){
    const title = newTaskTitle.trim();

    if ( title === "" || isSubmitting || updatingTaskId !== null || deletingTaskId !== null){
      return;
    }

    if (title.length > 100){
      setActionError("任務名稱不能超過 100 個字元");
      return;
    }

  setIsSubmitting(true);
  setActionError(null);

  try {
    const dueAt = newDueAt ? new Date(newDueAt).toISOString() : null;
    const newTask = await createTask(title, dueAt);
    setEnteringTaskId(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? null : newTask.id);
    setNewDueAt("");
    setShowComposer(false);
    setSearchTerm("");
    setStatusFilter("all");

    setTasks((prevTasks) => [
      ...prevTasks,
      newTask,
    ]);

    // 3. 清空輸入框
    setNewTaskTitle("");

  } catch (error: unknown) {
    setActionError(
      error instanceof Error
        ? error.message
        : "新增任務失敗"
    );
  } finally {
    setIsSubmitting(false);
  }
}

async function deleteTask(id: number) {
  if (
    deletingTaskId !== null ||
    updatingTaskId !== null ||
    isSubmitting
  ) {
    return;
  }

  const task = tasks.find((item) => item.id === id);

  if (!task) {
    return;
  }

  // 1. 讓使用者確認
  const confirmed = window.confirm(
    `確定要刪除「${task.title}」嗎？`
  );

  if (!confirmed) {
    return;
  }

  setActionError(null);

  try {
    await deleteStoredTask(id);
    setDeletingTaskId(id);

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (!reduceMotion) {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 220);
      });
    }

    setTasks((prevTasks) =>
      prevTasks.filter((item) => item.id !== id)
    );

    setDeletedTasks((previous) => [...previous, task]);

    if (editingTaskId === id) {
      setEditingTaskId(null);
      setEditingTitle("");
    }
  } catch (error: unknown) {
    setActionError(
      error instanceof Error
        ? error.message
        : "刪除任務失敗"
    );
  } finally {
    setDeletingTaskId(null);
  }
}

async function saveTask(id: number) {
  if (updatingTaskId !== null || deletingTaskId !== null || isSubmitting || editingTaskId !== id) {
    return;
  }

  const title = editingTitle.trim();

  // 1. 前端輸入驗證
  if (!title || title.length > 100) {
    setActionError("任務名稱必須為 1 至 100 個字元");
    return;
  }

  setUpdatingTaskId(id);
  setActionError(null);

  try {
    const updatedTask = await updateTask(id, {
      title,
      dueAt: editingDueAt
        ? new Date(editingDueAt).toISOString()
        : null,
    });

    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === id ? updatedTask : task
      )
    );

    // 4. 結束編輯模式
    setEditingTaskId(null);
    setEditingTitle("");

  } catch (error: unknown) {
    setActionError(
      error instanceof Error
        ? error.message
        : "儲存任務失敗"
    );
  } finally {
    setUpdatingTaskId(null);
  }
}

async function undoDelete() {
  if (
    isSubmitting ||
    updatingTaskId !== null ||
    deletingTaskId !== null
  ) {
    return;
  }

  const task = deletedTasks[deletedTasks.length - 1];
  if (!task) return;

  // 沿用目前的 busy 機制，復原期間停用其他操作。
  setUpdatingTaskId(task.id);
  setActionError(null);

  try {
    const restored = await restoreTask(task);

    setTasks((previous) => [...previous, restored]);
    setDeletedTasks((previous) => previous.slice(0, -1));

    // 避免復原成功後，被目前的篩選條件隱藏。
    setSearchTerm("");
    setStatusFilter("all");
  } catch (error: unknown) {
    setActionError(
      error instanceof Error ? error.message : "復原失敗"
    );
  } finally {
    setUpdatingTaskId(null);
  }
}

  const filteredTasks = tasks.filter((task) => {
    const taskName = task.title.toLowerCase();
    const keyword = searchTerm.toLowerCase().trim();
    const matchesSearch = taskName.includes(keyword);
    const matchesStatus =
      statusFilter === "all"
      ? true
      : statusFilter === "completed"
        ? task.completed === true
        : task.completed === false

    return matchesSearch && matchesStatus;
  }
);

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortOrder === "newest") return b.id - a.id;
    if (sortOrder === "oldest") return a.id - b.id;

    const aDue = a.dueAt ? Date.parse(a.dueAt) : Infinity;
    const bDue = b.dueAt ? Date.parse(b.dueAt) : Infinity;

    if (aDue === bDue) return a.id - b.id;

    return aDue < bDue ? -1 : 1;
});

  const groupedTasks = TASK_GROUPS.map((group) => ({
    ...group,
    tasks:
      now === null
        ? []
        : sortedTasks.filter(
            (task) => getTaskGroup(task, now) === group.key
          ),
  })).filter((group) => group.tasks.length > 0);

  useEffect(() => {
    const updateNow = () => setNow(Date.now());

    const timer = window.setInterval(updateNow, 1000);
    window.addEventListener("focus", updateNow);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", updateNow);
    };
  }, []);


useEffect(() => {

  let cancelled = false;

  getTasks()
    .then((data) => {
      if (cancelled) return;

      setTasks(data);
      setStorageError(null);
    })
    .catch((error: unknown) => {
      if (cancelled) return;

      setStorageError(
        error instanceof Error
          ? error.message
          : "無法取得 任務"
      );
    })
    .finally(() => {
      if (!cancelled) {
        setStorageLoading(false);
      }
    });

  return () => {
    cancelled = true;
  };
}, [retryCount]);


if (storageLoading) {
  return (
    <main className="todo-page">
      <p className="text-slate-400">
        正在讀取 任務...
      </p>
    </main>
  );
}

if (storageError) {
  return (
    <main className="todo-page">
      <div className="todo-container error-panel">
        <h2 className="mb-3 text-xl font-bold text-red-700">
          任務載入失敗
        </h2>

        <p role="alert" className="text-neutral-700">
          {storageError}
        </p>

        <p className="mt-3 text-sm text-slate-400">
          請確認瀏覽器允許此網站儲存資料。
        </p>

            <button 
                type="button"
                className="bg-slate-700 text-white font-medium px-3 py-2 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                onClick={() => {
                setStorageLoading(true);
                setStorageError(null);
                setRetryCount((prev) => prev + 1);               
                }}>
                重新載入
            </button>


      </div>
    </main>
  );
}


  const busy = isSubmitting || updatingTaskId !== null || deletingTaskId !== null;

  return (
    <main className="todo-page">
      <div className="todo-container">

        <EdgeDock
          paused={
            showComposer ||
            editingTaskId !== null ||
            busy
          }
        />

        <header className="page-header">
          <h1>我的任務</h1>
          <p>把每一天，留給重要的事。</p>
        </header>

        <details className="list-tools">

          <summary>搜尋與篩選</summary>

          <div className="toolbar">

            <input type="search" aria-label="搜尋任務" placeholder="搜尋任務…"
              value={searchTerm} disabled={busy} onChange={(event) => setSearchTerm(event.target.value)} />

            <select aria-label="任務狀態" value={statusFilter} disabled={busy}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
              <option value="all">全部</option>
              <option value="pending">未完成</option>
              <option value="completed">已完成</option>
            </select>

            <select aria-label="排序方式" value={sortOrder} disabled={busy}
              onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)}>
              <option value="newest">最新優先</option>
              <option value="oldest">最舊優先</option>
              <option value="due">截止時間優先</option>
            </select>

          </div>
        </details>

        <div className="section-heading">
          <h2>我的項目</h2>
          <span>{tasks.filter((task) => !task.completed).length} 項待完成</span>
        </div>

        {actionError && <p role="alert" className="action-error">{actionError}</p>}

        {deletedTasks.length > 0 && (
          <div className="undo-bar">
            <span role="status">
              已刪除「{deletedTasks[deletedTasks.length - 1].title}」
            </span>

            <button
              type="button"
              disabled={busy}
              onClick={undoDelete}
            >
              復原
            </button>
          </div>
        )}

        {now === null && (
          <p className="empty-state">正在整理任務…</p>
        )}

        {groupedTasks.map((group) => (
          <section
            key={group.key}
            aria-labelledby={`group-${group.key}`}
            className="task-group"
          >
            <h3
              id={`group-${group.key}`}
              className={`task-group-heading ${
                group.key === "overdue" ? "is-overdue" : ""
              }`}
            >
              {group.label}
              <span>{group.tasks.length}</span>
            </h3>

            <div role="list" aria-label={group.label}>
              {group.tasks.map((task) => (
              <TaskCard key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask}
              onEdit={(id, title) => {
                setEditingTaskId(id);
                setEditingTitle(title);
                setEditingDueAt(toLocalInputValue(task.dueAt));
                setActionError(null);
              }}
              isEditing={editingTaskId === task.id}
              editingTitle={editingTitle} onEditingTitleChange={setEditingTitle}
              editingDueAt={editingDueAt} onEditingDueAtChange={setEditingDueAt}
              onSave={saveTask} onCancel={() => setEditingTaskId(null)}
              isUpdating={busy} isDeleting={deletingTaskId === task.id}
              isEntering={enteringTaskId === task.id}
              onEnterComplete={() => setEnteringTaskId((current) => current === task.id ? null : current)}
              now={now}
              />
              ))}
            </div>
          </section>
        ))}

        {filteredTasks.length === 0 && (
          <p className="empty-state">{tasks.length === 0 ? "還沒有任務，從一件小事開始吧。" : "找不到符合條件的任務。"}</p>
        )}

        <button type="button" className="add-task-button" aria-expanded={showComposer}
          aria-controls="task-composer" disabled={busy} onClick={() => setShowComposer((value) => !value)}>
          <span aria-hidden="true">＋</span>添加任務
        </button>

        {showComposer && (
          <form id="task-composer" className="task-composer" onSubmit={(event) => {
            event.preventDefault();
            void addTask();
          }}>

            <label className="field">
              <span>任務名稱</span>
              <input autoFocus required maxLength={100} placeholder="例如：買麵包 🍞"
                value={newTaskTitle} disabled={busy} onChange={(event) => setNewTaskTitle(event.target.value)} />
            </label>

            <label className="field">
              <span>截止日期與時間 <small>（選填）</small></span>
              <input type="datetime-local" value={newDueAt} disabled={busy}
                onChange={(event) => setNewDueAt(event.target.value)} />
            </label>

            <div className="composer-actions">
              
              <button type="button" className="text-button" disabled={busy} onClick={() => {
                setShowComposer(false);
                setNewTaskTitle("");
                setNewDueAt("");
              }}>取消</button>

              <button type="submit" className="primary-button" disabled={busy}>
                {isSubmitting ? "新增中…" : "新增任務"}
              </button>

            </div>
          </form>
        )}
      </div>
    </main>
  );
}

