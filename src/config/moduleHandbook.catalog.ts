import rawModuleHandbook from "../../data/raw/module-handbook-pdfplumber.json";

export type ModuleHandbookSection =
  | "Software & Hardware"
  | "Theory"
  | "Foundations of Data Science"
  | "Data Systems Engineering"
  | "Data Science Applications"
  | "Seminars"
  | "Labs / Project Labs"
  | "General Education";

export type ModuleHandbookExtractionQuality = "clean" | "partially-cleaned" | "needs-review";

export type ModuleHandbookTextQuality = "clean" | "merged-prose" | "needs-review";

export type ModuleHandbookOccurrence = {
  section: ModuleHandbookSection;
  originalSection: string;
  sourcePages: number[];
};

export type ModuleHandbookEntry = {
  moduleCode: string;
  moduleName: string;
  section: ModuleHandbookSection;
  handbookSections: ModuleHandbookSection[];
  handbookOccurrences: ModuleHandbookOccurrence[];
  occurrenceCount: number;
  creditPoints: number | null;
  workloadHours: number | null;
  selfStudyHours: number | null;
  moduleDuration: string | null;
  moduleCycle: string | null;
  language: string | null;
  moduleOwner: string | null;
  sourcePages: number[];
  metadataStatus: string;
  extractionQuality: ModuleHandbookExtractionQuality;
  extractionWarnings: string[];
  textQuality: ModuleHandbookTextQuality;
  teachingContent: string[];
  learningObjectives: string;
  prerequisites: string;
  examForm: string;
  grading: string;
  usability: string[];
  references: string[];
  comment: string;
};

type RawModuleHandbookEntry = {
  moduleCode: string;
  moduleName: string;
  section: string | null;
  creditPoints: number | null;
  workloadHours: number | null;
  selfStudyHours: number | null;
  moduleDuration: string | null;
  moduleCycle: string | null;
  language: string | null;
  moduleOwner: string | null;
  sourcePages: number[];
  metadataStatus: string;
  extractionQuality: string;
  extractionWarnings?: string[];
  teachingContent?: string[];
  learningObjectives?: string;
  prerequisites?: string;
  examForm?: string;
  grading?: string;
  usability?: string[];
  references?: string[];
  comment?: string;
};

type ModuleHandbookSummary = {
  totalModules: number;
  totalUniqueModules: number;
  totalOccurrences: number;
  averageOccurrencesPerModule: number;
  rawSourceRows: number;
  missingModuleCodes: number;
  missingNames: number;
  missingCreditPoints: number;
  duplicateModuleCodes: number;
  duplicateSourceModuleCodes: number;
  sectionCounts: Record<ModuleHandbookSection, number>;
  mergedProseCount: number;
  cleanTextCount: number;
  needsReviewCount: number;
};

const handbookSectionOrder: ModuleHandbookSection[] = [
  "Software & Hardware",
  "Theory",
  "Foundations of Data Science",
  "Data Systems Engineering",
  "Data Science Applications",
  "Seminars",
  "Labs / Project Labs",
  "General Education",
];

const handbookSectionPriority = new Map(handbookSectionOrder.map((section, index) => [section, index]));

const moduleNameCorrections: Record<string, string> = {
  "20-00-0041": "Computer Graphics II",
  "20-00-0401": "Computer Vision II",
  "20-00-0531": "Teaching Lab: Formal Principles of Computer Science III",
  "20-00-0677": "Computer-aided Planning and Navigation in Medicine",
  "20-00-0954": "Practical Lab in Teaching-Computer Graphics II",
  "20-00-1011": "Statistical Relational Artificial Intelligence: Logic, Probability, and Computation",
  "20-00-1017": "Scalable Data Management Systems",
  "20-00-1034": "Deep Learning: Architectures & Methods",
  "20-00-1068": "Advanced C++ Modern Programming",
  "20-00-1075": "Distributed Geometry Processing",
  "20-00-1116": "Hands-On HCI",
  "20-00-1118": "Human and Identity-centric Machine Learning",
  "20-00-1168": "Intelligent Robotic Manipulation: Part II",
};

const mergedTextSignals = [
  "Thiscourse",
  "Afterthe",
  "ofthe",
  "andthe",
  "inthe",
  "forthe",
  "Programmingin",
  "Maybeused",
  "Courserelatedexam",
  "Passexam",
  "Topicsinclude",
  "Thefocus",
];

const rawEntries = rawModuleHandbook as RawModuleHandbookEntry[];

const isKnownSection = (value: string | null): value is ModuleHandbookSection =>
  handbookSectionPriority.has((value ?? "") as ModuleHandbookSection);

