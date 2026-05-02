import { Module, Semester, UserModuleState } from "@/types";
import { studentRecordExample } from "@/config/studentRecord.example";

export const seedActualPlanSemesters: Semester[] = [
  { id: "winter-2024-25", label: "Winter 2024/25", order: 1 },
  { id: "summer-2025", label: "Summer 2025", order: 2 },
  { id: "winter-2025-26", label: "Winter 2025/26", order: 3 },
  { id: "summer-2026", label: "Summer 2026", order: 4 },
];

const loadStudentRecord = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const localModule = require(/* turbopackOptional: true */ "@/config/studentRecord.local");
    if (localModule?.studentRecordLocal) {
      return localModule.studentRecordLocal;
    }
  } catch {
    // Fallback to safe public example data when local private file is absent.
  }

  return studentRecordExample;
};

const studentRecord = loadStudentRecord();
const allStudentModules = [...studentRecord.passedModules, ...studentRecord.openModules];

export const seedModules: Module[] = allStudentModules.map((record) => ({
  id: record.id,
  title: record.title,
  moduleCode: record.moduleCode,
  credits: record.credits ?? 0,
  categoryGroupId: "",
  categoryId: "",
  subcategoryId: record.assignedBasketId,
  assignedBasketId: record.assignedBasketId,
  eligibleBasketIds: record.eligibleBasketIds ?? [record.assignedBasketId],
  typeLabel: record.typeLabel ?? "lecture",
  countingRule: "auto",
  gradingType: record.gradingType,
  assignmentStatus: "normal",
  examKind: "unknown",
  recognitionType: "tu-module",
  recognitionApproved: false,
  workloadNote: record.credits ? "" : "CP not provided in the Phase 1 input.",
}));

export const seedUserModuleStates: UserModuleState[] = allStudentModules.map((record) => ({
  moduleId: record.id,
  status: record.status,
  semesterId: record.semesterId ?? "winter-2025-26",
  grade: record.grade ?? null,
  expectedGrade: null,
}));

export const legacySampleModuleIds = new Set<string>();
