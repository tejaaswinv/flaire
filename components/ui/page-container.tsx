import { ReactNode } from "react";

interface PageContainerProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export default function PageContainer({
  title,
  subtitle,
  actions,
  children,
}: PageContainerProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="rounded-[28px] bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-800">{title}</h1>
            {subtitle ? <p className="mt-1 text-slate-500">{subtitle}</p> : null}
          </div>

          {actions ? <div>{actions}</div> : null}
        </div>

        {children}
      </div>
    </div>
  );
}