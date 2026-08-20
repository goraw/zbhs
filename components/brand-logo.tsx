import { cn } from "@/lib/utils";

export function BrandLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary shadow-sm shadow-primary/20">
        <svg
          aria-hidden="true"
          className="h-8 w-8"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M24 5.5 39 11v11.5c0 9.1-5.9 16.5-15 20-9.1-3.5-15-10.9-15-20V11l15-5.5Z"
            fill="white"
            fillOpacity="0.96"
          />
          <path
            d="M24 10.2 34.8 14v8.4c0 6.3-3.9 11.8-10.8 15-6.9-3.2-10.8-8.7-10.8-15V14L24 10.2Z"
            fill="hsl(var(--primary))"
          />
          <path
            d="M15.8 24.3h4.8l3.2-7.2 4.7 13.8 3.1-6.6h4.6"
            stroke="hsl(var(--secondary))"
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M17.2 33.6c1.8 1.6 4.1 3 6.8 4.1 2.7-1.1 5-2.5 6.8-4.1"
            stroke="white"
            strokeOpacity="0.88"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-secondary" />
      </div>
      {!compact ? (
        <div className="min-w-0">
          <div className="text-lg font-bold tracking-normal text-primary">ZBHS</div>
          <div className="text-xs font-medium text-muted-foreground">Secure CBHS Logs</div>
        </div>
      ) : null}
    </div>
  );
}
