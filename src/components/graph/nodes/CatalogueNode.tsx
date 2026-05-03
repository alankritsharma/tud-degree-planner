import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { CatalogueNodeData } from "@/lib/graph/layout";

const statusStyles = {
  "not-started": {
    border: "border-slate-200 dark:border-slate-700",
    bg: "bg-white dark:bg-slate-950",
    accent: "bg-slate-400",
    text: "text-slate-700 dark:text-slate-200",
    chip: "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300",
  },
  "in-progress": {
    border: "border-sky-300 dark:border-sky-700",
    bg: "bg-sky-50 dark:bg-sky-950/30",
    accent: "bg-sky-500",
    text: "text-sky-900 dark:text-sky-100",
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-900/70 dark:text-sky-200",
  },
  satisfied: {
    border: "border-emerald-300 dark:border-emerald-700",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    accent: "bg-emerald-500",
    text: "text-emerald-900 dark:text-emerald-100",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/70 dark:text-emerald-200",
  },
  exceeded: {
    border: "border-orange-300 dark:border-orange-700",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    accent: "bg-orange-500",
    text: "text-orange-900 dark:text-orange-100",
    chip: "bg-orange-100 text-orange-700 dark:bg-orange-900/70 dark:text-orange-200",
  },
  invalid: {
    border: "border-rose-300 dark:border-rose-700",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    accent: "bg-rose-500",
    text: "text-rose-900 dark:text-rose-100",
    chip: "bg-rose-100 text-rose-700 dark:bg-rose-900/70 dark:text-rose-200",
  },
} as const;

export const CatalogueNode = ({
  data,
  selected,
}: NodeProps) => {
  const nodeData = data as CatalogueNodeData;
  const style = statusStyles[nodeData.progressStatus];
  const ratio =
    nodeData.requiredMin > 0
      ? Math.min(nodeData.earnedCredits / nodeData.requiredMin, 1)
      : 0;

  return (
    <div
      className={`w-[244px] rounded-2xl border px-4 py-3 shadow-sm transition ${style.border} ${style.bg} ${
        selected ? "ring-2 ring-slate-400/40 dark:ring-slate-200/20" : ""
      } ${nodeData.isHighlighted ? "shadow-md" : ""}`}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />

      <div className="flex items-start gap-3">
        <div className="relative mt-0.5 h-10 w-10 shrink-0">
          <div className="absolute inset-0 rounded-full border border-slate-200 dark:border-slate-700" />
          <div
            className={`absolute inset-[3px] rounded-full ${style.accent}`}
            style={{ clipPath: `inset(${100 - ratio * 100}% 0 0 0 round 999px)` }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-slate-900 dark:text-slate-100">
            {nodeData.earnedCredits}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-semibold ${style.text}`}>{nodeData.label}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {nodeData.requiredMin === nodeData.requiredMax
              ? `${nodeData.requiredMin} CP target`
              : `${nodeData.requiredMin}-${nodeData.requiredMax} CP target`}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${style.chip}`}>
              {nodeData.remainingCredits > 0
                ? `${nodeData.remainingCredits} CP needed`
                : "Requirement covered"}
            </span>
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              {nodeData.isExpanded ? "Collapse" : "Expand"}
            </span>
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
};
