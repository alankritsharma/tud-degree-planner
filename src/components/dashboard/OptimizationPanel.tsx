import { OptimizationResult, ResolvedModule, UserModuleState } from "@/types";

type OptimizationPanelProps = {
  optimization: OptimizationResult;
  modules: ResolvedModule[];
  states: UserModuleState[];
};

const warningStyles = {
  info: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  danger:
    "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200",
};

const SubjectList = ({
  title,
  moduleIds,
  modulesById,
  stateByModuleId,
  optimization,
}: {
  title: string;
  moduleIds: string[];
  modulesById: Record<string, ResolvedModule>;
  stateByModuleId: Record<string, UserModuleState>;
  optimization: OptimizationResult;
}) => {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-300">
          {moduleIds.length}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {moduleIds.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
            No subjects here yet.
          </p>
        ) : (
          moduleIds.map((moduleId) => {
            const course = modulesById[moduleId];
            const state = stateByModuleId[moduleId];
            const decision = optimization.decisionsByModuleId[moduleId];

            if (!course) {
              return null;
            }

            return (
              <article key={course.id} className="rounded-xl bg-white p-3 text-xs dark:bg-slate-950">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-slate-900 dark:text-slate-100">{course.title}</p>
                    <p className="mt-1 text-slate-500 dark:text-slate-400">
                      {course.credits} CP | {course.subcategoryLabel}
                    </p>
                  </div>
                  <span className="shrink-0 text-slate-500 dark:text-slate-400">
                    {state?.grade ? state.grade.toFixed(1) : course.gradingType === "pass-fail" ? "P/F" : "No grade"}
                  </span>
                </div>
                {decision ? (
                  <p className="mt-2 leading-5 text-slate-500 dark:text-slate-400">{decision.explanation}</p>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
};

export const OptimizationPanel = ({ optimization, modules, states }: OptimizationPanelProps) => {
  const modulesById = Object.fromEntries(modules.map((module) => [module.id, module]));
  const stateByModuleId = Object.fromEntries(states.map((state) => [state.moduleId, state]));

  return (
    <aside className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Strict Optimizer</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Counted vs extra
        </h2>
        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Uses assigned baskets only. Multi-basket reassignment is advisory and not automatic.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
          <p className="text-slate-400 dark:text-slate-500">Extra CP</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{optimization.extraCredits}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
          <p className="text-slate-400 dark:text-slate-500">Planned CP</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{optimization.plannedCredits}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
          <p className="text-slate-400 dark:text-slate-500">Failed CP</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{optimization.failedCredits}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
          <p className="text-slate-400 dark:text-slate-500">Graded CP</p>
          <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {optimization.countedGradedCredits}
          </p>
        </div>
      </div>

      <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Warnings</h3>
            <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-300">
              {optimization.warnings.length}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {optimization.warnings.length === 0 ? (
              <p className="rounded-xl bg-white p-3 text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                No optimizer warnings.
              </p>
            ) : (
              optimization.warnings.slice(0, 8).map((warning) => (
                <p key={warning.id} className={`rounded-xl border p-3 text-xs leading-5 ${warningStyles[warning.severity]}`}>
                  {warning.message}
                </p>
              ))
            )}
          </div>
        </section>

        <SubjectList
          title="Counted subjects"
          moduleIds={optimization.countedModuleIds}
          modulesById={modulesById}
          stateByModuleId={stateByModuleId}
          optimization={optimization}
        />
        <SubjectList
          title="Extra / backup subjects"
          moduleIds={optimization.extraModuleIds}
          modulesById={modulesById}
          stateByModuleId={stateByModuleId}
          optimization={optimization}
        />
        <SubjectList
          title="Planned subjects"
          moduleIds={optimization.plannedModuleIds}
          modulesById={modulesById}
          stateByModuleId={stateByModuleId}
          optimization={optimization}
        />
        <SubjectList
          title="Failed / attempted"
          moduleIds={optimization.failedModuleIds}
          modulesById={modulesById}
          stateByModuleId={stateByModuleId}
          optimization={optimization}
        />
      </div>
    </aside>
  );
};
