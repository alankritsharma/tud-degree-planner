import { ModuleCard } from "@/components/ModuleCard";
import { ModuleWithState, OptimizationDecision, Semester } from "@/types";

type SemesterColumnProps = {
  semester: Semester;
  items: ModuleWithState[];
  decisionsByModuleId: Record<string, OptimizationDecision>;
  onDropModule: (moduleId: string, semesterId: string) => void;
  onDragStart: (moduleId: string) => void;
  onDragEnd: () => void;
  onSelectModule: (moduleId: string) => void;
  selectedModuleId?: string | null;
  isDropTarget: boolean;
  isCurrentSemester: boolean;
};

export const SemesterColumn = ({
  semester,
  items,
  decisionsByModuleId,
  onDropModule,
  onDragStart,
  onDragEnd,
  onSelectModule,
  selectedModuleId,
  isDropTarget,
  isCurrentSemester,
}: SemesterColumnProps) => {
  return (
    <section
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        event.preventDefault();
        const moduleId = event.dataTransfer.getData("text/plain");
        if (moduleId) {
          onDropModule(moduleId, semester.id);
        }
      }}
      className={`flex h-full min-w-0 flex-col rounded-2xl border p-2.5 transition ${
        isDropTarget
          ? "border-sky-400 bg-sky-50 dark:border-sky-500 dark:bg-sky-950/30"
          : isCurrentSemester
            ? "border-slate-400 bg-slate-50 dark:border-slate-600 dark:bg-slate-900"
            : "border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-950/70"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{semester.label}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{items.length} modules</p>
        </div>
        {isCurrentSemester ? (
          <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] text-white dark:bg-slate-100 dark:text-slate-900">
            Current
          </span>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
            Drop a module here
          </div>
        ) : (
          items.map(({ module, state }) => (
            <ModuleCard
              key={module.id}
              module={module}
              status={state.status}
              grade={state.grade}
              decision={decisionsByModuleId[module.id]}
              isSelected={selectedModuleId === module.id}
              onSelect={onSelectModule}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>
    </section>
  );
};
