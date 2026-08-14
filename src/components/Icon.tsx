import { cn } from "@/lib/cn";

/**
 * The GoJob icon set.
 *
 * Inline SVG rather than emoji, for three reasons the codebase already
 * discovered the hard way:
 *
 *  1. Emoji render differently on every platform and some don't render at all —
 *     see the note in AuthForm about a lone regional indicator showing up as a
 *     hollow box on Windows and Android.
 *  2. Screen readers read them as content. Before this, a job card announced
 *     "round pushpin Canggu, money bag IDR 6 to 7 M per month".
 *  3. They can't take `currentColor`, so an emoji in a nav item stays full
 *     colour whether the item is active or not.
 *
 * Paths are 24×24 on a 1.75 stroke, drawn to sit optically level with 14–16px
 * text at `h-4 w-4`. Decorative by default (`aria-hidden`); pass a `title` when
 * the icon is the only label a control has.
 */

const PATHS = {
  // Navigation
  compass: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM15.5 8.5l-2 5-5 2 2-5 5-2Z",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.35-4.35",
  sparkle:
    "M12 3l1.9 4.9L19 9.8l-4.2 3 1 5.2-3.8-2.6L8.2 18l1-5.2-4.2-3 5.1-.9L12 3Z",
  chat: "M21 12a8 8 0 0 1-8 8H7l-4 3 1.2-4.4A8 8 0 1 1 21 12Z",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  users:
    "M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  briefcase:
    "M4 8h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1ZM9 8V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3M3 13h18",
  building:
    "M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 10h4a1 1 0 0 1 1 1v10M3 21h18M8 8h3M8 12h3M8 16h3",
  layers: "M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5M3 18l9 5 9-5",

  // Job / profile facts
  mapPin: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0ZM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  wallet:
    "M20 8V6a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6M16 13h2",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2",
  calendar:
    "M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1ZM8 3v4M16 3v4M4 10h16",
  checkBadge:
    "m9 12 2 2 4-4M12 3l2.2 1.7 2.7-.3 1 2.6 2.4 1.3-.7 2.7.7 2.7-2.4 1.3-1 2.6-2.7-.3L12 21l-2.2-1.7-2.7.3-1-2.6L3.7 15.7l.7-2.7-.7-2.7 2.4-1.3 1-2.6 2.7.3L12 3Z",
  star: "M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8L12 3.5Z",
  bookmark: "M6 4h12a1 1 0 0 1 1 1v16l-7-4-7 4V5a1 1 0 0 1 1-1Z",
  language:
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18",

  // Controls
  filter: "M4 5h16l-6.5 7.5V19l-3 2v-8.5L4 5Z",
  sort: "M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3",
  share: "M15 6l-3-3-3 3M12 3v13M6 12H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-1",
  send: "M21 3 3 10l7 3 3 7 8-17ZM10 13l4-4",
  plus: "M12 5v14M5 12h14",
  close: "M6 6l12 12M18 6 6 18",
  check: "m5 13 4.5 4.5L19 7",
  chevronDown: "m6 9 6 6 6-6",
  chevronRight: "m9 6 6 6-6 6",
  arrowLeft: "M19 12H5M11 6l-6 6 6 6",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  logout: "M15 17l5-5-5-5M20 12H9M12 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h6",
  upload: "M12 16V4M8 8l4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3",

  // Feedback
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 8h.01",
  warning: "M12 4 2.5 20h19L12 4ZM12 10v4M12 17h.01",
  error: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9 9l6 6M15 9l-6 6",
  inbox:
    "M4 13h4l1.5 3h5L16 13h4M4 13 6 5h12l2 8v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6Z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  className,
  title,
}: {
  name: IconName;
  className?: string;
  /** Supply only when the icon is the sole label of a control. */
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-5 w-5 shrink-0", className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
