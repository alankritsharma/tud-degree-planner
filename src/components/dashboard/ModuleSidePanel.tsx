import { useMemo, useState } from "react";
import { validGermanGrades } from "@/lib/grades";
import {
  AssignmentStatus,
  CountingRule,
  ExamKind,
  GermanGrade,
  GradingType,
  ModuleStatus,
  ProgramRequirement,
  RecognitionType,
  ResolvedModule,
  Semester,
  UserModuleState,
} from "@/types";

type FilterState = {
  categoryId: string;
  status: string;
  semesterId: string;
};

type ModuleSidePanelProps = {
  selectedModule: ResolvedModule | null;
  selectedState: UserModuleState | null;
  semesters: Semester[];
  categories: { id: string; label: string; groupId: string }[];
  subcategories: { id: string; label: string; categoryId: string }[];
  requirements: ProgramRequirement[];
  currentSemesterId: string;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onUpdateStatus: (moduleId: string, status: ModuleStatus) => void;
  onUpdateSemester: (moduleId: string, semesterId: string) => void;
  onUpdateGrade: (moduleId: string, grade: GermanGrade | null) => void;
  onUpdateCountingRule: (moduleId: string, countingRule: CountingRule) => void;
  onUpdateGradingType: (moduleId: string, gradingType: GradingType) => void;
  onUpdateAssignedBasket: (moduleId: string, assignedBasketId: string) => void;
  onUpdateRecognitionApproved: (moduleId: string, recognitionApproved: boolean) => void;
  onUpdateAssignmentStatus: (moduleId: string, assignmentStatus: AssignmentStatus) => void;
  onUpdateExamKind: (moduleId: string, examKind: ExamKind) => void;
  onUpdateRecognitionType: (moduleId: string, recognitionType: RecognitionType) => void;
  onAddModule: (input: {
    title: string;
    credits: number;
    assignedBasketId: string;
    typeLabel: ResolvedModule["typeLabel"];
    countingRule: CountingRule;
    gradingType: GradingType;
    assignmentStatus: AssignmentStatus;
    examKind: ExamKind;
    recognitionType: RecognitionType;
    recognitionApproved: boolean;
    semesterId: string;
    status: ModuleStatus;
    grade: GermanGrade | null;
  }) => string;
  onSelectModule: (moduleId: string) => void;
  panelMode: "details" | "add";
  onPanelModeChange: (mode: "details" | "add") => void;
  variant?: "sidebar" | "drawer";
  onClose?: () => void;
  defaultFiltersOpen?: boolean;
};

const statuses: ModuleStatus[] = [
  "planned",
  "registered",
  "ongoing",
  "incomplete",
  "passed",
  "failed",
  "withdrawn",
  "recognised",
  "extra",
];

const typeOptions: ResolvedModule["typeLabel"][] = [
  "lecture",
  "seminar",
  "lab",
  "project lab",
  "practical lab",
  "general education",
  "research paper",
  "thesis",
];

const countingOptions: { value: CountingRule; label: string }[] = [
  { value: "auto", label: "Auto optimizer" },
  { value: "counted", label: "Candidate for counting" },
  { value: "not-counted", label: "Keep outside degree" },
];

const assignmentOptions: AssignmentStatus[] = ["normal", "requested", "approved", "needs-approval"];
const examKindOptions: ExamKind[] = ["unknown", "technical-exam", "study-exam"];
const recognitionOptions: RecognitionType[] = ["tu-module", "recognised", "external-conversion-note"];

const parseGrade = (value: string): GermanGrade | null => {
  return value ? (Number(value) as GermanGrade) : null;
};

const getLeafRequirements = (requirements: ProgramRequirement[]) => {
  const parentIds = new Set(requirements.map((requirement) => requirement.parentId).filter(Boolean));
  return requirements.filter(
    (requirement) =>
      requirement.unit === "cp" &&
      requirement.id !== "total-degree" &&
      !parentIds.has(requirement.id),
  );
};

