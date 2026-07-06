import type { ReactNode } from "react";

// Presentational primitives implementing the five Clawnify signature moves
// (DESIGN-APPS.md): labeled zones + eyebrows, one coral action, engineered
// tabular numbers, chips vs badges, lucide line icons.

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
      {children}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-border bg-surface divide-y divide-border ${className}`}
    >
      {children}
    </div>
  );
}

export function Zone({
  eyebrow,
  action,
  children,
  className = "",
}: {
  eyebrow?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`p-5 ${className}`}>
      {(eyebrow || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : <span />}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

type Tone = "success" | "warning" | "danger";
const TONE: Record<Tone, string> = {
  success: "bg-success-tint text-success border-success/30",
  warning: "bg-warning-tint text-warning border-warning/30",
  danger: "bg-danger-tint text-danger border-danger/30",
};

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-normal ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-sm border border-border bg-sunken px-2 py-0.5 text-[0.6875rem] text-muted">
      {children}
    </span>
  );
}

export function Stat({
  value,
  label,
  meta,
}: {
  value: ReactNode;
  label: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <div className="tnum mt-1 text-2xl font-bold text-foreground">{value}</div>
      <div className="mt-0.5 h-4 text-[0.6875rem] text-muted">{meta}</div>
    </div>
  );
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover border border-transparent",
  secondary: "bg-surface text-foreground border border-border hover:bg-sunken",
  ghost: "text-muted hover:bg-sunken hover:text-foreground border border-transparent",
  danger: "bg-surface text-danger border border-border hover:bg-danger-tint",
};

export function Button({
  variant = "secondary",
  className = "",
  children,
  ...rest
}: {
  variant?: BtnVariant;
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-sm px-2 text-sm font-medium transition-colors disabled:opacity-50 ${BTN[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Empty({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center text-sm text-muted">
      <p>{children}</p>
      {action}
    </div>
  );
}

export function Toolbar({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-background/80 px-6 py-4 backdrop-blur">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
