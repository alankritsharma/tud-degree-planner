import { ReactNode } from "react";
import { SemesterColumn } from "@/components/SemesterColumn";
import { ModuleWithState, OptimizationDecision, RequirementProgress, Semester } from "@/types";

type PlannerWorkspaceProps = {
  plannerMode: "official" | "actual";
  currentSemesterId: string;
  semesters: Semester[];
  semesterModules: { semester: Semester; items: ModuleWithState[] }[];
  decisionsByModuleId: Record<string, OptimizationDecision>;
  draggedModuleId: string | null;
  dropTargetSemesterId: string | null;
  selectedModuleId: string | null;
  recommendedPlan: {
    id: string;
    label: string;
    suggestedCredits: number;
    focus: string;
    requirementIds: string[];
  }[];
  requirementById: Record<string, RequirementProgress>;
  onDragStart: (moduleId: string) => void;
  onDragEnd: () => void;
  onCurrentSemesterChange: (semesterId: string) => void;
  onDropTargetChange: (semesterId: string | null) => void;
  onDropModule: (moduleId: string, semesterId: string) => void;
  onDeleteSemester: (semesterId: string) => void;
  onSelectModule: (moduleId: string) => void;
  plannerActions?: ReactNode;
};

export const PlannerWorkspace = ({
  plannerMode,
  currentSemesterId,
  semesters,
  semesterModules,
  decisionsByModuleId,
  draggedModuleId,
  dropTargetSemesterId,
  selectedModuleId,
  recommendedPlan,
  requirementById,
  onDragStart,
  onDragEnd,
  onCurrentSemesterChange,
  onDropTargetChange,
  onDropModule,
  onDeleteSemester,
  onSelectModule,
  plannerActions,
}: PlannerWorkspaceProps) => {
  return (
    <section className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/95">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            {plannerMode === "actual" ? "Actual Planner" : "Official Guide"}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {plannerMode === "actual"
              ? "Semester-by-semester planning board"
              : "Recommended study rhythm"}
          </h2>
        </div>

        {plannerMode === "actual" ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {semesters.map((semester) => (
              <div
                key={semester.id}
                className={`flex max-w-44 items-center gap-1 rounded-full border px-2 py-1 transition ${
                  currentSemesterId === semester.id
                    ? "border-slate-900 bg-slate-900 text-white shadow-sm dark:border-slate-200 dark:bg-slate-200 dark:text-slate-950"
                    : "border-slate-200 bg-slate-100 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onCurrentSemesterChange(semester.id)}
                  className="truncate px-1 py-0.5 text-xs"
                >
                  {semester.label}
                </button>
                {semester.order > 4 ? (
                  <button
                    type="button"
                    onClick={() => onDeleteSemester(semester.id)}
                    className="rounded-full px-1 text-[11px] opacity-70 transition hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10"
                    aria-label={`Delete ${semester.label}`}
                    title={`Delete ${semester.label}`}
                  >
                    x
                  </button>
                ) : null}
              </div>
            ))}
            {plannerActions}
          </div>
        ) : (
          plannerActions
        )}
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-hidden">
        {plannerMode === "actual" ? (
          <div className="grid h-full grid-flow-col auto-cols-[minmax(15.5rem,1fr)] gap-3 overflow-x-auto pb-2 pr-1">
            {semesterModules.map(({ semester, items }) => (
              <div
                key={semester.id}
                className="h-full min-w-0"
                onDragEnter={() => {
                  if (draggedModuleId) {
                    onDropTargetChange(semester.id);
                  }
                }}
              >
                <SemesterColumn
                  semester={semester}
                  items={items}
                  decisionsByModuleId={decisionsByModuleId}
                  selectedModuleId={selectedModuleId}
                  isDropTarget={dropTargetSemesterId === semester.id}
                  isCurrentSemester={currentSemesterId === semester.id}
                  onDropModule={onDropModule}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onSelectModule={onSelectModule}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid h-full gap-4 overflow-y-auto pr-1 xl:grid-cols-2">
            {recommendedPlan.map((semester) => (
              <article key={semester.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {semester.suggestedCredits} CP guideline
                </p>
                <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-slate-100">{semester.label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{semester.focus}</p>
                <div className="mt-4 space-y-2">
                  {semester.requirementIds.map((requirementId) => {
                    const requirement = requirementById[requirementId];
                    if (!requirement) {
                      return null;
                    }

                    return (
                      <div
                        key={requirementId}
                        className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm dark:bg-slate-950"
                      >
                        <span className="text-slate-700 dark:text-slate-200">{requirement.label}</span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {requirement.completed}/{requirement.max} CP
                        </span>
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
