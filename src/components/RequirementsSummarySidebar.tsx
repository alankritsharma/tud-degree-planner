import { RequirementProgress } from "@/types";

type RequirementsSummarySidebarProps = {
  programLabel: string;
  specializationLabel: string;
  passedCredits: number;
  totalCredits: number;
  remainingCredits: number;
  totalRequirement: RequirementProgress;
  creditRequirements: RequirementProgress[];
  countRequirements: RequirementProgress[];
};

export const RequirementsSummarySidebar = ({
  programLabel,
  specializationLabel,
  passedCredits,
  totalCredits,
  remainingCredits,
  totalRequirement,
  creditRequirements,
  countRequirements,
}: RequirementsSummarySidebarProps) => {
  const totalPercentage =
    totalRequirement.max === 0
      ? 0
      : Math.min((totalRequirement.completed / totalRequirement.max) * 100, 100);

  return (
    <aside className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Official Structure</p>
        <h2 className="mt-1 text-base font-semibold text-slate-900">{programLabel}</h2>
        <p className="mt-1 text-sm text-slate-500">Specialization: {specializationLabel}</p>

        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500">Completed</p>
              <p className="text-2xl font-semibold text-slate-900">
                {passedCredits}/{totalCredits} CP
              </p>
            </div>
            <p className="text-xs text-slate-500">{remainingCredits} CP remaining</p>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-slate-800"
              style={{ width: `${totalPercentage}%` }}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-medium text-slate-700">Requirement Summary Cards</h3>
        <div className="mt-3 space-y-3">
          {creditRequirements.map((requirement) => (
            <article key={requirement.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-slate-900">{requirement.label}</p>
                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                    requirement.isSatisfied
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {requirement.isSatisfied ? "on track" : "open"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                  <p className="text-slate-400">Min</p>
                  <p className="font-medium text-slate-900">{requirement.min} CP</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                  <p className="text-slate-400">Max</p>
                  <p className="font-medium text-slate-900">{requirement.max} CP</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                  <p className="text-slate-400">Completed</p>
                  <p className="font-medium text-slate-900">{requirement.completed} CP</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                  <p className="text-slate-400">Remaining</p>
                  <p className="font-medium text-slate-900">{requirement.remaining} CP</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-medium text-slate-700">Participation Rules</h3>
        <div className="mt-3 space-y-2">
          {countRequirements.map((requirement) => (
            <div
              key={requirement.id}
              className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs"
            >
              <div>
                <p className="font-medium text-slate-800">{requirement.label}</p>
                {requirement.description ? (
                  <p className="text-slate-500">{requirement.description}</p>
                ) : null}
              </div>
              <div className="text-right text-slate-600">
                <p>
                  {requirement.completed}/{requirement.max} modules
                </p>
                <p>{requirement.remaining} remaining to min</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
};
