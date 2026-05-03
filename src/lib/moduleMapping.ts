import { moduleHandbookCatalog, ModuleHandbookEntry } from "../config/moduleHandbook.catalog";
import { StudentAcademicRecord, StudentModuleRecord } from "../types";

export type ModuleMappingMatchType = "code" | "name" | "unmatched";

export type ModuleMappingConfidence = "high" | "medium" | "none";

export type StudentModuleHandbookMapping = {
  studentModule: StudentModuleRecord;
  handbookModule: ModuleHandbookEntry | null;
  matchType: ModuleMappingMatchType;
  confidence: ModuleMappingConfidence;
};

export type ModuleMappingSummary = {
  totalStudentModules: number;
  matchedByCode: number;
  matchedByName: number;
  unmatched: number;
  matchRate: number;
};

const normalizeForMatch = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const getStudentModules = (studentRecord: StudentAcademicRecord) => [
  ...studentRecord.passedModules,
  ...studentRecord.openModules,
];

export const findHandbookModuleForStudentModule = (
  studentModule: StudentModuleRecord,
  handbookCatalog: ModuleHandbookEntry[] = moduleHandbookCatalog,
): StudentModuleHandbookMapping => {
  const codeMatch = handbookCatalog.find((handbookModule) => handbookModule.moduleCode === studentModule.moduleCode);

  if (codeMatch) {
    return {
      studentModule,
      handbookModule: codeMatch,
      matchType: "code",
      confidence: "high",
    };
  }

  const normalizedStudentName = normalizeForMatch(studentModule.title);
  const nameMatch = handbookCatalog.find(
    (handbookModule) => normalizeForMatch(handbookModule.moduleName) === normalizedStudentName,
  );

  if (nameMatch) {
    return {
      studentModule,
      handbookModule: nameMatch,
      matchType: "name",
      confidence: "medium",
    };
  }

  return {
    studentModule,
    handbookModule: null,
    matchType: "unmatched",
    confidence: "none",
  };
};

export const mapStudentModulesToHandbook = (
  studentRecord: StudentAcademicRecord,
  handbookCatalog: ModuleHandbookEntry[],
) => getStudentModules(studentRecord).map((studentModule) => findHandbookModuleForStudentModule(studentModule, handbookCatalog));

export const getUnmatchedStudentModules = (mappingResult: StudentModuleHandbookMapping[]) =>
  mappingResult.filter((mapping) => mapping.matchType === "unmatched").map((mapping) => mapping.studentModule);

export const getMappingSummary = (mappingResult: StudentModuleHandbookMapping[]): ModuleMappingSummary => {
  const matchedByCode = mappingResult.filter((mapping) => mapping.matchType === "code").length;
  const matchedByName = mappingResult.filter((mapping) => mapping.matchType === "name").length;
  const unmatched = mappingResult.filter((mapping) => mapping.matchType === "unmatched").length;
  const matched = matchedByCode + matchedByName;
  const totalStudentModules = mappingResult.length;

  return {
    totalStudentModules,
    matchedByCode,
    matchedByName,
    unmatched,
    matchRate: totalStudentModules === 0 ? 0 : Number((matched / totalStudentModules).toFixed(2)),
  };
};
