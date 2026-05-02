"use client";

import { useMemo, useState } from "react";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ModuleSidePanel } from "@/components/dashboard/ModuleSidePanel";
import { OfficialStructurePanel } from "@/components/dashboard/OfficialStructurePanel";
import { OptimizationPanel } from "@/components/dashboard/OptimizationPanel";
import { PlannerWorkspace } from "@/components/dashboard/PlannerWorkspace";
import { useModuleProgress } from "@/hooks/useModuleProgress";
import { useTheme } from "@/hooks/useTheme";

export default function DashboardPage() {
  const {
    programRules,
    recommendedPlan,
    modules,
    states,
    optimization,
    actualPlan,
    officialProgress,
    metrics,
    updateStatus,
    updateSemester,
    updateGrade,
    updateCountingRule,
    updateGradingType,
    updateAssignedBasket,
    updateRecognitionApproved,
    updateAssignmentStatus,
    updateExamKind,
    updateRecognitionType,
    addModule,
  } = useModuleProgress();
  const { themePreference, setThemePreference } = useTheme();

  const [plannerMode, setPlannerMode] = useState<"official" | "actual">("actual");
  const [panelMode, setPanelMode] = useState<"details" | "add">("details");
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [currentSemesterId, setCurrentSemesterId] = useState("");
  const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null);
  const [dropTargetSemesterId, setDropTargetSemesterId] = useState<string | null>(null);
  const [isActualDrawerOpen, setIsActualDrawerOpen] = useState(false);
  const [filters, setFilters] = useState({
    categoryId: "",
    status: "",
    semesterId: "",
  });

  const effectiveCurrentSemesterId = actualPlan.semesters.some(
    (semester) => semester.id === currentSemesterId,
  )
    ? currentSemesterId
    : actualPlan.semesters.at(-1)?.id ?? actualPlan.semesters[0]?.id ?? "";

  const effectiveSelectedModuleId =
    selectedModuleId && modules.some((module) => module.id === selectedModuleId)
      ? selectedModuleId
      : modules[0]?.id ?? null;

  const filteredSemesterModules = useMemo(() => {
    return actualPlan.semesterModules.map(({ semester, items }) => ({
      semester,
      items: items.filter(({ module, state }) => {
        if (filters.categoryId && module.categoryId !== filters.categoryId) {
          return false;
        }

        if (filters.status && state.status !== filters.status) {
          return false;
        }

        if (filters.semesterId && state.semesterId !== filters.semesterId) {
          return false;
        }

        return true;
      }),
    }));
  }, [actualPlan.semesterModules, filters.categoryId, filters.semesterId, filters.status]);

  const selectedModule =
    modules.find((module) => module.id === effectiveSelectedModuleId) ?? null;
  const selectedState =
    states.find((state) => state.moduleId === effectiveSelectedModuleId) ?? null;

  const handleDropModule = (moduleId: string, semesterId: string) => {
    updateSemester(moduleId, semesterId);
    setCurrentSemesterId(semesterId);
    setDraggedModuleId(null);
    setDropTargetSemesterId(null);
  };

  const handleDeleteSemester = (semesterId: string) => {
    const semester = actualPlan.semesters.find((item) => item.id === semesterId);
    if (!semester) {
      return;
    }

    const confirmation = window.confirm(`Delete ${semester.label}?`);
    if (!confirmation) {
      return;
    }

    const result = actualPlan.deleteSemester(semesterId);
    if (!result.ok) {
      window.alert(result.reason);
      return;
    }

    if (effectiveCurrentSemesterId === semesterId && result.nextSemesterId) {
      setCurrentSemesterId(result.nextSemesterId);
    }

    if (filters.semesterId === semesterId) {
      setFilters((current) => ({
        ...current,
        semesterId: "",
      }));
    }
  };

  const openAddModulePanel = () => {
    setPanelMode("add");
    if (plannerMode === "actual") {
      setIsActualDrawerOpen(true);
    }
  };

  const openModuleDetails = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setPanelMode("details");
    if (plannerMode === "actual") {
      setIsActualDrawerOpen(true);
    }
  };

  const isOfficialView = plannerMode === "official";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.92),_rgba(241,245,249,1)_45%,_rgba(226,232,240,0.96)_100%)] p-4 text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(71,85,105,0.35),_rgba(15,23,42,1)_46%,_rgba(15,23,42,1)_100%)] dark:text-slate-100">
      <div className="grid min-h-[calc(100svh-2rem)] grid-rows-[auto_auto_auto_minmax(32rem,1fr)] gap-4">
        <DashboardTopBar
          degreeName={`${programRules.programLabel} | ${programRules.specializationLabel}`}
          currentSemesterId={effectiveCurrentSemesterId}
          semesters={actualPlan.semesters}
          plannerMode={plannerMode}
          countedCredits={metrics.countedCredits}
          totalCredits={metrics.totalCredits}
          themePreference={themePreference}
          onCurrentSemesterChange={setCurrentSemesterId}
          onPlannerModeChange={setPlannerMode}
          onThemeChange={setThemePreference}
          onAddSemester={actualPlan.addSemester}
          onAddModule={openAddModulePanel}
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Counted CP"
            value={`${metrics.countedCredits}`}
            hint={`${metrics.countedCredits}/${metrics.totalCredits} CP in strict optimizer set`}
          />
          <KpiCard
            label="Remaining CP"
            value={`${metrics.remainingCredits}`}
            hint="Still needed to reach the 120 CP programme total"
          />
          <KpiCard
            label="Extra CP"
            value={`${metrics.extraCredits}`}
            hint="Completed CP outside the strict counted set"
          />
          <KpiCard
            label="GPA"
            value={metrics.gpa !== null ? metrics.gpa.toFixed(2) : "N/A"}
            hint={metrics.gpaText ? `Overall grade text: ${metrics.gpaText}` : "Only counted graded modules affect GPA"}
          />
        </section>

        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          {programRules.legalDisclaimer}
        </p>

        {isOfficialView ? (
          <section className="grid min-h-[32rem] gap-4 xl:grid-cols-[360px_minmax(0,1fr)_308px]">
            <OfficialStructurePanel
              requirementById={officialProgress.requirementById}
              countRequirements={officialProgress.countRequirements}
            />

            <PlannerWorkspace
              plannerMode={plannerMode}
              currentSemesterId={effectiveCurrentSemesterId}
              semesters={actualPlan.semesters}
              semesterModules={filteredSemesterModules}
              decisionsByModuleId={optimization.decisionsByModuleId}
              draggedModuleId={draggedModuleId}
              dropTargetSemesterId={dropTargetSemesterId}
              selectedModuleId={effectiveSelectedModuleId}
              recommendedPlan={recommendedPlan}
              requirementById={officialProgress.requirementById}
              onDragStart={setDraggedModuleId}
              onDragEnd={() => {
                setDraggedModuleId(null);
                setDropTargetSemesterId(null);
              }}
              onCurrentSemesterChange={setCurrentSemesterId}
              onDropTargetChange={setDropTargetSemesterId}
              onDropModule={handleDropModule}
              onDeleteSemester={handleDeleteSemester}
              onSelectModule={openModuleDetails}
            />

            <ModuleSidePanel
              selectedModule={selectedModule}
              selectedState={selectedState}
              semesters={actualPlan.semesters}
              categories={programRules.categories}
              subcategories={programRules.subcategories}
              requirements={programRules.requirements}
              currentSemesterId={effectiveCurrentSemesterId}
              filters={filters}
              onFiltersChange={setFilters}
              onUpdateStatus={updateStatus}
              onUpdateSemester={updateSemester}
              onUpdateGrade={updateGrade}
              onUpdateCountingRule={updateCountingRule}
              onUpdateGradingType={updateGradingType}
              onUpdateAssignedBasket={updateAssignedBasket}
              onUpdateRecognitionApproved={updateRecognitionApproved}
              onUpdateAssignmentStatus={updateAssignmentStatus}
              onUpdateExamKind={updateExamKind}
              onUpdateRecognitionType={updateRecognitionType}
              onAddModule={addModule}
              onSelectModule={setSelectedModuleId}
              panelMode={panelMode}
              onPanelModeChange={setPanelMode}
              defaultFiltersOpen
            />
          </section>
        ) : (
          <section className="grid min-h-[32rem] gap-4 xl:grid-cols-[260px_minmax(0,1fr)_360px]">
            <OfficialStructurePanel
              requirementById={officialProgress.requirementById}
              countRequirements={officialProgress.countRequirements}
              compact
            />

            <PlannerWorkspace
              plannerMode={plannerMode}
              currentSemesterId={effectiveCurrentSemesterId}
              semesters={actualPlan.semesters}
              semesterModules={filteredSemesterModules}
              decisionsByModuleId={optimization.decisionsByModuleId}
              draggedModuleId={draggedModuleId}
              dropTargetSemesterId={dropTargetSemesterId}
              selectedModuleId={effectiveSelectedModuleId}
              recommendedPlan={recommendedPlan}
              requirementById={officialProgress.requirementById}
              onDragStart={setDraggedModuleId}
              onDragEnd={() => {
                setDraggedModuleId(null);
                setDropTargetSemesterId(null);
              }}
              onCurrentSemesterChange={setCurrentSemesterId}
              onDropTargetChange={setDropTargetSemesterId}
              onDropModule={handleDropModule}
              onDeleteSemester={handleDeleteSemester}
              onSelectModule={openModuleDetails}
              plannerActions={
                <button
                  type="button"
                  onClick={() => setIsActualDrawerOpen(true)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100"
                >
                  Controls
                </button>
              }
            />

            <OptimizationPanel optimization={optimization} modules={modules} states={states} />
          </section>
        )}
      </div>

      {!isOfficialView && isActualDrawerOpen ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex justify-end">
          <button
            type="button"
            onClick={() => setIsActualDrawerOpen(false)}
            className="pointer-events-auto absolute inset-0 bg-slate-900/20 backdrop-blur-[1px] dark:bg-slate-950/35"
            aria-label="Close module drawer"
          />
          <div className="pointer-events-auto relative h-full w-full max-w-sm p-4">
            <ModuleSidePanel
              selectedModule={selectedModule}
              selectedState={selectedState}
              semesters={actualPlan.semesters}
              categories={programRules.categories}
              subcategories={programRules.subcategories}
              requirements={programRules.requirements}
              currentSemesterId={effectiveCurrentSemesterId}
              filters={filters}
              onFiltersChange={setFilters}
              onUpdateStatus={updateStatus}
              onUpdateSemester={updateSemester}
              onUpdateGrade={updateGrade}
              onUpdateCountingRule={updateCountingRule}
              onUpdateGradingType={updateGradingType}
              onUpdateAssignedBasket={updateAssignedBasket}
              onUpdateRecognitionApproved={updateRecognitionApproved}
              onUpdateAssignmentStatus={updateAssignmentStatus}
              onUpdateExamKind={updateExamKind}
              onUpdateRecognitionType={updateRecognitionType}
              onAddModule={addModule}
              onSelectModule={setSelectedModuleId}
              panelMode={panelMode}
              onPanelModeChange={setPanelMode}
              variant="drawer"
              onClose={() => setIsActualDrawerOpen(false)}
              defaultFiltersOpen={false}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
