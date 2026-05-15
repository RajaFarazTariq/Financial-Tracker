import { Construction } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({ title, description }: { title?: string; description?: string }) {
  return (
    <div className="grid place-items-center py-20">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-xl bg-gradient-to-br from-[hsl(var(--primary)/0.18)] to-[hsl(var(--accent)/0.18)] text-[hsl(var(--primary))]">
            <Construction className="size-7" />
          </div>
          <h1 className="text-xl font-bold">{title ?? "Coming next"}</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {description ?? "The API is ready — this view will be built in the next iteration."}
          </p>
          <Button asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
