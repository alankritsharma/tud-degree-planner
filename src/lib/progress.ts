import {
  GermanGrade,
  Module,
  OptimizationDecision,
  OptimizationResult,
  OptimizationWarning,
  ProgramRequirement,
  RequirementOptimizationStats,
  RequirementProgress,
  RequirementStatus,
  UserModuleState,
} from "@/types";
import { formatOverallGrade, getOverallGradeText, isPassingGrade, isValidGermanGrade } from "@/lib/grades";

type RequirementMaps = {
  requirementById: Record<string, ProgramRequirement>;
  childrenByParentId: Record<string, string[]>;
};

type PlanState = {
  cp: number;
  gradedCp: number;
  weightedTotal: number;
  moduleIds: string[];
};

const ROOT_REQUIREMENT_ID = "total-degree";

const buildRequirementMaps = (requirements: ProgramRequirement[]): RequirementMaps => {
  const requirementById = Object.fromEntries(
    requirements.map((requirement) => [requirement.id, requirement]),
  );
  const childrenByParentId = requirements.reduce<Record<string, string[]>>((acc, requirement) => {
    if (!requirement.parentId) {
      return acc;
    }

    acc[requirement.parentId] = [...(acc[requirement.parentId] ?? []), requirement.id];
    return acc;
  }, {});

  return {
    requirementById,
    childrenByParentId,
  };
};

const getDescendantIds = (
  requirementId: string,
  childrenByParentId: Record<string, string[]>,
): string[] => {
  const children = childrenByParentId[requirementId] ?? [];

  if (children.length === 0) {
    return [requirementId];
  }

  return [requirementId, ...children.flatMap((childId) => getDescendantIds(childId, childrenByParentId))];
};

const isLeafRequirement = (
  requirementId: string,
  childrenByParentId: Record<string, string[]>,
) => {
  return (childrenByParentId[requirementId] ?? []).length === 0;
};

const stateKey = (state: Pick<PlanState, "cp" | "gradedCp">) => {
  return `${state.cp}:${state.gradedCp}`;
};

const getStateGpa = (state: PlanState) => {
  if (state.gradedCp === 0) {
    return null;
  }

  return state.weightedTotal / state.gradedCp;
};

const isCleanerTie = (candidate: PlanState, current: PlanState) => {
  return candidate.moduleIds.length < current.moduleIds.length;
};

const chooseBetterForSameShape = (current: PlanState | undefined, candidate: PlanState) => {
  if (!current) {
    return candidate;
  }

  if (candidate.weightedTotal < current.weightedTotal - Number.EPSILON) {
    return candidate;
  }

  if (Math.abs(candidate.weightedTotal - current.weightedTotal) <= Number.EPSILON) {
    return isCleanerTie(candidate, current) ? candidate : current;
  }

  return current;
};

const compareByGpa = (left: PlanState, right: PlanState) => {
  const leftGpa = getStateGpa(left);
  const rightGpa = getStateGpa(right);

  if (leftGpa === null && rightGpa === null) {
    return left.moduleIds.length - right.moduleIds.length;
  }

  if (leftGpa === null) {
    return 1;
  }

  if (rightGpa === null) {
    return -1;
  }

  if (Math.abs(leftGpa - rightGpa) > Number.EPSILON) {
    return leftGpa - rightGpa;
  }

  return left.moduleIds.length - right.moduleIds.length;
};

const getModuleGradeImpact = (module: Module, state: UserModuleState) => {
  if (module.gradingType === "pass-fail") {
    return {
      gradedCp: 0,
      weightedTotal: 0,
    };
  }

  if (!isValidGermanGrade(state.grade) || !isPassingGrade(state.grade)) {
    return {
      gradedCp: 0,
      weightedTotal: 0,
    };
  }

  return {
    gradedCp: module.credits,
    weightedTotal: module.credits * state.grade,
  };
};

const isCompletedForOptimization = (module: Module, state?: UserModuleState) => {
  if (!state) {
    return false;
  }

  const recognitionBlocked =
    module.recognitionType &&
    module.recognitionType !== "tu-module" &&
    module.recognitionApproved !== true;

  if (recognitionBlocked) {
    return false;
  }

  return state.status === "passed" || state.status === "recognised";
};

