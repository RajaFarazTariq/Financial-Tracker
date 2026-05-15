import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]",
        secondary: "border-transparent bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]",
        outline: "border-[hsl(var(--border))] text-[hsl(var(--foreground))]",
        success: "border-transparent bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]",
        warning: "border-transparent bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]",
        destructive: "border-transparent bg-[hsl(var(--destructive)/0.15)] text-[hsl(var(--destructive))]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
