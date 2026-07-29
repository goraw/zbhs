import * as React from "react";

export function Label(props: React.ComponentProps<"label">) {
  return <label {...props} className="text-sm font-medium" />;
}