const isPlannedLike = (state?: UserModuleState) => {
  return (
    state?.status === "planned" ||
    state?.status === "registered" ||
    state?.status === "ongoing" ||
    state?.status === "incomplete"
  );
};

const hasValidStrictAssignment = (module: Module) => {
  return (
    module.eligibleBasketIds.length === 0 ||
    module.eligibleBasketIds.includes(module.assignedBasketId)
  );
};

const isOfficialCandidate = (module: Module, state?: UserModuleState) => {
  return (
    isCompletedForOptimization(module, state) &&
    state?.status !== "extra" &&
    module.countingRule !== "not-counted" &&
    hasValidStrictAssignment(module)
  );
};

const getCandidateModulesByBasket = (modules: Module[], states: UserModuleState[]) => {
  const stateByModuleId = Object.fromEntries(states.map((state) => [state.moduleId, state]));

  return modules.reduce<Record<string, Module[]>>((acc, module) => {
    const state = stateByModuleId[module.id];

    if (!isOfficialCandidate(module, state)) {
      return acc;
    }

    acc[module.assignedBasketId] = [...(acc[module.assignedBasketId] ?? []), module];
    return acc;
  }, {});
};

const buildLeafPlans = (
  requirement: ProgramRequirement,
  candidates: Module[],
  stateByModuleId: Record<string, UserModuleState>,
  enforceMin: boolean,
) => {
  const states = new Map<string, PlanState>();
  states.set("0:0", {
    cp: 0,
    gradedCp: 0,
    weightedTotal: 0,
    moduleIds: [],
  });

  candidates.forEach((module) => {
    const userState = stateByModuleId[module.id];
    if (!userState) {
      return;
    }

    const gradeImpact = getModuleGradeImpact(module, userState);
    const nextStates = new Map(states);

    states.forEach((state) => {
      const candidate: PlanState = {
        cp: state.cp + module.credits,
        gradedCp: state.gradedCp + gradeImpact.gradedCp,
        weightedTotal: state.weightedTotal + gradeImpact.weightedTotal,
        moduleIds: [...state.moduleIds, module.id],
      };

      if (candidate.cp > requirement.max) {
        return;
      }

      if (requirement.maxModules !== undefined && candidate.moduleIds.length > requirement.maxModules) {
        return;
      }

      const key = stateKey(candidate);
      nextStates.set(key, chooseBetterForSameShape(nextStates.get(key), candidate));
    });

    states.clear();
    nextStates.forEach((state, key) => states.set(key, state));
  });

  const minCp = enforceMin ? requirement.min : 0;
  const minModules = enforceMin ? requirement.minModules ?? 0 : 0;

  return [...states.values()].filter((state) => {
    if (state.cp < minCp || state.cp > requirement.max) {
      return false;
    }

    if (state.moduleIds.length < minModules) {
      return false;
    }

    if (requirement.maxModules !== undefined && state.moduleIds.length > requirement.maxModules) {
      return false;
    }

    return true;
  });
};

const combinePlanStates = (
  leftStates: PlanState[],
  rightStates: PlanState[],
  maxCp: number,
) => {
  const combined = new Map<string, PlanState>();

  leftStates.forEach((left) => {
    rightStates.forEach((right) => {
      const candidate: PlanState = {
        cp: left.cp + right.cp,
        gradedCp: left.gradedCp + right.gradedCp,
        weightedTotal: left.weightedTotal + right.weightedTotal,
        moduleIds: [...left.moduleIds, ...right.moduleIds],
      };

      if (candidate.cp > maxCp) {
        return;
      }

      const key = stateKey(candidate);
      combined.set(key, chooseBetterForSameShape(combined.get(key), candidate));
    });
  });

  return [...combined.values()];
};

