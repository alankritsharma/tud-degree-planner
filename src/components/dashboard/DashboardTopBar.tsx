import { ThemePreference } from "@/hooks/useTheme";
import { Semester } from "@/types";

type DashboardTopBarProps = {
  degreeName: string;
  currentSemesterId: string;
  semesters: Semester[];
  plannerMode: "official" | "actual";
  countedCredits: number;
  totalCredits: number;
  themePreference: ThemePreference;
  onCurrentSemesterChange: (semesterId: string) => void;
  onPlannerModeChange: (mode: "official" | "actual") => void;
  onThemeChange: (theme: ThemePreference) => void;
  onAddSemester: () => void;
  onAddModule: () => void;
};

export const DashboardTopBar = ({
  degreeName,
  currentSemesterId,
  semesters,
  plannerMode,
  countedCredits,
  totalCredits,
  themePreference,
  onCurrentSemesterChange,
  onPlannerModeChange,
  onThemeChange,
  onAddSemester,
  onAddModule,
}: DashboardTopBarProps) => {
  return (
    <header className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">MasterMap</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Academic Planning Workspace
          </h1>
          <p className="mt-1 break-words text-sm text-slate-500 dark:text-slate-400">
            {degreeName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
            {[
              { id: "official", label: "Official Structure" },
              { id: "actual", label: "My Actual Plan" },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onPlannerModeChange(option.id as "official" | "actual")}
                className={`rounded-xl px-3 py-2 text-sm transition ${
                  plannerMode === option.id
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
            {(["light", "dark", "system"] as ThemePreference[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onThemeChange(option)}
                className={`rounded-xl px-3 py-2 text-sm capitalize transition ${
                  themePreference === option
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <select
            value={currentSemesterId}
            onChange={(event) => onCurrentSemesterChange(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {semesters.map((semester) => (
              <option key={semester.id} value={semester.id}>
                {semester.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onAddSemester}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Add Semester
          </button>

          <button
            type="button"
            onClick={onAddModule}
            className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Add Module
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          {countedCredits}/{totalCredits} CP counted
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          {semesters.length} semesters in plan
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          Current view: {plannerMode === "actual" ? "Actual planner" : "Official structure"}
        </span>
      </div>
    </header>
  );
};
