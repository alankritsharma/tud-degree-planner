import { ModuleHandbookEntry } from "@/config/moduleHandbook.catalog";
import { GermanGrade, ModuleStatus, ResolvedModule, Semester, UserModuleState } from "@/types";

type ModuleDetailPanelProps = {
  module: ResolvedModule | null;
  state: UserModuleState | null;
  handbookEntry: ModuleHandbookEntry | null;
  semesters: Semester[];
  onClose: () => void;
  onUpdateStatus: (moduleId: string, status: ModuleStatus) => void;
  onUpdateSemester: (moduleId: string, semesterId: string) => void;
};

const editableStatuses: Array<{ value: ModuleStatus; label: string }> = [
  { value: "planned", label: "Planned" },
  { value: "registered", label: "Registered" },
  { value: "ongoing", label: "Ongoing" },
  { value: "incomplete", label: "Open / incomplete" },
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
];

const DetailRow = ({ label, value }: { label: string; value: string | number | null }) => (
  <div className="grid gap-1 border-b border-slate-100 py-2 text-sm dark:border-slate-800">
    <span className="text-slate-500 dark:text-slate-400">{label}</span>
    <span className="text-slate-800 dark:text-slate-100">{value ?? "Not available"}</span>
  </div>
);

const formatGrade = (grade: GermanGrade | null | undefined) =>
  grade === null || grade === undefined ? "Not set" : grade.toFixed(1);

export const ModuleDetailPanel = ({
  module,
  state,
  handbookEntry,
  semesters,
  onClose,
  onUpdateStatus,
  onUpdateSemester,
}: ModuleDetailPanelProps) => {
  const showWarning =
    handbookEntry &&
    (handbookEntry.textQuality === "merged-prose" ||
      handbookEntry.extractionQuality === "partially-cleaned" ||
      handbookEntry.extractionQuality === "needs-review");

  return (
    <aside
      className={`absolute inset-y-0 right-0 z-20 w-full max-w-sm border-l border-slate-200 bg-white/95 shadow-xl backdrop-blur transition-transform dark:border-slate-800 dark:bg-slate-950/95 ${
        module ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {module ? (
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Graph drawer</p>
              <h3 className="mt-1 line-clamp-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {module.title}
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{module.moduleCode || "No module code"}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-100"
            >
              Close
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {showWarning ? (
              <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                Some handbook text was extracted from PDF and may need cleanup.
              </p>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Planning actions</p>

              <label className="mt-3 block text-xs text-slate-500 dark:text-slate-400">
                Status
                <select
                  value={state?.status ?? "planned"}
                  onChange={(event) => onUpdateStatus(module.id, event.target.value as ModuleStatus)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                >
                  {editableStatuses.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-3 block text-xs text-slate-500 dark:text-slate-400">
                Semester
                <select
                  value={state?.semesterId ?? semesters[0]?.id ?? ""}
                  onChange={(event) => onUpdateSemester(module.id, event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                >
                  {semesters.map((semester) => (
                    <option key={semester.id} value={semester.id}>
                      {semester.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4">
              <DetailRow label="Credits" value={`${module.credits} CP`} />
              <DetailRow label="Assigned basket" value={module.subcategoryLabel} />
              <DetailRow label="Grading type" value={module.gradingType} />
              <DetailRow label="Current status" value={state?.status ?? "planned"} />
              <DetailRow label="Current grade" value={formatGrade(state?.grade)} />
              <DetailRow label="Language" value={handbookEntry?.language ?? null} />
              <DetailRow label="Module cycle" value={handbookEntry?.moduleCycle ?? null} />
              <DetailRow label="Module owner" value={handbookEntry?.moduleOwner ?? null} />
              <DetailRow label="Workload hours" value={handbookEntry?.workloadHours ?? null} />
              <DetailRow label="Self-study hours" value={handbookEntry?.selfStudyHours ?? null} />
              <DetailRow label="Module duration" value={handbookEntry?.moduleDuration ?? null} />
              <DetailRow label="Prerequisites" value={handbookEntry?.prerequisites || "Not available"} />
              <DetailRow label="Exam form" value={handbookEntry?.examForm || "Not available"} />
              <DetailRow label="Credit requirement" value={handbookEntry?.creditRequirement || "Not available"} />
              <DetailRow label="Grading" value={handbookEntry?.grading || "Not available"} />
              <DetailRow label="Source pages" value={handbookEntry?.sourcePages.join(", ") ?? null} />
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
};