const buildRequirementPlans = ({
  requirementId,
  maps,
  candidateModulesByBasket,
  stateByModuleId,
  enforceMin,
}: {
  requirementId: string;
  maps: RequirementMaps;
  candidateModulesByBasket: Record<string, Module[]>;
  stateByModuleId: Record<string, UserModuleState>;
  enforceMin: boolean;
}): PlanState[] => {
  const requirement = maps.requirementById[requirementId];
  if (!requirement) {
    return [];
  }

  if (isLeafRequirement(requirementId, maps.childrenByParentId)) {
    return buildLeafPlans(
      requirement,
      candidateModulesByBasket[requirementId] ?? [],
      stateByModuleId,
      enforceMin,
    );
  }

  const childStates = (maps.childrenByParentId[requirementId] ?? []).map((childId) =>
    buildRequirementPlans({
      requirementId: childId,
      maps,
      candidateModulesByBasket,
      stateByModuleId,
      enforceMin,
    }),
  );

  if (childStates.some((states) => states.length === 0)) {
    return [];
  }

  let combinedStates: PlanState[] = [
    {
      cp: 0,
      gradedCp: 0,
      weightedTotal: 0,
      moduleIds: [],
    },
  ];

  childStates.forEach((states) => {
    combinedStates = combinePlanStates(combinedStates, states, requirement.max);
  });

  const minCp = enforceMin ? requirement.min : 0;

  return combinedStates.filter((state) => state.cp >= minCp && state.cp <= requirement.max);
};

const selectBestFullPlan = (states: PlanState[]) => {
  if (states.length === 0) {
    return null;
  }

  return [...states].sort(compareByGpa)[0] ?? null;
};

const selectBestPartialPlan = (states: PlanState[]) => {
  if (states.length === 0) {
    return null;
  }

  return [...states].sort((left, right) => {
    if (left.cp !== right.cp) {
      return right.cp - left.cp;
    }

    return compareByGpa(left, right);
  })[0] ?? null;
};

const getRequirementStatus = ({
  countedCp,
  plannedCp,
  missingCp,
  overflowCp,
}: {
  countedCp: number;
  plannedCp: number;
  missingCp: number;
  overflowCp: number;
}): RequirementStatus => {
  if (overflowCp > 0) {
    return "exceeded";
  }

  if (missingCp === 0) {
    return "satisfied";
  }

  if (countedCp > 0 || plannedCp > 0) {
    return "in-progress";
  }

  return "not-started";
};

const makeDecision = (decision: OptimizationDecision) => decision;

const buildRequirementStats = ({
  requirements,
  modules,
  states,
  selectedModuleIds,
  maps,
}: {
  requirements: ProgramRequirement[];
  modules: Module[];
  states: UserModuleState[];
  selectedModuleIds: Set<string>;
  maps: RequirementMaps;
}) => {
  const stateByModuleId = Object.fromEntries(states.map((state) => [state.moduleId, state]));

  return Object.fromEntries(
    requirements.map((requirement) => {
      const descendantIds = new Set(getDescendantIds(requirement.id, maps.childrenByParentId));
      const descendantModules = modules.filter((module) => descendantIds.has(module.assignedBasketId));
      const countedModules = descendantModules.filter((module) => selectedModuleIds.has(module.id));
      const extraModules = descendantModules.filter((module) => {
        const state = stateByModuleId[module.id];
        return isCompletedForOptimization(module, state) && !selectedModuleIds.has(module.id);
      });
      const plannedModules = descendantModules.filter((module) => isPlannedLike(stateByModuleId[module.id]));
      const failedModules = descendantModules.filter(
        (module) => stateByModuleId[module.id]?.status === "failed",
      );
      const countedCp = countedModules.reduce((sum, module) => sum + module.credits, 0);
      const extraCp = extraModules.reduce((sum, module) => sum + module.credits, 0);
      const plannedCp = plannedModules.reduce((sum, module) => sum + module.credits, 0);
      const failedCp = failedModules.reduce((sum, module) => sum + module.credits, 0);
      const passFailCountedCp = countedModules
        .filter((module) => module.gradingType === "pass-fail")
        .reduce((sum, module) => sum + module.credits, 0);
      const missingCp = Math.max(requirement.min - countedCp, 0);
      const overflowCp = Math.max(countedCp + extraCp - requirement.max, 0);

      const stats: RequirementOptimizationStats = {
        requirementId: requirement.id,
        countedCp,
        extraCp,
        plannedCp,
        failedCp,
        passFailCountedCp,
        missingCp,
        overflowCp,
        countedModuleIds: countedModules.map((module) => module.id),
        extraModuleIds: extraModules.map((module) => module.id),
        plannedModuleIds: plannedModules.map((module) => module.id),
        failedModuleIds: failedModules.map((module) => module.id),
        status: getRequirementStatus({
          countedCp,
          plannedCp,
          missingCp,
          overflowCp,
        }),
      };

      return [requirement.id, stats];
    }),
  );
};

