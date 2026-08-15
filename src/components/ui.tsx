import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

type ButtonVariant = "primary" | "accent" | "outline" | "ghost" | "danger" | "subtle";
type ButtonSize = "sm" | "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark shadow-card",
  accent: "bg-accent text-white hover:brightness-95 shadow-card",
  outline:
    "border border-border bg-surface text-foreground hover:bg-surface-muted hover:border-border-strong",
  ghost: "text-brand hover:bg-brand-soft/60",
  danger: "border border-danger/25 bg-surface text-danger hover:bg-danger-soft",
  subtle: "bg-surface-muted text-subtle hover:bg-border",
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
        "inline-flex select-none items-center justify-center gap-2 rounded-control font-semibold",
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
  href,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-control font-semibold no-underline",
        interactive,
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    />
  );
}

/** An inline text link. Replaces the same class string copy-pasted at 4 sites. */
export function TextLink({
  className,
  href,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded font-semibold text-brand outline-none hover:text-brand-dark focus-visible:ring-2 focus-visible:ring-brand/40",
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
        "rounded-card border border-border bg-surface shadow-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * A titled card for long forms. Two byte-identical copies of this had drifted
 * into OnboardingForm and JobForm.
 */
export function SectionCard({
  title,
  hint,
  className,
  children,
}: {
  title: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-card border border-border bg-surface p-4 shadow-card sm:p-5",
        className,
      )}
    >
      <h2 className="type-heading">{title}</h2>
      {hint ? <p className="mt-0.5 text-sm text-muted">{hint}</p> : null}
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

/**
 * The bar that pins a form's primary action to the bottom of the viewport.
 * The same class string appeared verbatim in three forms.
 */
export function StickyActionBar({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 -mx-5 mt-4 border-t border-border bg-surface/95 px-5 py-3 backdrop-blur",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        className,
      )}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alert
// ---------------------------------------------------------------------------

type AlertTone = "info" | "success" | "warning" | "danger";

const alertTones: Record<AlertTone, string> = {
  info: "border-info/20 bg-info-soft text-info",
  success: "border-success/20 bg-success-soft text-success",
  warning: "border-warning/20 bg-warning-soft text-warning",
  danger: "border-danger/20 bg-danger-soft text-danger",
};

const alertIcons: Record<AlertTone, IconName> = {
  info: "info",
  success: "check",
  warning: "warning",
  danger: "error",
};

/**
 * Inline feedback. Replaces eight hand-rolled `bg-red-50 text-red-600` blocks
 * that had each picked their own padding, radius and shade.
 *
 * `danger` and `warning` announce themselves — an error a screen reader never
 * hears is an error the user never fixes.
 */
export function Alert({
  tone = "info",
  title,
  className,
  children,
}: {
  tone?: AlertTone;
  title?: string;
  className?: string;
  children?: ReactNode;
}) {
  const assertive = tone === "danger" || tone === "warning";
  return (
    <div
      role={assertive ? "alert" : "status"}
      aria-live={assertive ? "assertive" : "polite"}
      className={cn(
        "flex items-start gap-2.5 rounded-control border px-3.5 py-3 text-sm",
        alertTones[tone],
        className,
      )}
    >
      <Icon name={alertIcons[tone]} className="mt-0.5 h-4 w-4" />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && "mt-0.5")}>{children}</div> : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

/** A 0–100 meter. Was drawn inline in ProfileStrengthCard and MatchExplain. */
export function Progress({
  value,
  label,
  tone = "brand",
  className,
}: {
  value: number;
  /** Required unless the surrounding text already names the meter. */
  label?: string;
  tone?: "brand" | "success" | "warning";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const fill =
    tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-brand";
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-muted", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-300", fill)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail rows
// ---------------------------------------------------------------------------

/** A label/value row inside a `<dl>`. Was duplicated in both job detail pages. */
export function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/70 py-2 last:border-0">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge / chip
// ---------------------------------------------------------------------------

type BadgeTone = "brand" | "green" | "amber" | "slate" | "red";

const badgeTones: Record<BadgeTone, string> = {
  brand: "bg-brand-soft text-brand-dark",
  green: "bg-success-soft text-success",
  amber: "bg-warning-soft text-warning",
  slate: "bg-surface-muted text-subtle",
  red: "bg-danger-soft text-danger",
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
        "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium",
        interactive,
        active
          ? "border-brand bg-brand text-white"
          : "border-border bg-surface text-subtle hover:border-brand/50 hover:bg-surface-muted",
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
      <span className="mb-1.5 block text-sm font-semibold text-subtle">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

const inputBase =
  "w-full rounded-control border border-border bg-surface px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-muted/70";

/**
 * A labelled checkbox with a 44px touch target.
 *
 * Raw `<input type="checkbox">` was used at three sites, each with its own
 * spacing and none with a target big enough to hit on a phone.
 */
export function Checkbox({
  label,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: ReactNode }) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer select-none items-center gap-2.5 text-sm",
        className,
      )}
    >
      <input
        type="checkbox"
        className="h-4.5 w-4.5 shrink-0 cursor-pointer rounded accent-brand outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
        {...props}
      />
      {label}
    </label>
  );
}

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
      <Icon
        name="chevronDown"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

/**
 * The only way to render an h1 inside the app shell. Before this the same
 * heading rendered at three different sizes depending on the page.
 */
export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  /** Optional control aligned opposite the title (e.g. "Post a job"). */
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="type-title">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** `← Back to X`. Was hand-written at four sites with four different glyphs. */
export function BackLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-sm font-medium text-muted",
        "hover:text-foreground",
        interactive,
        className,
      )}
    >
      <Icon name="arrowLeft" className="h-4 w-4" />
      {children}
    </Link>
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
        <h2 className="type-eyebrow">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({
  icon = "compass",
  title,
  hint,
  action,
}: {
  icon?: IconName;
  title: string;
  hint?: string;
  /** A next step. An empty state without one is a dead end. */
  action?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-border-strong bg-surface/60 px-6 py-10 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-muted">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <p className="mt-3 font-semibold">{title}</p>
      {hint ? (
        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted">{hint}</p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
