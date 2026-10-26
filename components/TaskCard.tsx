import type { Task } from "../type/task";

interface TaskCardProps {
    task: Task;
    onToggle: (id: number) => void;
    onDelete: (id: number) => void;
    onEdit: (id: number, title: string) => void;

    isEditing: boolean;
    editingTitle: string;
    onEditingTitleChange: (value: string) => void;
    onSave: (id: number) => void;
    onCancel: () => void;
    isUpdating: boolean;
    isDeleting: boolean;
    isEntering: boolean;
    editingDueAt: string;
    onEditingDueAtChange: (value: string) => void;
    onEnterComplete: () => void;
}

export default function TaskCard(
    { 
    task, 
    onToggle, 
    onDelete, 
    onEdit, 
    isEditing, 
    editingTitle, 
    onEditingTitleChange, 
    onSave,
    onCancel,
    isUpdating,
    isDeleting,
    isEntering,
    editingDueAt,
    onEditingDueAtChange,
    onEnterComplete,
    }: TaskCardProps
) {
    return (
    <div
        role="listitem"
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && event.animationName === "task-in") onEnterComplete();
        }}
        className={[
        "task-row",
        isEntering ? "task-enter" : "",
        isDeleting ? "task-exit" : "",
        ].join(" ")}
    >
        <button
        type="button"
        className={`task-check ${task.completed ? "is-completed" : ""}`}
        aria-label={task.completed ? "標記為未完成" : "標記為已完成"}
        aria-pressed={task.completed}
        disabled={isUpdating || isDeleting || isEditing}
        onClick={() => onToggle(task.id)}
        >
        {task.completed ? "✓" : ""}
        </button>

        <div className="task-content">
        {isEditing ? (
            <>
            <input
                aria-label="任務名稱"
                autoFocus
                value={editingTitle}
                maxLength={100}
                disabled={isUpdating || isDeleting}
                onChange={(event) =>
                onEditingTitleChange(event.target.value)
                }
            />

            <label className="due-field">
                <span>截止日期與時間（選填）</span>
                <input
                type="datetime-local"
                value={editingDueAt}
                disabled={isUpdating || isDeleting}
                onChange={(event) =>
                    onEditingDueAtChange(event.target.value)
                }
                />
            </label>
            </>
        ) : (
            <>
            <span
                className={`task-title ${task.completed ? "is-done" : ""}`}
            >
                {task.title}
            </span>

            {task.dueAt && (
                <time className="task-due" dateTime={task.dueAt}>
                截止：{new Date(task.dueAt).toLocaleString("zh-HK", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                })}
                </time>
            )}
            </>
        )}
        </div>

        <div className="task-actions">
        {isEditing ? (
            <>
            <button
                type="button"
                disabled={isUpdating || isDeleting}
                onClick={() => onSave(task.id)}
            >
                儲存
            </button>
            <button
                type="button"
                disabled={isUpdating || isDeleting}
                onClick={onCancel}
            >
                取消
            </button>
            </>
        ) : (
            <>
            <button
                type="button"
                disabled={isUpdating || isDeleting}
                onClick={() => onEdit(task.id, task.title)}
            >
                編輯
            </button>
            <button
                type="button"
                disabled={isUpdating || isDeleting}
                onClick={() => onDelete(task.id)}
            >
                刪除
            </button>
            </>
        )}
        </div>
    </div>
    );
}
