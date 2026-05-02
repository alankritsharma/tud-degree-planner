import { ModuleStatus } from "@/types";

type StatusBadgeProps = {
  status: ModuleStatus;
};

const statusClasses: Record<ModuleStatus, string> = {
  planned: "bg-slate-100 text-slate-700",
  registered: "bg-indigo-100 text-indigo-700",
  ongoing: "bg-sky-100 text-sky-700",
  incomplete: "bg-amber-100 text-amber-700",
  passed: "bg-emerald-100 text-emerald-700",
  failed: "bg-rose-100 text-rose-700",
  withdrawn: "bg-zinc-100 text-zinc-700",
  recognised: "bg-teal-100 text-teal-700",
  extra: "bg-violet-100 text-violet-700",
};

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClasses[status]}`}
    >
      {status}
    </span>
  );
};
