import type { Task } from "@/type/task";

const STORAGE_KEY = "todo-tasks";

function readTasks(): Task[] {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (raw === null) return [];

  const data: unknown = JSON.parse(raw);

  // 避免讀入格式錯誤的資料
  if (
    !Array.isArray(data) ||
    !data.every(
      (task) =>
        typeof task === "object" &&
        task !== null &&
        Number.isSafeInteger(task.id) &&
        typeof task.title === "string" &&
        typeof task.completed === "boolean" &&
        (
            task.dueAt === undefined ||
            task.dueAt === null ||
            (
                typeof task.dueAt === "string" &&
                Number.isFinite(Date.parse(task.dueAt))
            )
        )
    )
  ) {
    throw new Error("瀏覽器內的任務資料格式不正確");
  }

  return data as Task[];
}

function writeTasks(tasks: Task[]): void {
  // localStorage 只能存字串，因此需要轉成 JSON
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export async function getTasks(): Promise<Task[]> {
  return readTasks();
}

export async function createTask(
    title: string,
    dueAt: string | null = null
): Promise<Task> {
  const tasks = readTasks();

  const task: Task = {
    // 保留你目前以數字 ID 排序的設計
    id: tasks.reduce(
      (nextId, item) => Math.max(nextId, item.id + 1),
      Date.now()
    ),
    title,
    completed: false,
    dueAt,
  };

  writeTasks([...tasks, task]);
  return task;
}

export async function updateTask(
  id: number,
  updates: Partial<Pick<Task, "title" | "completed" | "dueAt">>
): Promise<Task> {
  const tasks = readTasks();
  const task = tasks.find((item) => item.id === id);

  if (!task) {
    throw new Error("找不到這個任務");
  }

  const updatedTask: Task = {
    ...task,
    ...updates,
  };

  writeTasks(
    tasks.map((item) => (item.id === id ? updatedTask : item))
  );

  return updatedTask;
}

export async function deleteTask(id: number): Promise<void> {
  const tasks = readTasks();
  writeTasks(tasks.filter((item) => item.id !== id));
}

export async function restoreTask(task: Task): Promise<Task> {
  const tasks = readTasks();

  if (tasks.some((item) => item.id === task.id)) {
    throw new Error("相同 ID 的任務已存在，無法復原");
  }

  writeTasks([...tasks, task]);

  return task;
}