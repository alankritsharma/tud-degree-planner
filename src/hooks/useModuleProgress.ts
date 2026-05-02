"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { programRules, recommendedPlan } from "@/config/programRules";
import {
  legacySampleModuleIds,
  seedActualPlanSemesters,
  seedModules,
  seedUserModuleStates,
} from "@/config/seedData";
import { getRequirementProgress, getStrictOptimization } from "@/lib/progress";
import {
  AssignmentStatus,
  CountingRule,
  ExamKind,
  GermanGrade,
  GradingType,
  Module,
  ModuleStatus,
  RecognitionType,
  ResolvedModule,
  Semester,
  UserModuleState,
} from "@/types";

const MODULES_STORAGE_KEY = "mastermap:modules";
const STATES_STORAGE_KEY = "mastermap:user-module-states";
const SEMESTERS_STORAGE_KEY = "mastermap:actual-plan-semesters";
const DATA_VERSION_KEY = "mastermap:data-version";
const DATA_VERSION = "2026-04-27-strict-optimizer-v1";

const normalizeSemesterId = (semesterId: string): string => {
  if (semesterId.startsWith("semester-")) {
    return semesterId;
  }

  const legacyMatch = /^s(\d+)$/.exec(semesterId);
  if (!legacyMatch) {
    return semesterId;
  }

  return `semester-${legacyMatch[1]}`;
};

const normalizeLegacySemesterId = (semesterId: string): string => {
  const legacyMap: Record<string, string> = {
    "semester-1": "winter-2024-25",
    "semester-2": "summer-2025",
    "semester-3": "winter-2025-26",
    "semester-4": "summer-2026",
  };
  const normalizedId = normalizeSemesterId(semesterId);
  return legacyMap[normalizedId] ?? normalizedId;
};

