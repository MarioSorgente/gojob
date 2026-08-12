import { cn } from "@/lib/cn";

export function Logo({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-xl";
  return (
    <span className={cn("font-extrabold tracking-tight", text, className)}>
      <span className="text-brand">Go</span>
      <span className="text-foreground">Job</span>
    </span>
  );
}