const normalizeModuleName = (entry: RawModuleHandbookEntry) =>
  moduleNameCorrections[entry.moduleCode] ?? entry.moduleName;

const getSectionPriority = (section: ModuleHandbookSection) => handbookSectionPriority.get(section) ?? Number.MAX_SAFE_INTEGER;

const getFirstPage = (entry: RawModuleHandbookEntry) => entry.sourcePages[0] ?? Number.MAX_SAFE_INTEGER;

const hasMergedTextLikely = (value: string) => {
  if (!value) {
    return false;
  }

  if (mergedTextSignals.some((signal) => value.includes(signal))) {
    return true;
  }

  if (/\b[A-Za-z]{20,}\b/.test(value)) {
    return true;
  }

  if (/\b[a-z]+[A-Z][A-Za-z]+\b/.test(value)) {
    return true;
  }

  return false;
};

const getTextQuality = (entry: RawModuleHandbookEntry): ModuleHandbookTextQuality => {
  const proseValues = [
    ...(entry.teachingContent ?? []),
    entry.learningObjectives ?? "",
    entry.prerequisites ?? "",
    entry.examForm ?? "",
    entry.grading ?? "",
    ...(entry.usability ?? []),
    ...(entry.references ?? []),
    entry.comment ?? "",
  ];

  if (proseValues.some((value) => hasMergedTextLikely(value))) {
    return "merged-prose";
  }

  return "clean";
};

const buildExtractionWarnings = (entries: RawModuleHandbookEntry[], normalizedNameChanged: boolean) => {
  const warnings = new Set<string>();
  const sourceWarnings = entries.flatMap((entry) => entry.extractionWarnings ?? []);

  if (entries.length > 1) {
    warnings.add("handbook-section-duplicates");
  }

  if (normalizedNameChanged) {
    warnings.add("module-name-normalized");
  }

  for (const warning of sourceWarnings) {
    if (warning === "module-code-recovered-from-global-search") {
      warnings.add(warning);
    }
  }

  return [...warnings];
};

const hasReliableFieldConflicts = (entries: RawModuleHandbookEntry[]) => {
  const compareField = <K extends keyof RawModuleHandbookEntry>(field: K) => {
    const values = new Set(entries.map((entry) => JSON.stringify(entry[field] ?? null)));
    return values.size > 1;
  };

  return (
    compareField("moduleName") ||
    compareField("creditPoints") ||
    compareField("workloadHours") ||
    compareField("selfStudyHours") ||
    compareField("moduleDuration") ||
    compareField("moduleCycle") ||
    compareField("language") ||
    compareField("moduleOwner")
  );
};

const groupedEntries = new Map<string, RawModuleHandbookEntry[]>();

for (const entry of rawEntries) {
  if (!entry.moduleCode || !entry.moduleName || !isKnownSection(entry.section)) {
    continue;
  }

  const current = groupedEntries.get(entry.moduleCode) ?? [];
  current.push(entry);
  groupedEntries.set(entry.moduleCode, current);
}

