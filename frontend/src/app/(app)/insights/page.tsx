"use client";

import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Lightbulb, Loader2, ShieldCheck, Sparkles, TrendingUp, Zap } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, extractApiError } from "@/lib/api";

type Insights = {
  ai_powered: boolean;
  model?: string;
  summary: string;
  health_assessment: string;
  top_observations: string[];
  recommendations: { title: string; action: string }[];
};

export default function InsightsPage() {
  const mutation = useMutation({
    mutationFn: async (): Promise<Insights> => (await api.post<Insights>("/insights/")).data,
    onError: (err) => toast.error(extractApiError(err).message),
  });

  const insights = mutation.data;

  return (
    <div>
      <PageHeader
        title="AI insights"
        description="Personalized analysis of your spending, powered by Claude."
        actions={
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {mutation.isPending ? "Analyzing…" : insights ? "Regenerate" : "Generate insights"}
          </Button>
        }
      />

      {!insights && !mutation.isPending && (
        <Card>
          <CardContent className="grid place-items-center gap-3 p-16 text-center">
            <div className="grid size-14 place-items-center rounded-xl bg-gradient-to-br from-[hsl(var(--primary)/0.18)] to-[hsl(var(--accent)/0.18)] text-[hsl(var(--primary))]">
              <Sparkles className="size-7" />
            </div>
            <h2 className="text-lg font-semibold">Ready when you are.</h2>
            <p className="max-w-md text-sm text-[hsl(var(--muted-foreground))]">
              Click <strong>Generate insights</strong> to send your recent financial activity to Claude
              and get personalized observations and recommendations. No data is stored on Anthropic&apos;s
              side beyond a single API call.
            </p>
          </CardContent>
        </Card>
      )}

      {mutation.isPending && (
        <Card>
          <CardContent className="grid place-items-center gap-3 p-16 text-center">
            <Loader2 className="size-8 animate-spin text-[hsl(var(--primary))]" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Analyzing your recent transactions, goals, and bills…
            </p>
          </CardContent>
        </Card>
      )}

      {insights && (
        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card>
              <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-start sm:gap-6">
                <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[hsl(var(--primary)/0.18)] to-[hsl(var(--accent)/0.18)] text-[hsl(var(--primary))]">
                  <Zap className="size-6" />
                </div>
                <div className="flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">Summary</h2>
                    {insights.ai_powered ? (
                      <Badge variant="success">Claude {insights.model ?? "live"}</Badge>
                    ) : (
                      <Badge variant="warning">Static fallback</Badge>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed">{insights.summary}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-[hsl(var(--primary))]" /> Health assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                    {insights.health_assessment}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="size-4 text-[hsl(var(--primary))]" /> Top observations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {insights.top_observations.map((o, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[hsl(var(--primary))]" />
                        <span>{o}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="size-4 text-[hsl(var(--primary))]" /> Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {insights.recommendations.map((r, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] p-4"
                  >
                    <p className="font-semibold">{r.title}</p>
                    <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{r.action}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
}
