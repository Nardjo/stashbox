import { cn } from "~/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("archive-grid-surface animate-pulse rounded-sm bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
