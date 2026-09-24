"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles } from "lucide-react";

type JevResponse = {
  mock?: boolean;
  answers: {
    category: { choice: string; confidence: number; probs?: Record<string, number> };
    isComplaint: { noul: number; confidence: number };
    paymentRelated: { noul: number; confidence: number };
    urgency: { score: number; confidence: number; level?: string };
  };
};

const EXAMPLES = [
  { label: "Leak (urgent maintenance)", text: "Water is leaking under my kitchen sink in ECO 2-2, it's getting worse. Please fix ASAP.", tenant: "CRISTALYN MONIS", property: "ECO", unit: "2-2" },
  { label: "Rent receipt", text: "I sent my rent receipt for GREEN B1 May — ₱5399 via GCash, please confirm.", tenant: "SHERYL BALLESTEROS NOBLEZA", property: "GREEN", unit: "B1" },
  { label: "Renewal", text: "When does my lease end? I want to renew for 6 more months in ADI #G.", tenant: "MARIO SABIO", property: "ADI", unit: "#G" },
];

export default function JevDemoClient() {
  const [tenantName, setTenantName] = useState("CRISTALYN MONIS");
  const [property, setProperty] = useState("ECO");
  const [unit, setUnit] = useState("2-2");
  const [message, setMessage] = useState(EXAMPLES[0].text);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<JevResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai/jev-triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantName, property, unit, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  function loadExample(idx: number) {
    const ex = EXAMPLES[idx];
    setTenantName(ex.tenant);
    setProperty(ex.property);
    setUnit(ex.unit);
    setMessage(ex.text);
  }

  const answers = result?.answers;
  // Code owns routing — example composition
  const route = answers
    ? answers.category.choice === "maintenance"
      ? answers.urgency.score >= 2
        ? "→ Route to URGENT maintenance (same-day)"
        : "→ Route to routine maintenance"
      : answers.category.choice === "payment"
        ? "→ Route to Payment Monitoring"
        : answers.category.choice === "lease"
          ? "→ Route to Tenants & Leases / Renewal"
          : "→ Route to general inbox"
    : null;

  const needsReview = answers ? answers.category.confidence < 0.75 || (answers.isComplaint.noul > 0.4 && answers.isComplaint.noul < 0.6) : false;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Try a tenant message
          </CardTitle>
          <CardDescription>
            Jev returns <code>Choice</code> (category), <code>Noul</code> (isComplaint, paymentRelated) and <code>Score</code> (urgency) — all with probabilities & confidence. Your code decides the route.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex, i) => (
              <Button key={i} variant="outline" size="sm" onClick={() => loadExample(i)}>
                {ex.label}
              </Button>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Tenant</Label>
              <Input value={tenantName} onChange={(e) => setTenantName(e.target.value)} placeholder="CRISTALYN MONIS" />
            </div>
            <div className="space-y-2">
              <Label>Property</Label>
              <Input value={property} onChange={(e) => setProperty(e.target.value)} placeholder="ECO" />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="2-2" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Water is leaking..." />
          </div>
          <Button onClick={run} disabled={loading || message.trim().length < 5}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "Asking Jev..." : "Ask Jev (1 System One call, 4 questions in parallel)"}
          </Button>
          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          {result?.mock && <p className="rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-sm text-yellow-800">Mock mode — set <code>TYPESAFE_API_KEY</code> in <code>.env</code> / Vercel to call real Jev. Mock shows the shape code receives.</p>}
        </CardContent>
      </Card>

      {answers && (
        <Card>
          <CardHeader>
            <CardTitle>Jev answers — code composes them</CardTitle>
            <CardDescription>
              Each answer is typed. <code>Choice</code> has <code>choice + probs</code>, <code>Noul</code> has <code>noul (P yes)</code>, <code>Score</code> has <code>score + level</code>, all with <code>confidence</code>. Code — not the model — owns routing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="text-xs font-semibold text-muted-foreground">category (Choice)</p>
                <p className="text-lg font-bold">{answers.category.choice}</p>
                <p className="text-xs">confidence {(answers.category.confidence * 100).toFixed(0)}% • probs {JSON.stringify(answers.category.probs || {})}</p>
                <p className="mt-1 text-xs font-medium text-primary">{route}</p>
                {needsReview && <Badge className="mt-1 bg-yellow-100 text-yellow-700 border-yellow-300">Low confidence → route to human review</Badge>}
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs font-semibold text-muted-foreground">urgency (Score)</p>
                <p className="text-lg font-bold">{answers.urgency.score.toFixed(1)} / 2</p>
                <p className="text-xs">confidence {(answers.urgency.confidence * 100).toFixed(0)}% • level: maintenance urgency</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs font-semibold text-muted-foreground">isComplaint (Noul)</p>
                <p className="text-lg font-bold">{(answers.isComplaint.noul * 100).toFixed(0)}% yes</p>
                <p className="text-xs">confidence {(answers.isComplaint.confidence * 100).toFixed(0)}%</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs font-semibold text-muted-foreground">paymentRelated (Noul)</p>
                <p className="text-lg font-bold">{(answers.paymentRelated.noul * 100).toFixed(0)}% yes</p>
                <p className="text-xs">confidence {(answers.paymentRelated.confidence * 100).toFixed(0)}%</p>
              </div>
            </div>
            <div className="rounded-lg bg-muted p-3 text-xs">
              <p className="font-semibold">How code uses this (from How to build with System One):</p>
              <pre className="mt-1 whitespace-pre-wrap">{`// 4 questions ran in parallel — one System One call
if (answers.category.confidence < 0.75) routeToHumanReview(message);
else if (answers.category.choice === "maintenance" && answers.urgency.score >= 2) routeToUrgent(message);
else if (answers.isComplaint.noul > 0.7) prioritize(message);`}</pre>
            </div>
            <p className="text-xs text-muted-foreground">
              Live docs: <a href="https://docs.typesafe.ai/concepts/how-to-build-with-system-one" target="_blank" className="underline">How to build</a> • <a href="https://docs.typesafe.ai/primitives" target="_blank" className="underline">Choice/Noul/Score</a> • <a href="https://docs.typesafe.ai/cookbooks" target="_blank" className="underline">Cookbooks</a> • <a href="https://docs.typesafe.ai/sdk/javascript" target="_blank" className="underline">JS SDK</a> — set <code>TYPESAFE_API_KEY</code> to run live (get at https://console.typesafe.ai).
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
