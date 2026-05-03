import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { SubcategoryNodeData } from "@/lib/graph/layout";

const statusStyles = {
  "not-started": "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200",
  "in-progress": "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100",
  satisfied: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100",
  exceeded: "border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-700 dark:bg-orange-950/30 dark:text-orange-100",
  invalid: "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950/30 dark:text-rose-100",
} as const;

export const SubcategoryNode = ({
  data,
  selected,
}: NodeProps) => {
  const nodeData = data as SubcategoryNodeData;

  return (
    <div
      className={`w-[220px] rounded-2xl border px-4 py-3 shadow-sm transition ${
        statusStyles[nodeData.progressStatus]
      } ${selected ? "ring-2 ring-slate-400/35 dark:ring-slate-200/20" : ""} ${
        nodeData.isHighlighted ? "shadow-md" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{nodeData.label}</p>
          <p className="mt-1 text-xs opacity-75">
            {nodeData.moduleCount} module{nodeData.moduleCount === 1 ? "" : "s"}
          </p>
        </div>
        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-900 dark:text-slate-300">
          {nodeData.isExpanded ? "Open" : "Closed"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-white/70 px-2 py-1.5 dark:bg-slate-900/90">
          <p className="opacity-60">Completed</p>
          <p className="mt-0.5 font-semibold">{nodeData.earnedCredits} CP</p>
        </div>
        <div className="rounded-xl bg-white/70 px-2 py-1.5 dark:bg-slate-900/90">
          <p className="opacity-60">Still needed</p>
          <p className="mt-0.5 font-semibold">
            {nodeData.remainingCredits > 0 ? `${nodeData.remainingCredits} CP` : "0 CP"}
          </p>
        </div>
      </div>

      <p className="mt-2 text-[11px] opacity-70">
        {nodeData.requiredMin === nodeData.requiredMax
          ? `${nodeData.requiredMin} CP target`
          : `${nodeData.requiredMin}-${nodeData.requiredMax} CP range`}
      </p>

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
};
