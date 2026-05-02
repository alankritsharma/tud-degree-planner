import Link from "next/link";
import { ReactNode } from "react";
import { RequirementsSummarySidebar } from "@/components/RequirementsSummarySidebar";
import { RequirementProgress } from "@/types";

type AppShellProps = {
  children: ReactNode;
  activePath: "/" | "/semester-board";
  summary: {
    programLabel: string;
    specializationLabel: string;
    passedCredits: number;
    totalCredits: number;
    remainingCredits: number;
    totalRequirement: RequirementProgress;
    creditRequirements: RequirementProgress[];
    countRequirements: RequirementProgress[];
  };
};

const links = [
  { href: "/" as const, label: "Dashboard" },
  { href: "/semester-board" as const, label: "Semester Board" },
];

export const AppShell = ({ children, activePath, summary }: AppShellProps) => {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_360px] lg:px-6">
        <div>
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">MasterMap</p>
              <h1 className="text-xl font-semibold text-slate-900">
                TU Darmstadt Master&apos;s Progress Tracker
              </h1>
            </div>
            <nav className="flex rounded-lg bg-slate-100 p-1">
              {links.map((link) => {
                const isActive = link.href === activePath;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-md px-3 py-1.5 text-sm transition ${
                      isActive
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </header>
          {children}
        </div>

        <RequirementsSummarySidebar {...summary} />
      </div>
    </div>
  );
};
