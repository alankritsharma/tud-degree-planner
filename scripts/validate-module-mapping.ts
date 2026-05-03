import { moduleHandbookCatalog } from "../src/config/moduleHandbook.catalog";
import { studentRecordExample } from "../src/config/studentRecord.example";
import {
  getMappingSummary,
  getUnmatchedStudentModules,
  mapStudentModulesToHandbook,
} from "../src/lib/moduleMapping";

const mappingResult = mapStudentModulesToHandbook(studentRecordExample, moduleHandbookCatalog);
const summary = getMappingSummary(mappingResult);
const unmatchedModules = getUnmatchedStudentModules(mappingResult);

console.log("Module mapping validation");
console.log(JSON.stringify(summary, null, 2));

if (unmatchedModules.length > 0) {
  console.log("Unmatched modules");
  for (const studentModule of unmatchedModules) {
    console.log(`- ${studentModule.moduleCode}: ${studentModule.title}`);
  }
} else {
  console.log("Unmatched modules: none");
}
