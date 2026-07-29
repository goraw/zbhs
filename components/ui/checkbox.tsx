"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Checkbox(props: CheckboxPrimitive.CheckboxProps) {
  return (
    <CheckboxPrimitive.Root {...props} className={cn("mt-0.5 flex h-5 w-5 items-center justify-center rounded border border-input bg-white", props.className)}>
      <CheckboxPrimitive.Indicator>
        <Check className="h-4 w-4 text-primary" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
