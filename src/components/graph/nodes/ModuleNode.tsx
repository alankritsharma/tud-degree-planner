import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ModuleNodeData } from "@/lib/graph/layout";

const statusStyles = {
  done: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100",
  planned: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950/30 dark:text-sky-100",
  gap: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100",
  failed: "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-100",
  inactive: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
} as const;

const statusLabels = {
  done: "done",
  planned: "planned",
  gap: "open",
  failed: "failed",
  inactive: "inactive",
} as const;

export const ModuleNode = ({
  data,
  selected,
}: NodeProps) => {
  const nodeData = data as ModuleNodeData;

  return (
    <div
      className={`w-[220px] rounded-2xl border px-4 py-3 shadow-sm transition ${
        statusStyles[nodeData.moduleStatus]
      } ${selected ? "ring-2 ring-slate-400/35 dark:ring-slate-200/20" : ""} ${
        nodeData.isHighlighted ? "shadow-md" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-semibold">{nodeData.module.title}</p>
          {nodeData.module.moduleCode ? (
            <p className="mt-1 font-mono text-[11px] opacity-65">{nodeData.module.moduleCode}</p>
          ) : null}
        </div>
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-medium capitalize dark:bg-slate-900">
          {statusLabels[nodeData.moduleStatus]}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-full bg-white/75 px-2 py-0.5 dark:bg-slate-900">
          {nodeData.module.credits} CP
        </span>
        {nodeData.semesterLabel ? (
          <span className="rounded-full bg-white/75 px-2 py-0.5 dark:bg-slate-900">
            {nodeData.semesterLabel}
          </span>
        ) : null}
      </div>

      {nodeData.handbookEntry?.moduleCycle || nodeData.handbookEntry?.language ? (
        <p className="mt-2 text-[11px] opacity-70">
          {[nodeData.handbookEntry?.moduleCycle, nodeData.handbookEntry?.language].filter(Boolean).join(" · ")}
        </p>
      ) : null}
    </div>
  );
};