const parseStoredArray = <T,>(key: string): T[] => {
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

type LegacyModule = Partial<Module> & {
  id: string;
  title: string;
  credits: number;
  requirementId?: string;
};

const normalizeModule = (module: LegacyModule): Module => {
  const assignedBasketId =
    module.assignedBasketId ?? module.requirementId ?? module.subcategoryId ?? "basic-software-hardware";

  return {
    id: module.id,
    title: module.title,
    credits: Number(module.credits) || 0,
    categoryGroupId: module.categoryGroupId ?? "",
    categoryId: module.categoryId ?? "",
    subcategoryId: module.subcategoryId ?? assignedBasketId,
    assignedBasketId,
    eligibleBasketIds:
      module.eligibleBasketIds && module.eligibleBasketIds.length > 0
        ? module.eligibleBasketIds
        : [assignedBasketId],
    typeLabel: module.typeLabel ?? "lecture",
    countingRule: module.countingRule ?? "auto",
    gradingType: module.gradingType ?? "graded",
    assignmentStatus: module.assignmentStatus ?? "normal",
    examKind: module.examKind ?? "unknown",
    recognitionType: module.recognitionType ?? "tu-module",
    recognitionApproved: module.recognitionApproved ?? false,
    workloadNote: module.workloadNote ?? "",
  };
};

const normalizeState = (state: UserModuleState): UserModuleState => ({
  ...state,
  semesterId: normalizeLegacySemesterId(state.semesterId),
  grade: state.grade ?? null,
  expectedGrade: state.expectedGrade ?? null,
});

const mergeSemestersWithDefaults = (storedSemesters: Semester[]): Semester[] => {
  const defaultsById = Object.fromEntries(
    seedActualPlanSemesters.map((semester) => [semester.id, semester]),
  );
  const mergedDefaults = seedActualPlanSemesters.map((semester) => {
    const storedSemester = storedSemesters.find((item) => item.id === semester.id);
    return storedSemester ?? semester;
  });
  const extraSemesters = storedSemesters.filter((semester) => !defaultsById[semester.id]);

  return [...mergedDefaults, ...extraSemesters].sort((left, right) => left.order - right.order);
};

const getLeafRequirementIds = () => {
  const parentIds = new Set(programRules.requirements.map((requirement) => requirement.parentId).filter(Boolean));
  return programRules.requirements
    .filter((requirement) => requirement.unit === "cp" && !parentIds.has(requirement.id))
    .map((requirement) => requirement.id);
};

const formatModuleId = (title: string) => {
  return `module-${title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
};

export const useModuleProgress = () => {
  const [moduleList, setModuleList] = useState<Module[]>(seedModules);
  const [states, setStates] = useState<UserModuleState[]>(seedUserModuleStates);
  const [actualPlanSemesters, setActualPlanSemesters] = useState<Semester[]>(
    seedActualPlanSemesters,
  );

  const categoryGroupById = useMemo(() => {
    return Object.fromEntries(programRules.categoryGroups.map((group) => [group.id, group]));
  }, []);

  const categoryById = useMemo(() => {
    return Object.fromEntries(programRules.categories.map((category) => [category.id, category]));
  }, []);

  const subcategoryById = useMemo(() => {
    return Object.fromEntries(
      programRules.subcategories.map((subcategory) => [subcategory.id, subcategory]),
    );
  }, []);

  const requirementById = useMemo(() => {
    return Object.fromEntries(programRules.requirements.map((requirement) => [requirement.id, requirement]));
  }, []);

  const leafRequirementIds = useMemo(() => getLeafRequirementIds(), []);

  const getPlacementFromBasket = useCallback((assignedBasketId: string) => {
    const subcategory = subcategoryById[assignedBasketId];
    const category = subcategory ? categoryById[subcategory.categoryId] : undefined;
    const group = category ? categoryGroupById[category.groupId] : undefined;

    return {
      categoryGroupId: group?.id ?? "",
      categoryId: category?.id ?? "",
      subcategoryId: subcategory?.id ?? assignedBasketId,
    };
  }, [categoryById, categoryGroupById, subcategoryById]);

  useEffect(() => {
    const storedVersion = window.localStorage.getItem(DATA_VERSION_KEY);
    const storedModules = parseStoredArray<LegacyModule>(MODULES_STORAGE_KEY).map(normalizeModule);
    const storedStates = parseStoredArray<UserModuleState>(STATES_STORAGE_KEY).map(normalizeState);
    const storedSemesters = parseStoredArray<Semester>(SEMESTERS_STORAGE_KEY);
    const shouldDropLegacySamples =
      storedVersion !== DATA_VERSION && storedModules.some((module) => legacySampleModuleIds.has(module.id));
    const nextModules = shouldDropLegacySamples
      ? storedModules.filter((module) => !legacySampleModuleIds.has(module.id))
      : storedModules;
    const nextModuleIds = new Set(nextModules.map((module) => module.id));
    const nextStates = storedStates.filter((state) => nextModuleIds.has(state.moduleId));
    const nextSemesters = mergeSemestersWithDefaults(storedSemesters);

    window.localStorage.setItem(DATA_VERSION_KEY, DATA_VERSION);
    window.localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(nextModules));
    window.localStorage.setItem(STATES_STORAGE_KEY, JSON.stringify(nextStates));
    window.localStorage.setItem(SEMESTERS_STORAGE_KEY, JSON.stringify(nextSemesters));

    const frameId = window.requestAnimationFrame(() => {
      setModuleList(nextModules);
      setStates(nextStates);
      setActualPlanSemesters(nextSemesters);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const persistModules = (next: Module[]) => {
    setModuleList(next);
    window.localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(next));
  };

  const persistStates = (next: UserModuleState[]) => {
    setStates(next);
    window.localStorage.setItem(STATES_STORAGE_KEY, JSON.stringify(next));
  };

  const persistSemesters = (next: Semester[]) => {
    setActualPlanSemesters(next);
    window.localStorage.setItem(SEMESTERS_STORAGE_KEY, JSON.stringify(next));
  };

  const updateModule = (moduleId: string, updates: Partial<Module>) => {
    const next = moduleList.map((module) => {
      if (module.id !== moduleId) {
        return module;
      }

      const placement =
        updates.assignedBasketId && updates.assignedBasketId !== module.assignedBasketId
          ? getPlacementFromBasket(updates.assignedBasketId)
          : {};

      return {
        ...module,
        ...updates,
        ...placement,
      };
    });

    persistModules(next);
  };

  const updateModuleState = (
    moduleId: string,
    updates: Partial<Pick<UserModuleState, "status" | "semesterId" | "grade" | "expectedGrade">>,
  ) => {
    const existing = states.find((state) => state.moduleId === moduleId);
    const next = existing
      ? states.map((state) => {
          if (state.moduleId !== moduleId) {
            return state;
          }

          return {
            ...state,
            ...updates,
          };
        })
      : [
          ...states,
          {
            moduleId,
            status: updates.status ?? "planned",
            semesterId: updates.semesterId ?? actualPlanSemesters[0]?.id ?? "winter-2024-25",
            grade: updates.grade ?? null,
            expectedGrade: updates.expectedGrade ?? null,
          },
        ];

    persistStates(next);
  };

  const updateStatus = (moduleId: string, status: ModuleStatus) => {
    updateModuleState(moduleId, { status });
  };

  const updateSemester = (moduleId: string, semesterId: string) => {
    updateModuleState(moduleId, { semesterId });
  };

  const updateGrade = (moduleId: string, grade: GermanGrade | null) => {
    updateModuleState(moduleId, { grade });
  };

  const updateCountingRule = (moduleId: string, countingRule: CountingRule) => {
    updateModule(moduleId, { countingRule });
  };

  const updateGradingType = (moduleId: string, gradingType: GradingType) => {
    updateModule(moduleId, { gradingType });
  };

  const updateAssignedBasket = (moduleId: string, assignedBasketId: string) => {
    updateModule(moduleId, {
      assignedBasketId,
      eligibleBasketIds: [assignedBasketId],
    });
  };

  const updateRecognitionApproved = (moduleId: string, recognitionApproved: boolean) => {
    updateModule(moduleId, { recognitionApproved });
  };

  const updateAssignmentStatus = (moduleId: string, assignmentStatus: AssignmentStatus) => {
    updateModule(moduleId, { assignmentStatus });
  };

  const updateExamKind = (moduleId: string, examKind: ExamKind) => {
    updateModule(moduleId, { examKind });
  };

  const updateRecognitionType = (moduleId: string, recognitionType: RecognitionType) => {
    updateModule(moduleId, { recognitionType });
  };

  const addSemester = () => {
    const nextOrder =
      actualPlanSemesters.reduce((highest, semester) => Math.max(highest, semester.order), 0) + 1;
    const isWinter = nextOrder % 2 === 1;
    const nextYear = isWinter
      ? 2024 + Math.floor((nextOrder - 1) / 2)
      : 2024 + Math.floor(nextOrder / 2);
    const label = isWinter
      ? `Winter ${nextYear}/${String(nextYear + 1).slice(-2)}`
      : `Summer ${nextYear}`;
    const nextSemester = {
      id: `semester-${nextOrder}`,
      label,
      order: nextOrder,
    };

    persistSemesters([...actualPlanSemesters, nextSemester]);
  };

  const deleteSemester = (semesterId: string) => {
    if (seedActualPlanSemesters.some((semester) => semester.id === semesterId)) {
      return {
        ok: false,
        reason: "Default semesters cannot be deleted.",
      };
    }

    const semesterHasModules = states.some((state) => state.semesterId === semesterId);
    if (semesterHasModules) {
      return {
        ok: false,
        reason: "Move the modules out of this semester before deleting it.",
      };
    }

    const nextSemesters = actualPlanSemesters.filter((semester) => semester.id !== semesterId);
    persistSemesters(nextSemesters);

    return {
      ok: true,
      nextSemesterId: nextSemesters.at(-1)?.id ?? nextSemesters[0]?.id ?? null,
    };
  };

  const addModule = ({
    title,
    credits,
    assignedBasketId,
    typeLabel,
    countingRule,
    gradingType,
    assignmentStatus,
    examKind,
    recognitionType,
    recognitionApproved,
    semesterId,
    status,
    grade,
  }: {
    title: string;
    credits: number;
    assignedBasketId: string;
    typeLabel: Module["typeLabel"];
    countingRule: CountingRule;
    gradingType: GradingType;
    assignmentStatus: AssignmentStatus;
    examKind: ExamKind;
    recognitionType: RecognitionType;
    recognitionApproved: boolean;
    semesterId: string;
    status: ModuleStatus;
    grade: GermanGrade | null;
  }) => {
    const moduleId = formatModuleId(title);
    const placement = getPlacementFromBasket(assignedBasketId);
    const nextModule: Module = {
      id: moduleId,
      title,
      credits,
      ...placement,
      assignedBasketId,
      eligibleBasketIds: [assignedBasketId],
      typeLabel,
      countingRule,
      gradingType,
      assignmentStatus,
      examKind,
      recognitionType,
      recognitionApproved,
      workloadNote: "",
    };

    persistModules([...moduleList, nextModule]);
    persistStates([
      ...states,
      {
        moduleId,
        status,
        semesterId,
        grade,
        expectedGrade: null,
      },
    ]);

    return moduleId;
  };

  const stateByModuleId = useMemo(() => {
    return Object.fromEntries(states.map((state) => [state.moduleId, state]));
  }, [states]);

  const optimization = useMemo(() => {
    return getStrictOptimization(
      programRules.requirements,
      moduleList,
      states,
      programRules.totalCredits,
    );
  }, [moduleList, states]);

  const resolvedModules = useMemo<ResolvedModule[]>(() => {
    return moduleList.map((module) => {
      const placement = getPlacementFromBasket(module.assignedBasketId);
      const category = categoryById[module.categoryId || placement.categoryId];
      const categoryGroup = categoryGroupById[module.categoryGroupId || placement.categoryGroupId];
      const subcategory = subcategoryById[module.subcategoryId || placement.subcategoryId];
      const decision = optimization.decisionsByModuleId[module.id];

      return {
        ...module,
        categoryGroupId: module.categoryGroupId || placement.categoryGroupId,
        categoryId: module.categoryId || placement.categoryId,
        subcategoryId: module.subcategoryId || placement.subcategoryId,
        categoryGroupLabel: categoryGroup?.label ?? module.categoryGroupId,
        categoryLabel: category?.label ?? module.categoryId,
        subcategoryLabel: subcategory?.label ?? requirementById[module.assignedBasketId]?.label ?? module.assignedBasketId,
        isCounted: decision?.decision === "counted",
      };
    });
  }, [categoryById, categoryGroupById, getPlacementFromBasket, moduleList, optimization.decisionsByModuleId, requirementById, subcategoryById]);

  const semesterModules = useMemo(() => {
    return actualPlanSemesters.map((semester) => {
      const items = resolvedModules
        .map((module) => ({
          module,
          state:
            stateByModuleId[module.id] ??
            ({
              moduleId: module.id,
              status: "planned",
              semesterId: semester.id,
              grade: null,
              expectedGrade: null,
            } satisfies UserModuleState),
        }))
        .filter(({ state }) => state.semesterId === semester.id);

      return {
        semester,
        items,
      };
    });
  }, [actualPlanSemesters, resolvedModules, stateByModuleId]);

  const requirementProgress = useMemo(() => {
    return getRequirementProgress(programRules.requirements, optimization);
  }, [optimization]);

  const requirementProgressById = useMemo(() => {
    return Object.fromEntries(
      requirementProgress.map((requirement) => [requirement.id, requirement]),
    );
  }, [requirementProgress]);

  const visibleCreditRequirementIds = [
    "total-degree",
    "elective-specialization",
    "core-course-catalogues",
    "basic-software-hardware",
    "basic-theory",
    "specialization-dse",
    "dse-elective-area",
    "dse-foundations",
    "dse-data-systems",
    "dse-applications",
    "dse-practice-block",
    "dse-seminar",
    "dse-lab-project",
    "dse-practical-lab-teaching",
    "dse-research-paper",
    "studium-generale",
    "ge-languages",
    "ge-humanities-social-economics",
    "ge-environment-engineering-natural",
    "master-thesis",
  ];

  const visibleCreditRequirements = visibleCreditRequirementIds
    .map((requirementId) => requirementProgressById[requirementId])
    .filter(Boolean);
  const missingMinimumRequirements = visibleCreditRequirements.filter(
    (requirement) => requirement.remaining > 0,
  ).length;

  return {
    programRules,
    recommendedPlan,
    modules: resolvedModules,
    states,
    optimization,
    leafRequirementIds,
    actualPlan: {
      semesters: actualPlanSemesters,
      semesterModules,
      addSemester,
      deleteSemester,
    },
    officialProgress: {
      total: requirementProgressById["total-degree"],
      requirementById: requirementProgressById,
      visibleCreditRequirements,
      countRequirements: requirementProgress.filter(
        (requirement) => requirement.minModules || requirement.maxModules,
      ),
      missingMinimumRequirements,
    },
    metrics: {
      countedCredits: optimization.countedCredits,
      totalCredits: programRules.totalCredits,
      remainingCredits: optimization.missingCredits,
      extraCredits: optimization.extraCredits,
      plannedCredits: optimization.plannedCredits,
      failedCredits: optimization.failedCredits,
      gpa: optimization.gpa,
      gpaText: optimization.gpaText,
      missingMinimumRequirements,
      warnings: optimization.warnings.length,
    },
    updateModule,
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
  };
};
