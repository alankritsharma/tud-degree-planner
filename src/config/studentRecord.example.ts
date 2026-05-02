import { StudentAcademicRecord } from "@/types";

export const studentRecordExample: StudentAcademicRecord = {
  studentName: "Sample Student",
  programLabel: "M.Sc. Computer Science (2023), TU Darmstadt",
  specializationLabel: "Data Science and Engineering",
  completedCredits: 12,
  totalCredits: 120,
  currentGpa: 2.3,
  passedModules: [
    {
      id: "sample-software-engineering",
      title: "Sample Software Engineering",
      moduleCode: "20-00-9001",
      credits: 6,
      assignedBasketId: "basic-software-hardware",
      gradingType: "graded",
      status: "passed",
      grade: 2.0,
      semesterId: "winter-2024-25",
      typeLabel: "lecture",
    },
    {
      id: "sample-foundations-ml",
      title: "Sample Foundations of ML",
      moduleCode: "20-00-9002",
      credits: 6,
      assignedBasketId: "dse-foundations",
      gradingType: "graded",
      status: "passed",
      grade: 2.7,
      semesterId: "summer-2025",
      typeLabel: "lecture",
    },
  ],
  openModules: [
    {
      id: "sample-vision",
      title: "Sample Vision Module",
      moduleCode: "20-00-9003",
      assignedBasketId: "dse-applications",
      gradingType: "graded",
      status: "incomplete",
      semesterId: "winter-2025-26",
      typeLabel: "lecture",
    },
  ],
};
