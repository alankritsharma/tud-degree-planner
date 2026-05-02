import { StatusBadge } from "@/components/StatusBadge";
import { ModuleStatus, OptimizationDecision, ResolvedModule } from "@/types";

type ModuleCardProps = {
  module: ResolvedModule;
  status: ModuleStatus;
  grade?: number | null;
  decision?: OptimizationDecision;
  isSelected?: boolean;
  onSelect?: (moduleId: string) => void;
  onDragStart?: (moduleId: string) => void;
  onDragEnd?: () => void;
};

export const ModuleCard = ({
  module,
  status,
  grade,
  decision,
  isSelected = false,
  onSelect,
  onDragStart,
  onDragEnd,
}: ModuleCardProps) => {
  return (
    <article
      draggable
      onClick={() => onSelect?.(module.id)}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", module.id);
        onDragStart?.(module.id);
      }}
      onDragEnd={onDragEnd}
      className={`cursor-grab rounded-2xl border p-3 shadow-sm transition active:cursor-grabbing ${
        isSelected
          ? "border-slate-900 bg-slate-50 shadow-md dark:border-slate-200 dark:bg-slate-900"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="overflow-hidden text-sm font-semibold leading-5 text-slate-900 break-words [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] dark:text-slate-100">
            {module.title}
          </h3>
          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
            {module.credits} CP | {module.subcategoryLabel}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge status={status} />
          {decision ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] capitalize text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              {decision.decision}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          {module.categoryLabel}
        </span>
        <span className="shrink-0 text-[11px] font-medium text-slate-600 dark:text-slate-300">
          {module.gradingType === "pass-fail"
            ? "Pass/fail"
            : grade !== null && grade !== undefined
              ? `Grade ${grade.toFixed(1)}`
              : "No grade"}
        </span>
      </div>
    </article>
  );
};