const buildDecisions = ({
  modules,
  states,
  selectedModuleIds,
  requirementById,
}: {
  modules: Module[];
  states: UserModuleState[];
  selectedModuleIds: Set<string>;
  requirementById: Record<string, ProgramRequirement>;
}) => {
  const stateByModuleId = Object.fromEntries(states.map((state) => [state.moduleId, state]));

  return Object.fromEntries(
    modules.map((module) => {
      const state = stateByModuleId[module.id];
      const basket = requirementById[module.assignedBasketId];

      if (!basket) {
        return [
          module.id,
          makeDecision({
            moduleId: module.id,
            basketId: module.assignedBasketId,
            decision: "invalid",
            cpCounts: false,
            gpaCounts: false,
            countedCredits: 0,
            explanation: "Invalid basket assignment. This course is not counted in strict mode.",
          }),
        ];
      }

      if (!hasValidStrictAssignment(module)) {
        return [
          module.id,
          makeDecision({
            moduleId: module.id,
            basketId: module.assignedBasketId,
            decision: "invalid",
            cpCounts: false,
            gpaCounts: false,
            countedCredits: 0,
            explanation:
              "Assigned basket is not listed as eligible. Strict mode will not count it until the assignment is corrected or approved.",
          }),
        ];
      }

      if (state?.status === "failed") {
        return [
          module.id,
          makeDecision({
            moduleId: module.id,
            basketId: module.assignedBasketId,
            decision: "failed",
            cpCounts: false,
            gpaCounts: false,
            countedCredits: 0,
            explanation: "Ignored because it is failed. It may still require retake or deselection handling.",
          }),
        ];
      }

      if (isPlannedLike(state)) {
        return [
          module.id,
          makeDecision({
            moduleId: module.id,
            basketId: module.assignedBasketId,
            decision: "planned",
            cpCounts: false,
            gpaCounts: false,
            countedCredits: 0,
            explanation: "Planned or registered. It is shown for planning but not counted as completed yet.",
          }),
        ];
      }

      const recognitionBlocked =
        module.recognitionType &&
        module.recognitionType !== "tu-module" &&
        module.recognitionApproved !== true;

      if (recognitionBlocked) {
        return [
          module.id,
          makeDecision({
            moduleId: module.id,
            basketId: module.assignedBasketId,
            decision: "ignored",
            cpCounts: false,
            gpaCounts: false,
            countedCredits: 0,
            explanation: "Recognition is not approved yet, so this module is ignored by the optimizer.",
          }),
        ];
      }

      if (state?.status === "withdrawn") {
        return [
          module.id,
          makeDecision({
            moduleId: module.id,
            basketId: module.assignedBasketId,
            decision: "ignored",
            cpCounts: false,
            gpaCounts: false,
            countedCredits: 0,
            explanation: "Withdrawn modules do not count toward CP or GPA.",
          }),
        ];
      }

      if (state?.status === "extra" || module.countingRule === "not-counted") {
        return [
          module.id,
          makeDecision({
            moduleId: module.id,
            basketId: module.assignedBasketId,
            decision: "extra",
            cpCounts: false,
            gpaCounts: false,
            countedCredits: 0,
            explanation: "Marked outside the official degree calculation.",
          }),
        ];
      }

      if (selectedModuleIds.has(module.id)) {
        const gpaCounts =
          module.gradingType === "graded" &&
          isValidGermanGrade(state?.grade) &&
          isPassingGrade(state?.grade as GermanGrade);

        return [
          module.id,
          makeDecision({
            moduleId: module.id,
            basketId: module.assignedBasketId,
            decision: "counted",
            cpCounts: true,
            gpaCounts,
            countedCredits: module.credits,
            explanation: gpaCounts
              ? "Counts because it is part of the best strict-mode set for the current requirements."
              : "Counts for CP, but it is ignored for GPA because it is pass/fail or has no valid grade yet.",
          }),
        ];
      }

      return [
        module.id,
        makeDecision({
          moduleId: module.id,
          basketId: module.assignedBasketId,
          decision: "extra",
          cpCounts: false,
          gpaCounts: false,
          countedCredits: 0,
          explanation: "Extra because the optimizer found a better valid strict-mode counting set.",
        }),
      ];
    }),
  );
};

