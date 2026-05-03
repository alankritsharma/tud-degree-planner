import { useEffect } from "react";
import { ModuleHandbookEntry } from "@/config/moduleHandbook.catalog";

type ModuleInfoModalProps = {
  module: ModuleHandbookEntry | null;
  onClose: () => void;
};

const InfoRow = ({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) => (
  <div className="grid gap-1 border-b border-slate-100 py-2 text-sm dark:border-slate-800 sm:grid-cols-[11rem_minmax(0,1fr)]">
    <span className="text-slate-500 dark:text-slate-400">{label}</span>
    <span className="text-slate-800 dark:text-slate-100">{value ?? "Not available"}</span>
  </div>
);

export const ModuleInfoModal = ({ module, onClose }: ModuleInfoModalProps) => {
  useEffect(() => {
    if (!module) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [module, onClose]);

  if (!module) {
    return null;
  }

  const showProseWarning =
    module.textQuality === "merged-prose" ||
    module.extractionQuality === "partially-cleaned" ||
    module.extractionQuality === "needs-review";
  const hasReadableLongText =
    module.textQuality !== "merged-prose" &&
    (module.teachingContent.length > 0 ||
      Boolean(module.learningObjectives) ||
      module.references.length > 0 ||
      Boolean(module.comment));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Close module details"
      />
      <article className="relative z-10 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
              {module.moduleName}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{module.moduleCode}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-100"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {showProseWarning ? (
            <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              Some long text was extracted from PDF and may need cleanup.
            </p>
          ) : null}

          <InfoRow label="Module name" value={module.moduleName} />
          <InfoRow label="Module code" value={module.moduleCode} />
          <InfoRow label="CP" value={module.creditPoints} />
          <InfoRow label="Handbook section(s)" value={module.handbookSections.join(", ")} />
          <InfoRow label="Language" value={module.language} />
          <InfoRow label="Module cycle" value={module.moduleCycle} />
          <InfoRow label="Module owner / professor" value={module.moduleOwner} />
          <InfoRow label="Workload hours" value={module.workloadHours} />
          <InfoRow label="Self-study hours" value={module.selfStudyHours} />
          <InfoRow label="Module duration" value={module.moduleDuration} />
          <InfoRow label="Prerequisites" value={module.prerequisites || "Not available"} />
          <InfoRow label="Exam form" value={module.examForm || "Not available"} />
          <InfoRow label="Credit requirement" value={module.creditRequirement || "Not available"} />
          <InfoRow label="Grading" value={module.grading || "Not available"} />
          <InfoRow label="Source pages" value={module.sourcePages.join(", ")} />
          <InfoRow label="Text quality" value={module.textQuality} />
          <InfoRow label="Extraction quality" value={module.extractionQuality} />

          {hasReadableLongText ? (
            <section className="mt-4 space-y-3">
              {module.teachingContent.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100">Teaching content</h4>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {module.teachingContent.join(" ")}
                  </p>
                </div>
              ) : null}

              {module.learningObjectives ? (
                <div>
                  <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100">Learning objectives</h4>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{module.learningObjectives}</p>
                </div>
              ) : null}

              {module.references.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100">References</h4>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{module.references.join(" ")}</p>
                </div>
              ) : null}

              {module.comment ? (
                <div>
                  <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100">Comment</h4>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{module.comment}</p>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </article>
    </div>
  );
};
