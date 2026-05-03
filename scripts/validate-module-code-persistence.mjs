import { createJiti } from "jiti";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const jiti = createJiti(import.meta.url, {
  alias: {
    "@/": `${repoRoot}/src/`,
  },
});

const { seedModules } = jiti(`${repoRoot}/src/config/seedData.ts`);
const { moduleHandbookCatalog } = jiti(`${repoRoot}/src/config/moduleHandbook.catalog.ts`);
const { normalizeStoredModule } = jiti(`${repoRoot}/src/lib/modulePersistence.ts`);

const handbookByCode = new Map(moduleHandbookCatalog.map((entry) => [entry.moduleCode, entry]));

const simulatedLegacyModules = seedModules.map((module) => ({
  ...module,
  moduleCode: undefined,
}));

const normalizedModules = simulatedLegacyModules.map((module) =>
  normalizeStoredModule(module, seedModules),
);

const matchedByCode = normalizedModules.filter(
  (module) => module.moduleCode && handbookByCode.has(module.moduleCode),
);

const unmatchedModules = normalizedModules.filter(
  (module) => !module.moduleCode || !handbookByCode.has(module.moduleCode),
);

const byCodeLookup = new Map(normalizedModules.map((module) => [module.moduleCode ?? "", module]));
const sampleCodes = ["20-00-0052", "20-00-1017"];

const sampleValidation = sampleCodes.map((moduleCode) => {
  const normalizedModule = byCodeLookup.get(moduleCode) ?? null;
  const handbookEntry = handbookByCode.get(moduleCode) ?? null;

  return {
    moduleCode,
    foundInNormalizedModules: Boolean(normalizedModule),
    foundInHandbook: Boolean(handbookEntry),
    title: normalizedModule?.title ?? null,
    language: handbookEntry?.language ?? null,
    moduleOwner: handbookEntry?.moduleOwner ?? null,
    workloadHours: handbookEntry?.workloadHours ?? null,
    selfStudyHours: handbookEntry?.selfStudyHours ?? null,
    sourcePages: handbookEntry?.sourcePages ?? [],
  };
});

console.log(
  JSON.stringify(
    {
      totalStudentModules: normalizedModules.length,
      modulesWithModuleCode: normalizedModules.filter((module) => Boolean(module.moduleCode)).length,
      matchedToHandbookByCode: matchedByCode.length,
      unmatchedModules: unmatchedModules.map((module) => ({
        moduleCode: module.moduleCode ?? null,
        moduleName: module.title,
      })),
      sampleValidation,
    },
    null,
    2,
  ),
);

