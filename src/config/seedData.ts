import { Module, Semester, UserModuleState } from "@/types";

export const seedActualPlanSemesters: Semester[] = [
  { id: "winter-2024-25", label: "Winter 2024/25", order: 1 },
  { id: "summer-2025", label: "Summer 2025", order: 2 },
  { id: "winter-2025-26", label: "Winter 2025/26", order: 3 },
  { id: "summer-2026", label: "Summer 2026", order: 4 },
];

export const seedModules: Module[] = [];

export const seedUserModuleStates: UserModuleState[] = [];

export const legacySampleModuleIds = new Set([
  "mod-hands-on-hci",
  "mod-dmml",
  "mod-sml",
  "mod-ethics-nlp",
  "mod-scalable-dms",
  "mod-advanced-dms",
  "mod-cv-1",
  "mod-nlp-web",
  "mod-dl-nlp",
  "mod-intro-llm",
  "mod-parallel-computing",
  "mod-german-basic-course-1",
  "mod-intro-entrepreneurship",
]);
