import * as React from "react";
import { cn } from "@/lib/utils";

export function Input(props: React.ComponentProps<"input">) {
  return <input {...props} className={cn("mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-ring", props.className)} />;
}