const buildWarnings = ({
  requirements,
  modules,
  states,
  optimization,
  statsById,
  requirementById,
}: {
  requirements: ProgramRequirement[];
  modules: Module[];
  states: UserModuleState[];
  optimization: Pick<OptimizationResult, "hasValidFullPlan">;
  statsById: Record<string, RequirementOptimizationStats>;
  requirementById: Record<string, ProgramRequirement>;
}) => {
  const warnings: OptimizationWarning[] = [];
  const stateByModuleId = Object.fromEntries(states.map((state) => [state.moduleId, state]));

  if (!optimization.hasValidFullPlan) {
    warnings.push({
      id: "no-valid-full-plan",
      severity: "info",
      message:
        "No complete 120 CP plan is valid yet. The counted set shows best current progress under strict assignments.",
    });
  }

  requirements.forEach((requirement) => {
    const stats = statsById[requirement.id];
    if (!stats) {
      return;
    }

    if (stats.missingCp > 0 && requirement.min > 0) {
      warnings.push({
        id: `missing-${requirement.id}`,
        severity: "warning",
        requirementId: requirement.id,
        message: `${requirement.label} is missing ${stats.missingCp} CP.`,
      });
    }

    if (stats.overflowCp > 0) {
      warnings.push({
        id: `overflow-${requirement.id}`,
        severity: "warning",
        requirementId: requirement.id,
        message: `${requirement.label} has ${stats.overflowCp} CP above the maximum. The excess is treated as extra.`,
      });
    }

    if (requirement.minModules && stats.countedModuleIds.length < requirement.minModules) {
      warnings.push({
        id: `missing-modules-${requirement.id}`,
        severity: "warning",
        requirementId: requirement.id,
        message: `${requirement.label} still needs at least ${requirement.minModules} module.`,
      });
    }
  });

  modules.forEach((module) => {
    const state = stateByModuleId[module.id];
    const basket = requirementById[module.assignedBasketId];

    if (!basket) {
      warnings.push({
        id: `invalid-basket-${module.id}`,
        severity: "danger",
        moduleId: module.id,
        message: `${module.title} is assigned to an unknown basket and cannot count.`,
      });
    }

    if (!hasValidStrictAssignment(module)) {
      warnings.push({
        id: `ineligible-assignment-${module.id}`,
        severity: "danger",
        moduleId: module.id,
        message: `${module.title} is assigned to a basket that is not listed as eligible.`,
      });
    }

    if (module.assignmentStatus === "needs-approval" || module.assignmentStatus === "requested") {
      warnings.push({
        id: `approval-${module.id}`,
        severity: "warning",
        moduleId: module.id,
        message: `${module.title} may need study office approval for its basket assignment.`,
      });
    }

    if (
      module.recognitionType &&
      module.recognitionType !== "tu-module" &&
      module.recognitionApproved !== true
    ) {
      warnings.push({
        id: `recognition-${module.id}`,
        severity: "warning",
        moduleId: module.id,
        message: `${module.title} is recognised/external but recognition is not approved yet.`,
      });
    }

    if (state?.status === "failed") {
      warnings.push({
        id: `failed-${module.id}`,
        severity: "warning",
        moduleId: module.id,
        message: `${module.title} is failed and ignored for CP/GPA, but may require retake or deselection handling.`,
      });
    }

    if (
      state &&
      isCompletedForOptimization(module, state) &&
      module.gradingType === "graded" &&
      !isValidGermanGrade(state.grade)
    ) {
      warnings.push({
        id: `missing-grade-${module.id}`,
        severity: "warning",
        moduleId: module.id,
        message: `${module.title} is graded and completed, but no valid German grade is entered.`,
      });
    }

    if (module.gradingType === "pass-fail" && statsById[module.assignedBasketId]?.countedModuleIds.includes(module.id)) {
      warnings.push({
        id: `pass-fail-${module.id}`,
        severity: "info",
        moduleId: module.id,
        message: `${module.title} counts for CP but is excluded from GPA because it is pass/fail.`,
      });
    }
  });

  return warnings;
};

