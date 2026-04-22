import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
        success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
        warning: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
        destructive: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
        info: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
        purple: "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
        indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400",
        orange: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
        outline: "border border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