export const ModuleSidePanel = ({
  selectedModule,
  selectedState,
  semesters,
  categories,
  requirements,
  currentSemesterId,
  filters,
  onFiltersChange,
  onUpdateStatus,
  onUpdateSemester,
  onUpdateGrade,
  onUpdateCountingRule,
  onUpdateGradingType,
  onUpdateAssignedBasket,
  onUpdateRecognitionApproved,
  onUpdateAssignmentStatus,
  onUpdateExamKind,
  onUpdateRecognitionType,
  onAddModule,
  onSelectModule,
  panelMode,
  onPanelModeChange,
  variant = "sidebar",
  onClose,
  defaultFiltersOpen = true,
}: ModuleSidePanelProps) => {
  const [filtersOpen, setFiltersOpen] = useState(defaultFiltersOpen);
  const leafRequirements = useMemo(() => getLeafRequirements(requirements), [requirements]);
  const [title, setTitle] = useState("");
  const [credits, setCredits] = useState("6");
  const [assignedBasketId, setAssignedBasketId] = useState(leafRequirements[0]?.id ?? "");
  const [typeLabel, setTypeLabel] = useState<ResolvedModule["typeLabel"]>("lecture");
  const [countingRule, setCountingRule] = useState<CountingRule>("auto");
  const [gradingType, setGradingType] = useState<GradingType>("graded");
  const [assignmentStatus, setAssignmentStatus] = useState<AssignmentStatus>("normal");
  const [examKind, setExamKind] = useState<ExamKind>("unknown");
  const [recognitionType, setRecognitionType] = useState<RecognitionType>("tu-module");
  const [recognitionApproved, setRecognitionApproved] = useState(false);
  const [semesterId, setSemesterId] = useState("");
  const [status, setStatus] = useState<ModuleStatus>("planned");
  const [grade, setGrade] = useState("");

  const effectiveAssignedBasketId = leafRequirements.some(
    (requirement) => requirement.id === assignedBasketId,
  )
    ? assignedBasketId
    : leafRequirements[0]?.id ?? "";

  const effectiveSemesterId = semesters.some((semester) => semester.id === semesterId)
    ? semesterId
    : currentSemesterId;

  const resetAddForm = () => {
    setTitle("");
    setCredits("6");
    setAssignedBasketId(leafRequirements[0]?.id ?? "");
    setTypeLabel("lecture");
    setCountingRule("auto");
    setGradingType("graded");
    setAssignmentStatus("normal");
    setExamKind("unknown");
    setRecognitionType("tu-module");
    setRecognitionApproved(false);
    setSemesterId("");
    setStatus("planned");
    setGrade("");
  };

  const handleCreateModule = () => {
    if (!title.trim() || !effectiveAssignedBasketId || Number(credits) <= 0) {
      return;
    }

    const moduleId = onAddModule({
      title: title.trim(),
      credits: Number(credits),
      assignedBasketId: effectiveAssignedBasketId,
      typeLabel,
      countingRule,
      gradingType,
      assignmentStatus,
      examKind,
      recognitionType,
      recognitionApproved,
      semesterId: effectiveSemesterId,
      status,
      grade: parseGrade(grade),
    });

    onSelectModule(moduleId);
    onPanelModeChange("details");
    resetAddForm();
  };

  return (
    <aside className={`flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 ${
      variant === "drawer" ? "rounded-l-3xl rounded-r-none border-r-0 shadow-2xl" : ""
    }`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Controls</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">Modules and filters</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
            {[
              { id: "details", label: "Details" },
              { id: "add", label: "Add module" },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onPanelModeChange(option.id as "details" | "add")}
                className={`rounded-xl px-3 py-1.5 text-xs transition ${
                  panelMode === option.id
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-slate-100"
            >
              Close
            </button>
          ) : null}
        </div>
      </div>

      <details
        className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900"
        open={filtersOpen}
        onToggle={(event) => setFiltersOpen(event.currentTarget.open)}
      >
        <summary className="cursor-pointer list-none text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Filters
        </summary>
        <div className="mt-3 grid gap-2">
          <select
            value={filters.categoryId}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                categoryId: event.target.value,
              })
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                status: event.target.value,
              })
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="">All statuses</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={filters.semesterId}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                semesterId: event.target.value,
              })
            }
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="">All semesters</option>
            {semesters.map((semester) => (
              <option key={semester.id} value={semester.id}>
                {semester.label}
              </option>
            ))}
          </select>
        </div>
      </details>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        {panelMode === "details" ? (
          selectedModule && selectedState ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">Selected Module</p>
                <h3 className="mt-2 break-words text-base font-semibold text-slate-900 dark:text-slate-100">
                  {selectedModule.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {selectedModule.credits} CP | {selectedModule.subcategoryLabel}
                </p>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Eligible baskets: {selectedModule.eligibleBasketIds.join(", ") || "not documented"}
                </p>
              </div>

              <label className="block text-sm text-slate-600 dark:text-slate-300">
                Assigned basket
                <select
                  value={selectedModule.assignedBasketId}
                  onChange={(event) => onUpdateAssignedBasket(selectedModule.id, event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {leafRequirements.map((requirement) => (
                    <option key={requirement.id} value={requirement.id}>
                      {requirement.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-slate-600 dark:text-slate-300">
                Status
                <select
                  value={selectedState.status}
                  onChange={(event) =>
                    onUpdateStatus(selectedModule.id, event.target.value as ModuleStatus)
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {statuses.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-slate-600 dark:text-slate-300">
                Semester
                <select
                  value={selectedState.semesterId}
                  onChange={(event) => onUpdateSemester(selectedModule.id, event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {semesters.map((semester) => (
                    <option key={semester.id} value={semester.id}>
                      {semester.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-slate-600 dark:text-slate-300">
                Strict counting mode
                <select
                  value={selectedModule.countingRule}
                  onChange={(event) =>
                    onUpdateCountingRule(selectedModule.id, event.target.value as CountingRule)
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {countingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-slate-600 dark:text-slate-300">
                Grading type
                <select
                  value={selectedModule.gradingType}
                  onChange={(event) =>
                    onUpdateGradingType(selectedModule.id, event.target.value as GradingType)
                  }
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="graded">graded</option>
                  <option value="pass-fail">pass/fail</option>
                </select>
              </label>

              <label className="block text-sm text-slate-600 dark:text-slate-300">
                Grade
                <select
                  value={selectedState.grade ?? ""}
                  onChange={(event) => onUpdateGrade(selectedModule.id, parseGrade(event.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="">No grade</option>
                  {validGermanGrades.map((item) => (
                    <option key={item} value={item}>
                      {item.toFixed(1)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm text-slate-600 dark:text-slate-300">
                  Recognition type
                  <select
                    value={selectedModule.recognitionType ?? "tu-module"}
                    onChange={(event) =>
                      onUpdateRecognitionType(selectedModule.id, event.target.value as RecognitionType)
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {recognitionOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm text-slate-600 dark:text-slate-300">
                  Recognition approved
                  <select
                    value={selectedModule.recognitionApproved ? "yes" : "no"}
                    onChange={(event) =>
                      onUpdateRecognitionApproved(selectedModule.id, event.target.value === "yes")
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="no">no</option>
                    <option value="yes">yes</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm text-slate-600 dark:text-slate-300">
                  Assignment status
                  <select
                    value={selectedModule.assignmentStatus ?? "normal"}
                    onChange={(event) =>
                      onUpdateAssignmentStatus(selectedModule.id, event.target.value as AssignmentStatus)
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {assignmentOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm text-slate-600 dark:text-slate-300">
                  Exam kind
                  <select
                    value={selectedModule.examKind ?? "unknown"}
                    onChange={(event) => onUpdateExamKind(selectedModule.id, event.target.value as ExamKind)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {examKindOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-48 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              Select a module card to edit its status, semester, grade, basket, and optimizer metadata.
            </div>
          )
        ) : (
          <div className="space-y-3">
            <label className="block text-sm text-slate-600 dark:text-slate-300">
              Module title
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </label>

            <label className="block text-sm text-slate-600 dark:text-slate-300">
              Credits
              <input
                type="number"
                min="1"
                step="1"
                value={credits}
                onChange={(event) => setCredits(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </label>

            <label className="block text-sm text-slate-600 dark:text-slate-300">
              Assigned basket
              <select
                value={effectiveAssignedBasketId}
                onChange={(event) => setAssignedBasketId(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {leafRequirements.map((requirement) => (
                  <option key={requirement.id} value={requirement.id}>
                    {requirement.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm text-slate-600 dark:text-slate-300">
              Type
              <select
                value={typeLabel}
                onChange={(event) => setTypeLabel(event.target.value as ResolvedModule["typeLabel"])}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {typeOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-slate-600 dark:text-slate-300">
                Semester
                <select
                  value={effectiveSemesterId}
                  onChange={(event) => setSemesterId(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {semesters.map((semester) => (
                    <option key={semester.id} value={semester.id}>
                      {semester.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-slate-600 dark:text-slate-300">
                Status
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as ModuleStatus)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {statuses.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-slate-600 dark:text-slate-300">
                Grading type
                <select
                  value={gradingType}
                  onChange={(event) => setGradingType(event.target.value as GradingType)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="graded">graded</option>
                  <option value="pass-fail">pass/fail</option>
                </select>
              </label>

              <label className="block text-sm text-slate-600 dark:text-slate-300">
                Grade
                <select
                  value={grade}
                  onChange={(event) => setGrade(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="">No grade</option>
                  {validGermanGrades.map((item) => (
                    <option key={item} value={item}>
                      {item.toFixed(1)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-sm text-slate-600 dark:text-slate-300">
              Strict counting mode
              <select
                value={countingRule}
                onChange={(event) => setCountingRule(event.target.value as CountingRule)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {countingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-slate-600 dark:text-slate-300">
                Recognition type
                <select
                  value={recognitionType}
                  onChange={(event) => setRecognitionType(event.target.value as RecognitionType)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {recognitionOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-slate-600 dark:text-slate-300">
                Recognition approved
                <select
                  value={recognitionApproved ? "yes" : "no"}
                  onChange={(event) => setRecognitionApproved(event.target.value === "yes")}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <option value="no">no</option>
                  <option value="yes">yes</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-slate-600 dark:text-slate-300">
                Assignment status
                <select
                  value={assignmentStatus}
                  onChange={(event) => setAssignmentStatus(event.target.value as AssignmentStatus)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {assignmentOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-slate-600 dark:text-slate-300">
                Exam kind
                <select
                  value={examKind}
                  onChange={(event) => setExamKind(event.target.value as ExamKind)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {examKindOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={handleCreateModule}
              className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Create module
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
