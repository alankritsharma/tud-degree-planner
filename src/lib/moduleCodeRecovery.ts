import { Module } from "@/types";

const normalizeForLookup = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const normalizeModuleCode = (moduleCode: string | undefined) => {
  const normalized = moduleCode?.trim();
  return normalized ? normalized : undefined;
};

const buildSeedIndexes = (seedModules: Module[]) => {
  const byId = new Map<string, Module>();
  const byTitle = new Map<string, Module[]>();

  for (const seedModule of seedModules) {
    byId.set(seedModule.id, seedModule);

    const titleKey = normalizeForLookup(seedModule.title);
    const current = byTitle.get(titleKey) ?? [];
    current.push(seedModule);
    byTitle.set(titleKey, current);
  }

  return { byId, byTitle };
};

export const recoverModuleCodeFromSeed = (
  module: Pick<Module, "id" | "title" | "assignedBasketId" | "credits" | "moduleCode">,
  seedModules: Module[],
) => {
  const existingCode = normalizeModuleCode(module.moduleCode);
  if (existingCode) {
    return existingCode;
  }

  const { byId, byTitle } = buildSeedIndexes(seedModules);
  const seedById = byId.get(module.id);
  const seedByIdCode = normalizeModuleCode(seedById?.moduleCode);
  if (seedByIdCode) {
    return seedByIdCode;
  }

  const titleMatches = (byTitle.get(normalizeForLookup(module.title)) ?? []).filter(
    (candidate) => normalizeModuleCode(candidate.moduleCode),
  );

  if (titleMatches.length === 1) {
    return normalizeModuleCode(titleMatches[0].moduleCode);
  }

  const basketMatches = titleMatches.filter(
    (candidate) => candidate.assignedBasketId === module.assignedBasketId,
  );

  if (basketMatches.length === 1) {
    return normalizeModuleCode(basketMatches[0].moduleCode);
  }

  const exactMatches = basketMatches.filter(
    (candidate) => candidate.credits === module.credits,
  );

  if (exactMatches.length === 1) {
    return normalizeModuleCode(exactMatches[0].moduleCode);
  }

  const titleAndCreditsMatches = titleMatches.filter(
    (candidate) => candidate.credits === module.credits,
  );

  if (titleAndCreditsMatches.length === 1) {
    return normalizeModuleCode(titleAndCreditsMatches[0].moduleCode);
  }

  return undefined;
};

