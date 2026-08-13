import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

type ButtonVariant = "primary" | "accent" | "outline" | "ghost" | "danger" | "subtle";
type ButtonSize = "sm" | "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark shadow-sm",
  accent: "bg-accent text-white hover:brightness-95 shadow-sm",
  outline: "border border-border bg-surface text-foreground hover:bg-slate-50",
  ghost: "text-brand hover:bg-brand-soft/60",
  danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50",
  subtle: "bg-slate-100 text-slate-700 hover:bg-slate-200",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

/**
 * Interaction affordances shared by every clickable control.
 *
 * `cursor-pointer` is not automatic: Tailwind's Preflight doesn't add it and
 * browsers default <button> to an arrow, so without this every button in the app
 * reads as non-interactive on desktop. `focus-visible` gives keyboard users the
 * ring that inputs already had, and `active:scale` gives touch users feedback
 * before the (server) action completes — `hover:` does nothing on a phone.
 */
export const interactive =
  "cursor-pointer transition-[color,background-color,border-color,box-shadow,transform] duration-150 " +
  "outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
  "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100";

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      // Default to type="button". The HTML default is "submit", which made any
      // Button inside a form submit it accidentally.
      type={type}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold",
        interactive,
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    />
  );
}

/**
 * A link styled as a button.
 *
 * Exists because `<Link><Button/></Link>` puts a <button> inside an <a>, which
 * is invalid HTML and breaks keyboard activation. Use this for navigation and
 * keep `Button` for actions.
 */
export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <a
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold no-underline",
        interactive,
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    />
  );
}

/** Inline busy indicator. Replaces the bare "…" that collapsed button widths. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent align-[-0.125em]",
        className,
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Card / surfaces
// ---------------------------------------------------------------------------

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge / chip
// ---------------------------------------------------------------------------

type BadgeTone = "brand" | "green" | "amber" | "slate" | "red";

const badgeTones: Record<BadgeTone, string> = {
  brand: "bg-brand-soft text-brand-dark",
  green: "bg-green-100 text-green-700",
  amber: "bg-amber-100 text-amber-700",
  slate: "bg-slate-100 text-slate-600",
  red: "bg-red-100 text-red-700",
};

export function Badge({
  tone = "slate",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Chip({
  active,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      // aria-pressed makes the toggle state audible; min-h-11 meets the 44px
      // touch target these previously missed at ~34px.
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium",
        interactive,
        active
          ? "border-brand bg-brand text-white"
          : "border-border bg-surface text-slate-600 hover:border-brand/50 hover:bg-slate-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

export function Avatar({
  name,
  photo,
  size = 48,
}: {
  name: string;
  photo?: string | null;
  size?: number;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (photo) {
    // Firebase Storage URLs are remote and user-supplied; plain <img> avoids
    // configuring next/image remotePatterns for every bucket.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-brand-soft font-bold text-brand-dark"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials || "?"}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form primitives
// ---------------------------------------------------------------------------

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

const inputBase =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-slate-400";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputBase, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(inputBase, "min-h-24 resize-y", className)} {...props} />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  // `appearance-none` strips the native chevron, so one has to be drawn back in
  // — without it every dropdown in the app looked like a plain text input.
  return (
    <div className="relative">
      <select
        className={cn(inputBase, "cursor-pointer appearance-none pr-9", className)}
        {...props}
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      >
        <path
          d="M6 8l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

export function PageTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
    </div>
  );
}

/**
 * A titled block. Replaces four near-identical copies that had drifted across
 * the employer job page, admin verifications, JobForm and OnboardingForm.
 */
export function Section({
  title,
  action,
  className,
  children,
}: {
  title: string;
  /** Optional control rendered opposite the title (e.g. a "See all" link). */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={className}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({
  icon = "🌴",
  title,
  hint,
  action,
}: {
  icon?: string;
  title: string;
  hint?: string;
  /** Optional CTA — an empty state that offers a next step beats a dead end. */
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-10 text-center">
      <div aria-hidden="true" className="text-3xl">
        {icon}
      </div>
      <p className="mt-2 font-semibold text-slate-700">{title}</p>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
