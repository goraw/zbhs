import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const variants = cva(
  "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0 disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground shadow-sm shadow-secondary/20 hover:bg-secondary/85",
        destructive: "bg-destructive text-destructive-foreground shadow-sm shadow-destructive/20 hover:bg-destructive/90"
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs"
      }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
);

export function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<"button"> & VariantProps<typeof variants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(variants({ variant, size, className }))} {...props} />;
}
