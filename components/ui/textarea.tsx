import * as React from "react";
import { cn } from "@/lib/utils";

export function Textarea(props: React.ComponentProps<"textarea">) {
  return <textarea {...props} className={cn("mt-1 min-h-28 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring", props.className)} />;
}
