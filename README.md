# MasterMap

MasterMap is a decision-support dashboard for planning the TU Darmstadt M.Sc. Computer Science with the Data Science and Engineering specialization.

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS

## Current Dashboard

- Single-screen academic dashboard at `/`
- Fixed-height workspace layout with internal panel scrolling
- Official requirement tree for the 120 CP programme
- Actual semester planner with drag-and-drop between semesters
- Strict-mode counted vs extra optimizer panel
- Module details and add-module drawer
- Local persistence with `localStorage` (no auth, no database)
- Legal/translation disclaimer visible in the app

## Data Model

- `programRules`: official requirement ranges, groups, baskets, APB catalogue types, and recommended 4-semester guideline
- `seedData`: empty manual-entry module data plus default semesters
- `modules`: `id`, `title`, `credits`, `assignedBasketId`, `eligibleBasketIds`, `typeLabel`, `countingRule`, `gradingType`, recognition and assignment metadata
- `actual plan semesters`: `id`, `label`, `order`
- `user module state`: `moduleId`, `status`, `semesterId`, `grade`, `expectedGrade`
- statuses: `planned`, `registered`, `ongoing`, `incomplete`, `passed`, `failed`, `withdrawn`, `recognised`, `extra`

## Features Included

- Top bar with semester selector, planner toggle, add semester, and add module actions
- KPI cards for counted CP, remaining CP, extra CP, and GPA
- Official structure panel with counted, planned, extra, missing, overflow, and pass/fail CP
- Strict optimizer that uses assigned baskets only and separates counted, extra, planned, and failed subjects
- German grade utilities for valid grade values, GPA truncation, and overall grade text
- Actual semester planner with draggable module cards
- Module details panel for status, semester, basket, grade, grading type, recognition approval, APB exam kind, and counting mode
- Add-module form with dropdown-driven strict basket inputs
- Filters by category, status, and semester

## Strict Mode Scope

- The optimizer uses `assignedBasketId` only.
- Courses with multiple possible baskets can be represented in the data model, but the app does not automatically move them yet.
- Recognition only counts when `recognitionApproved` is true.
- Voluntary/extra modules stay outside the official degree calculation unless used later in a what-if flow.
- No official course catalogue is bundled yet; subjects are manually entered.

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Project Structure (Key Files)

- `src/app/page.tsx` - Single-screen dashboard
- `src/config/programRules.ts` - Official TU Darmstadt structure + recommended plan
- `src/config/seedData.ts` - Empty manual module seed data + default semesters
- `src/hooks/useModuleProgress.ts` - Local state, persistence, optimizer wiring, and progress calculations
- `src/lib/grades.ts` - German grade validation, conversion helpers, and GPA text
- `src/lib/progress.ts` - Strict basket optimizer and requirement progress calculations
- `src/components/dashboard/*` - Top bar, KPI cards, official structure panel, planner, and side panel
- `src/components/SemesterColumn.tsx` - Semester drop target column
- `src/components/ModuleCard.tsx` - Draggable planner card
- `src/lib/progress.ts` - Requirement and GPA calculations
- `src/types/index.ts` - Core TypeScript types

## Notes

- No authentication and no backend in this version.
- Seed data is editable in `src/config/seedData.ts`.
- Progress data is stored in browser `localStorage` under `mastermap:user-module-states`.
- Actual plan semesters are stored in browser `localStorage` under `mastermap:actual-plan-semesters`.
- Module definitions are stored in browser `localStorage` under `mastermap:modules`.
