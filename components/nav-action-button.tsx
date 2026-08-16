"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function NavActionButton({
  href,
  label,
  pendingLabel = "Opening...",
  emoji
}: {
  href: string;
  label: string;
  pendingLabel?: string;
  emoji?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    router.prefetch(href);
  }, [href, router]);

  return (
    <Button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => router.push(href))}
      className="shadow-sm shadow-primary/20"
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      <span aria-hidden="true">{emoji}</span>
      {isPending ? pendingLabel : label}
    </Button>
  );
}
