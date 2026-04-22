import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
        success: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
        warning: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
        destructive: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
        info: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
        purple: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
        indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400",
        orange: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
        outline: "border border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300",
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
