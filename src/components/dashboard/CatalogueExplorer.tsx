import { useMemo, useState } from "react";
import {
  getModuleByCode,
  getModuleHandbookSummary,
  getModulesBySection,
  ModuleHandbookSection,
  moduleHandbookCatalog,
  searchModules,
} from "@/config/moduleHandbook.catalog";
import { ModuleInfoModal } from "@/components/dashboard/ModuleInfoModal";

const sectionOptions: Array<{ value: "all" | ModuleHandbookSection; label: string }> = [
  { value: "all", label: "All sections" },
  { value: "Software & Hardware", label: "Software & Hardware" },
  { value: "Theory", label: "Theory" },
  { value: "Foundations of Data Science", label: "Foundations of Data Science" },
  { value: "Data Systems Engineering", label: "Data Systems Engineering" },
  { value: "Data Science Applications", label: "Data Science Applications" },
  { value: "Seminars", label: "Seminars" },
  { value: "Labs / Project Labs", label: "Labs / Project Labs" },
];

export const CatalogueExplorer = () => {
  const [selectedSection, setSelectedSection] = useState<"all" | ModuleHandbookSection>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [creditFilter, setCreditFilter] = useState<string>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [cycleFilter, setCycleFilter] = useState<string>("all");
  const [infoModuleCode, setInfoModuleCode] = useState<string | null>(null);

  const summary = getModuleHandbookSummary();

  const languageOptions = useMemo(() => {
    return [...new Set(moduleHandbookCatalog.map((module) => module.language).filter(Boolean))].sort() as string[];
  }, []);

  const cycleOptions = useMemo(() => {
    return [...new Set(moduleHandbookCatalog.map((module) => module.moduleCycle).filter(Boolean))].sort() as string[];
  }, []);

  const creditOptions = useMemo(() => {
    return [...new Set(moduleHandbookCatalog.map((module) => module.creditPoints).filter((value) => value !== null))]
      .map((value) => String(value))
      .sort((left, right) => Number(left) - Number(right));
  }, []);

  const filteredModules = useMemo(() => {
    const sectionModules =
      selectedSection === "all" ? moduleHandbookCatalog : getModulesBySection(selectedSection);
    const searchModulesSet = new Set(
      (searchTerm.trim() ? searchModules(searchTerm) : moduleHandbookCatalog).map((module) => module.moduleCode),
    );

    return sectionModules.filter((module) => {
      if (!searchModulesSet.has(module.moduleCode)) {
        return false;
      }

      if (creditFilter !== "all" && String(module.creditPoints) !== creditFilter) {
        return false;
      }

      if (languageFilter !== "all" && module.language !== languageFilter) {
        return false;
      }

      if (cycleFilter !== "all" && module.moduleCycle !== cycleFilter) {
        return false;
      }

      return true;
    });
  }, [selectedSection, searchTerm, creditFilter, languageFilter, cycleFilter]);

  const selectedModule = infoModuleCode ? getModuleByCode(infoModuleCode) ?? null : null;

  return (
    <section className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/95">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            Module Handbook Catalogue
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">Catalogue Explorer</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          {filteredModules.length} module{filteredModules.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-3 grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
        <div className="flex flex-wrap gap-3">
          <span>{summary.totalUniqueModules} unique modules</span>
          <span>{summary.totalOccurrences} handbook occurrences</span>
        </div>
        <div className="flex flex-wrap gap-2 text-slate-500 dark:text-slate-400">
          {Object.entries(summary.sectionCounts).map(([section, count]) => (
            <span key={section} className="rounded-full bg-white px-2 py-0.5 dark:bg-slate-950">
              {section}: {count}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Availability and registration status must still be checked in TUCaN. This catalogue is extracted from the
          module handbook and is for planning support only.
        </p>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        <select
          value={selectedSection}
          onChange={(event) => setSelectedSection(event.target.value as "all" | ModuleHandbookSection)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {sectionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search module code or name"
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 md:col-span-1 xl:col-span-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        />

        <select
          value={creditFilter}
          onChange={(event) => setCreditFilter(event.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          aria-label="Filter by credit points"
        >
          <option value="all">All CP</option>
          {creditOptions.map((option) => (
            <option key={option} value={option}>
              {option} CP
            </option>
          ))}
        </select>

        <select
          value={languageFilter}
          onChange={(event) => setLanguageFilter(event.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          aria-label="Filter by language"
        >
          <option value="all">All languages</option>
          {languageOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          value={cycleFilter}
          onChange={(event) => setCycleFilter(event.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          aria-label="Filter by module cycle"
        >
          <option value="all">All cycles</option>
          {cycleOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        {filteredModules.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            No modules matched this filter set.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredModules.map((module) => (
              <article
                key={module.moduleCode}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {module.moduleName}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{module.moduleCode}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInfoModuleCode(module.moduleCode)}
                    className="h-7 min-w-7 rounded-full border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                    aria-label={`View details for ${module.moduleName}`}
                    title="Module details"
                  >
                    i
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-white px-2 py-0.5 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
                    {module.creditPoints ?? "?"} CP
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
                    {module.handbookSections.join(" / ")}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
                    {module.language ?? "Language N/A"}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
                    {module.moduleCycle ?? "Cycle N/A"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <ModuleInfoModal module={selectedModule} onClose={() => setInfoModuleCode(null)} />
    </section>
  );
};
