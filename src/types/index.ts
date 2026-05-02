export type ModuleStatus =
  | "planned"
  | "registered"
  | "ongoing"
  | "incomplete"
  | "passed"
  | "failed"
  | "withdrawn"
  | "recognised"
  | "extra";

export type GermanGrade =
  | 1.0
  | 1.3
  | 1.7
  | 2.0
  | 2.3
  | 2.7
  | 3.0
  | 3.3
  | 3.7
  | 4.0
  | 5.0;

export type GradingType = "graded" | "pass-fail";

export type ModuleTypeLabel =
  | "lecture"
  | "seminar"
  | "lab"
  | "project lab"
  | "practical lab"
  | "general education"
  | "research paper"
  | "thesis";

export type CountingRule = "auto" | "counted" | "not-counted";

export type AssignmentStatus = "normal" | "requested" | "approved" | "needs-approval";

export type ExamKind = "technical-exam" | "study-exam" | "unknown";

export type RecognitionType = "tu-module" | "recognised" | "external-conversion-note";

export type RequirementStatus =
  | "not-started"
  | "in-progress"
  | "satisfied"
  | "exceeded"
  | "invalid";

export type CategoryGroup = {
  id: string;
  label: string;
};

export type RequirementCategory = {
  id: string;
  label: string;
  groupId: string;
};

export type RequirementSubcategory = {
  id: string;
  label: string;
  categoryId: string;
};

export type Module = {
  id: string;
  title: string;
  credits: number;
  categoryGroupId: string;
  categoryId: string;
  subcategoryId: string;
  assignedBasketId: string;
  eligibleBasketIds: string[];
  typeLabel: ModuleTypeLabel;
  countingRule: CountingRule;
  gradingType: GradingType;
  assignmentStatus?: AssignmentStatus;
  examKind?: ExamKind;
  recognitionType?: RecognitionType;
  recognitionApproved?: boolean;
  workloadNote?: string;
};

export type Semester = {
  id: string;
  label: string;
  order: number;
};

export type UserModuleState = {
  moduleId: string;
  status: ModuleStatus;
  semesterId: string;
  grade?: GermanGrade | null;
  expectedGrade?: GermanGrade | null;
};

export type ProgramRequirement = {
  id: string;
  label: string;
  unit: "cp" | "modules";
  min: number;
  max: number;
  parentId?: string;
  description?: string;
  requirementKind?: "degree" | "area" | "basket" | "thesis";
  apbCatalogueType?: "30-5" | "30-6";
  gradeSelectionScope?: boolean;
  minModules?: number;
  maxModules?: number;
};

export type ProgramRulesConfig = {
  programId: string;
  programLabel: string;
  specializationLabel: string;
  totalCredits: number;
  legalDisclaimer: string;
  categoryGroups: CategoryGroup[];
  categories: RequirementCategory[];
  subcategories: RequirementSubcategory[];
  requirements: ProgramRequirement[];
};

export type RecommendedPlanSemester = {
  id: string;
  label: string;
  suggestedCredits: number;
  focus: string;
  requirementIds: string[];
};

export type ResolvedModule = Module & {
  categoryGroupLabel: string;
  categoryLabel: string;
  subcategoryLabel: string;
  isCounted: boolean;
};

export type RequirementProgress = ProgramRequirement & {
  completed: number;
  counted: number;
  extra: number;
  planned: number;
  failed: number;
  passFailCounted: number;
  remaining: number;
  overflow: number;
  isSatisfied: boolean;
  status: RequirementStatus;
};

export type ModuleWithState = {
  module: ResolvedModule;
  state: UserModuleState;
};

export type OptimizerDecision =
  | "counted"
  | "extra"
  | "planned"
  | "failed"
  | "ignored"
  | "invalid";

export type OptimizationDecision = {
  moduleId: string;
  basketId?: string;
  decision: OptimizerDecision;
  cpCounts: boolean;
  gpaCounts: boolean;
  countedCredits: number;
  explanation: string;
};

export type RequirementOptimizationStats = {
  requirementId: string;
  countedCp: number;
  extraCp: number;
  plannedCp: number;
  failedCp: number;
  passFailCountedCp: number;
  missingCp: number;
  overflowCp: number;
  countedModuleIds: string[];
  extraModuleIds: string[];
  plannedModuleIds: string[];
  failedModuleIds: string[];
  status: RequirementStatus;
};

export type OptimizationWarning = {
  id: string;
  severity: "info" | "warning" | "danger";
  message: string;
  requirementId?: string;
  moduleId?: string;
};

export type OptimizationResult = {
  mode: "strict";
  hasValidFullPlan: boolean;
  countedModuleIds: string[];
  extraModuleIds: string[];
  plannedModuleIds: string[];
  failedModuleIds: string[];
  countedCredits: number;
  countedGradedCredits: number;
  extraCredits: number;
  plannedCredits: number;
  failedCredits: number;
  missingCredits: number;
  overflowCredits: number;
  gpa: number | null;
  gpaText: string | null;
  decisionsByModuleId: Record<string, OptimizationDecision>;
  requirementStatsById: Record<string, RequirementOptimizationStats>;
  warnings: OptimizationWarning[];
};
