import { useState } from "react";
import { RequirementProgress, RequirementStatus } from "@/types";

type OfficialStructurePanelProps = {
  requirementById: Record<string, RequirementProgress>;
  countRequirements: RequirementProgress[];
  compact?: boolean;
  onRequirementSelect?: (requirementId: string) => void;
};

type RequirementTreeNode = {
  id: string;
  children?: RequirementTreeNode[];
};

const requirementTree: RequirementTreeNode = {
  id: "total-degree",
  children: [
    {
      id: "elective-specialization",
      children: [
        {
          id: "core-course-catalogues",
          children: [{ id: "basic-software-hardware" }, { id: "basic-theory" }],
        },
        {
          id: "specialization-dse",
          children: [
            {
              id: "dse-elective-area",
              children: [
                { id: "dse-foundations" },
                { id: "dse-data-systems" },
                { id: "dse-applications" },
              ],
            },
            {
              id: "dse-practice-block",
              children: [
                { id: "dse-seminar" },
                { id: "dse-lab-project" },
                { id: "dse-practical-lab-teaching" },
                { id: "dse-research-paper" },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "studium-generale",
      children: [
        { id: "ge-languages" },
        { id: "ge-humanities-social-economics" },
        { id: "ge-environment-engineering-natural" },
      ],
    },
    { id: "master-thesis" },
  ],
};

const statusClasses: Record<RequirementStatus, string> = {
  "not-started": "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300",
  "in-progress": "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200",
  satisfied: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200",
  exceeded: "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-200",
  invalid: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-200",
};

const formatRange = (requirement: RequirementProgress) => {
  if (requirement.min === requirement.max) {
    return `${requirement.min} CP`;
  }

  return `${requirement.min}-${requirement.max} CP`;
};

const ProgressRow = ({
  requirement,
  depth,
  onSelect,
}: {
  requirement: RequirementProgress;
  depth: number;
  onSelect?: (requirementId: string) => void;
}) => {
  const progress = requirement.max === 0 ? 0 : Math.min((requirement.counted / requirement.max) * 100, 100);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(requirement.id)}
      className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0" style={{ paddingLeft: `${depth * 0.45}rem` }}>
          <p className="break-words text-sm font-medium text-slate-900 dark:text-slate-100">
            {requirement.label}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Required {formatRange(requirement)}
            {requirement.minModules ? ` | min ${requirement.minModules} module` : ""}
            {requirement.maxModules ? ` | max ${requirement.maxModules} module` : ""}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${statusClasses[requirement.status]}`}>
          {requirement.status}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-xl bg-slate-50 px-2 py-1.5 dark:bg-slate-900">
          <p className="text-slate-400 dark:text-slate-500">Counted</p>
          <p className="font-medium text-slate-900 dark:text-slate-100">{requirement.counted}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-2 py-1.5 dark:bg-slate-900">
          <p className="text-slate-400 dark:text-slate-500">Planned</p>
          <p className="font-medium text-slate-900 dark:text-slate-100">{requirement.planned}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-2 py-1.5 dark:bg-slate-900">
          <p className="text-slate-400 dark:text-slate-500">Extra</p>
          <p className="font-medium text-slate-900 dark:text-slate-100">{requirement.extra}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-2 py-1.5 dark:bg-slate-900">
          <p className="text-slate-400 dark:text-slate-500">Missing</p>
          <p className="font-medium text-slate-900 dark:text-slate-100">{requirement.remaining}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-2 py-1.5 dark:bg-slate-900">
          <p className="text-slate-400 dark:text-slate-500">Overflow</p>
          <p className="font-medium text-slate-900 dark:text-slate-100">{requirement.overflow}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-2 py-1.5 dark:bg-slate-900">
          <p className="text-slate-400 dark:text-slate-500">P/F CP</p>
          <p className="font-medium text-slate-900 dark:text-slate-100">{requirement.passFailCounted}</p>
        </div>
      </div>

      <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-2 rounded-full bg-slate-800 dark:bg-slate-300" style={{ width: `${progress}%` }} />
      </div>
    </button>
  );
};

const TreeRows = ({
  node,
  requirementById,
  depth = 0,
  onSelect,
}: {
  node: RequirementTreeNode;
  requirementById: Record<string, RequirementProgress>;
  depth?: number;
  onSelect?: (requirementId: string) => void;
}) => {
  const requirement = requirementById[node.id];

  if (!requirement) {
    return null;
  }

  return (
    <>
      <ProgressRow requirement={requirement} depth={depth} onSelect={onSelect} />
      {node.children?.map((child) => (
        <TreeRows key={child.id} node={child} requirementById={requirementById} depth={depth + 1} onSelect={onSelect} />
      ))}
    </>
  );
};

export const OfficialStructurePanel = ({
  requirementById,
  compact = false,
  onRequirementSelect,
}: OfficialStructurePanelProps) => {
  const [isExpanded, setIsExpanded] = useState(!compact);

  return (
    <aside className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Requirement Tree</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {compact ? "Requirement summary" : "Official structure"}
          </h2>
        </div>
        {compact ? (
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-slate-100"
          >
            {isExpanded ? "Compact" : "Expand"}
          </button>
        ) : null}
      </div>

      <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {compact && !isExpanded ? (
          ["total-degree", "elective-specialization", "studium-generale", "master-thesis"].map((id) => {
            const requirement = requirementById[id];
            return requirement ? <ProgressRow key={id} requirement={requirement} depth={0} onSelect={onRequirementSelect} /> : null;
          })
        ) : (
          <TreeRows node={requirementTree} requirementById={requirementById} onSelect={onRequirementSelect} />
        )}
      </div>
    </aside>
  );
};