export const getStrictOptimization = (
  requirements: ProgramRequirement[],
  modules: Module[],
  states: UserModuleState[],
  totalCredits: number,
): OptimizationResult => {
  const maps = buildRequirementMaps(requirements);
  const stateByModuleId = Object.fromEntries(states.map((state) => [state.moduleId, state]));
  const candidateModulesByBasket = getCandidateModulesByBasket(modules, states);

  const fullPlans = buildRequirementPlans({
    requirementId: ROOT_REQUIREMENT_ID,
    maps,
    candidateModulesByBasket,
    stateByModuleId,
    enforceMin: true,
  }).filter((state) => state.cp === totalCredits);
  const fullPlan = selectBestFullPlan(fullPlans);

  const partialPlans = fullPlan
    ? []
    : buildRequirementPlans({
        requirementId: ROOT_REQUIREMENT_ID,
        maps,
        candidateModulesByBasket,
        stateByModuleId,
        enforceMin: false,
      });
  const selectedPlan = fullPlan ?? selectBestPartialPlan(partialPlans);
  const selectedModuleIds = new Set(selectedPlan?.moduleIds ?? []);
  const statsById = buildRequirementStats({
    requirements,
    modules,
    states,
    selectedModuleIds,
    maps,
  });
  const decisionsByModuleId = buildDecisions({
    modules,
    states,
    selectedModuleIds,
    requirementById: maps.requirementById,
  });
  const gpa = selectedPlan ? formatOverallGrade(getStateGpa(selectedPlan)) : null;
  const extraModuleIds = Object.values(decisionsByModuleId)
    .filter((decision) => decision.decision === "extra")
    .map((decision) => decision.moduleId);
  const plannedModuleIds = Object.values(decisionsByModuleId)
    .filter((decision) => decision.decision === "planned")
    .map((decision) => decision.moduleId);
  const failedModuleIds = Object.values(decisionsByModuleId)
    .filter((decision) => decision.decision === "failed")
    .map((decision) => decision.moduleId);
  const countedCredits = statsById[ROOT_REQUIREMENT_ID]?.countedCp ?? 0;
  const extraCredits = extraModuleIds.reduce((sum, moduleId) => {
    return sum + (modules.find((module) => module.id === moduleId)?.credits ?? 0);
  }, 0);
  const plannedCredits = plannedModuleIds.reduce((sum, moduleId) => {
    return sum + (modules.find((module) => module.id === moduleId)?.credits ?? 0);
  }, 0);
  const failedCredits = failedModuleIds.reduce((sum, moduleId) => {
    return sum + (modules.find((module) => module.id === moduleId)?.credits ?? 0);
  }, 0);
  const countedGradedCredits = selectedPlan?.gradedCp ?? 0;
  const missingCredits = Math.max(totalCredits - countedCredits, 0);
  const overflowCredits = statsById[ROOT_REQUIREMENT_ID]?.overflowCp ?? 0;
  const hasValidFullPlan = Boolean(fullPlan);
  const warnings = buildWarnings({
    requirements,
    modules,
    states,
    optimization: { hasValidFullPlan },
    statsById,
    requirementById: maps.requirementById,
  });

  return {
    mode: "strict",
    hasValidFullPlan,
    countedModuleIds: [...selectedModuleIds],
    extraModuleIds,
    plannedModuleIds,
    failedModuleIds,
    countedCredits,
    countedGradedCredits,
    extraCredits,
    plannedCredits,
    failedCredits,
    missingCredits,
    overflowCredits,
    gpa,
    gpaText: getOverallGradeText(gpa),
    decisionsByModuleId,
    requirementStatsById: statsById,
    warnings,
  };
};

export const getRequirementProgress = (
  requirements: ProgramRequirement[],
  optimization: OptimizationResult,
): RequirementProgress[] => {
  return requirements.map((requirement) => {
    const stats = optimization.requirementStatsById[requirement.id];
    const counted = stats?.countedCp ?? 0;
    const extra = stats?.extraCp ?? 0;
    const planned = stats?.plannedCp ?? 0;
    const failed = stats?.failedCp ?? 0;
    const passFailCounted = stats?.passFailCountedCp ?? 0;
    const remaining = Math.max(requirement.min - counted, 0);
    const overflow = Math.max(counted + extra - requirement.max, 0);
    const status =
      stats?.status ??
      getRequirementStatus({
        countedCp: counted,
        plannedCp: planned,
        missingCp: remaining,
        overflowCp: overflow,
      });

    return {
      ...requirement,
      completed: counted,
      counted,
      extra,
      planned,
      failed,
      passFailCounted,
      remaining,
      overflow,
      isSatisfied: remaining === 0 && overflow === 0,
      status,
    };
  });
};
