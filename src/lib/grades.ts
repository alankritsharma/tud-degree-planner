import { GermanGrade } from "@/types";

export const validGermanGrades: GermanGrade[] = [
  1.0,
  1.3,
  1.7,
  2.0,
  2.3,
  2.7,
  3.0,
  3.3,
  3.7,
  4.0,
  5.0,
];

export const isValidGermanGrade = (value: number | null | undefined): value is GermanGrade => {
  return validGermanGrades.includes(value as GermanGrade);
};

export const convertRawModuleGrade = (rawGrade: number): GermanGrade => {
  if (rawGrade < 1.2) {
    return 1.0;
  }

  if (rawGrade < 1.6) {
    return 1.3;
  }

  if (rawGrade < 1.9) {
    return 1.7;
  }

  if (rawGrade < 2.2) {
    return 2.0;
  }

  if (rawGrade < 2.6) {
    return 2.3;
  }

  if (rawGrade < 2.9) {
    return 2.7;
  }

  if (rawGrade < 3.2) {
    return 3.0;
  }

  if (rawGrade < 3.6) {
    return 3.3;
  }

  if (rawGrade < 3.9) {
    return 3.7;
  }

  if (rawGrade < 4.1) {
    return 4.0;
  }

  return 5.0;
};

export const truncateDecimal = (value: number, decimals: number) => {
  const factor = 10 ** decimals;
  return Math.trunc(value * factor) / factor;
};

export const formatOverallGrade = (value: number | null) => {
  if (value === null) {
    return null;
  }

  return truncateDecimal(value, 2);
};

export const getOverallGradeText = (value: number | null) => {
  if (value === null) {
    return null;
  }

  if (value <= 1.59) {
    return "very good";
  }

  if (value <= 2.59) {
    return "good";
  }

  if (value <= 3.59) {
    return "satisfactory";
  }

  if (value <= 4.09) {
    return "sufficient";
  }

  return "insufficient";
};

export const isPassingGrade = (grade: GermanGrade | null | undefined) => {
  return typeof grade === "number" && grade <= 4.0;
};