export const moduleHandbookCatalog: ModuleHandbookEntry[] = [...groupedEntries.entries()]
  .map(([moduleCode, entries]) => {
    const sortedEntries = [...entries].sort((left, right) => {
      const sectionDiff = getSectionPriority(left.section as ModuleHandbookSection) - getSectionPriority(right.section as ModuleHandbookSection);
      if (sectionDiff !== 0) {
        return sectionDiff;
      }

      return getFirstPage(left) - getFirstPage(right);
    });

    const canonical = sortedEntries[0];
    const handbookSections = [...new Set(sortedEntries.map((entry) => entry.section as ModuleHandbookSection))].sort(
      (left, right) => getSectionPriority(left) - getSectionPriority(right),
    );
    const handbookOccurrences = sortedEntries.map((entry) => ({
      section: entry.section as ModuleHandbookSection,
      originalSection: entry.section ?? "",
      sourcePages: entry.sourcePages,
    }));
    const normalizedName = normalizeModuleName(canonical);
    const normalizedNameChanged = normalizedName !== canonical.moduleName;
    const sourcePages = [...new Set(sortedEntries.flatMap((entry) => entry.sourcePages))].sort((left, right) => left - right);
    const extractionWarnings = buildExtractionWarnings(sortedEntries, normalizedNameChanged);
    const missingReliableField =
      !moduleCode ||
      !normalizedName ||
      !canonical.section ||
      canonical.creditPoints == null ||
      canonical.workloadHours == null ||
      canonical.selfStudyHours == null;
    const conflictingReliableFields = hasReliableFieldConflicts(sortedEntries);

    let extractionQuality: ModuleHandbookExtractionQuality = "clean";
    if (missingReliableField || conflictingReliableFields || !isKnownSection(canonical.section)) {
      extractionQuality = "needs-review";
    } else if (sortedEntries.length > 1 || normalizedNameChanged || canonical.extractionQuality !== "clean") {
      extractionQuality = "partially-cleaned";
    }

    const textQuality =
      missingReliableField || conflictingReliableFields
        ? "needs-review"
        : getTextQuality(canonical);

    return {
      moduleCode,
      moduleName: normalizedName,
      section: canonical.section as ModuleHandbookSection,
      handbookSections,
      handbookOccurrences,
      occurrenceCount: handbookOccurrences.length,
      creditPoints: canonical.creditPoints,
      workloadHours: canonical.workloadHours,
      selfStudyHours: canonical.selfStudyHours,
      moduleDuration: canonical.moduleDuration,
      moduleCycle: canonical.moduleCycle,
      language: canonical.language,
      moduleOwner: canonical.moduleOwner,
      sourcePages,
      metadataStatus: canonical.metadataStatus,
      extractionQuality,
      extractionWarnings,
      textQuality,
      teachingContent: canonical.teachingContent ?? [],
      learningObjectives: canonical.learningObjectives ?? "",
      prerequisites: canonical.prerequisites ?? "",
      examForm: canonical.examForm ?? "",
      grading: canonical.grading ?? "",
      usability: canonical.usability ?? [],
      references: canonical.references ?? [],
      comment: canonical.comment ?? "",
    } satisfies ModuleHandbookEntry;
  })
  .sort((left, right) => left.moduleCode.localeCompare(right.moduleCode));

const moduleHandbookByCode = new Map(moduleHandbookCatalog.map((module) => [module.moduleCode, module]));

const sectionCounts = handbookSectionOrder.reduce<Record<ModuleHandbookSection, number>>(
  (counts, section) => {
    counts[section] = moduleHandbookCatalog.filter((module) => module.section === section).length;
    return counts;
  },
  {
    "Software & Hardware": 0,
    Theory: 0,
    "Foundations of Data Science": 0,
    "Data Systems Engineering": 0,
    "Data Science Applications": 0,
    Seminars: 0,
    "Labs / Project Labs": 0,
    "General Education": 0,
  },
);

const duplicateSourceModuleCodes = [...groupedEntries.values()].filter((entries) => entries.length > 1).length;
const totalOccurrences = moduleHandbookCatalog.reduce((sum, module) => sum + module.occurrenceCount, 0);

export const moduleHandbookSummary: ModuleHandbookSummary = {
  totalModules: moduleHandbookCatalog.length,
  totalUniqueModules: moduleHandbookCatalog.length,
  totalOccurrences,
  averageOccurrencesPerModule:
    moduleHandbookCatalog.length === 0 ? 0 : Number((totalOccurrences / moduleHandbookCatalog.length).toFixed(2)),
  rawSourceRows: rawEntries.length,
  missingModuleCodes: moduleHandbookCatalog.filter((module) => !module.moduleCode).length,
  missingNames: moduleHandbookCatalog.filter((module) => !module.moduleName).length,
  missingCreditPoints: moduleHandbookCatalog.filter((module) => module.creditPoints == null).length,
  duplicateModuleCodes: moduleHandbookCatalog.length - new Set(moduleHandbookCatalog.map((module) => module.moduleCode)).size,
  duplicateSourceModuleCodes,
  sectionCounts,
  mergedProseCount: moduleHandbookCatalog.filter((module) => module.textQuality === "merged-prose").length,
  cleanTextCount: moduleHandbookCatalog.filter((module) => module.textQuality === "clean").length,
  needsReviewCount: moduleHandbookCatalog.filter((module) => module.textQuality === "needs-review").length,
};

export const getModuleByCode = (moduleCode: string) => moduleHandbookByCode.get(moduleCode);

export const getModulesBySection = (section: ModuleHandbookSection) =>
  moduleHandbookCatalog.filter(
    (module) => module.section === section || module.handbookSections.includes(section),
  );

export const searchModules = (query: string) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return moduleHandbookCatalog;
  }

  return moduleHandbookCatalog.filter((module) =>
    [
      module.moduleCode,
      module.moduleName,
      module.section,
      ...module.handbookSections,
      module.language ?? "",
      module.moduleOwner ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery),
  );
};

export const getModuleHandbookSummary = () => moduleHandbookSummary;
