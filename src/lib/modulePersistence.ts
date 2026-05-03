import { Module } from "@/types";
import { recoverModuleCodeFromSeed } from "@/lib/moduleCodeRecovery";

export type LegacyModule = Partial<Module> & {
  id: string;
  title: string;
  credits: number;
  requirementId?: string;
};

export const normalizeStoredModule = (
  module: LegacyModule,
  seedModules: Module[],
): Module => {
  const assignedBasketId =
    module.assignedBasketId ?? module.requirementId ?? module.subcategoryId ?? "basic-software-hardware";
  const recoveredModuleCode = recoverModuleCodeFromSeed(
    {
      id: module.id,
      title: module.title,
      assignedBasketId,
      credits: Number(module.credits) || 0,
      moduleCode: module.moduleCode,
    },
    seedModules,
  );

  return {
    id: module.id,
    title: module.title,
    moduleCode: recoveredModuleCode,
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

