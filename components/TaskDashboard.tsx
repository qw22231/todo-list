interface TaskDashboardProps {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionRate: number;
}


export default function TaskDashboard({totalTasks, completedTasks, pendingTasks, completionRate}: TaskDashboardProps) {
  return (
<div>
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">

        <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
          <p className="text-sm text-slate-400">
            Total Tasks
          </p>

          <p className="mt-2 text-3xl font-bold text-white">
            {totalTasks}
          </p>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
          <p className="text-sm text-slate-400">
            Completed
          </p>

          <p className="mt-2 text-3xl font-bold text-emerald-400">
            {completedTasks}
          </p>          
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
          <p className="text-sm text-slate-400">
            Pending
          </p>
          
          <p className="mt-2 text-3xl font-bold text-amber-400">
             {pendingTasks}
          </p>    
        </div>
    </div>

    <div className="mb-8 rounded-lg border border-slate-700 bg-slate-800 p-4">

     <div className="mb-3 flex items-center justify-between">
        <p className="font-medium text-white">
          Completion Progress
        </p>

        <p className="text-emerald-400">
          {completionRate}%
        </p>
     </div>

     <div
        className="h-3 w-full overflow-hidden rounded-full bg-slate-700"
        role="progressbar"
        aria-label="Task completion progress"
        aria-valuenow={completionRate}
        aria-valuemin={0}
        aria-valuemax={100}
        >
     <div
        className="h-full rounded-full bg-emerald-500 transition-all duration-300"
        style={{ width: `${completionRate}%` }}
        />
     </div>
    </div>
</div>
  );
}