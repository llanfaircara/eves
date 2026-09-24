import { NextResponse } from "next/server";
import { TypeSafeClient, choice, noul, score } from "@typesafe-ai/sdk";

export async function POST(req: Request) {
  const body = await req.json();
  const { message, tenantName, property, unit } = body as {
    message: string;
    tenantName?: string;
    property?: string;
    unit?: string;
  };

  if (!message || typeof message !== "string" || message.trim().length < 5) {
    return NextResponse.json({ error: "Message required (at least 5 chars)" }, { status: 400 });
  }

  // If no API key, return mock for demo so UI still works
  if (!process.env.TYPESAFE_API_KEY) {
    return NextResponse.json({
      mock: true,
      note: "Set TYPESAFE_API_KEY in .env / Vercel to call real Jev. Returning mock judgments for demo.",
      answers: {
        category: { choice: "maintenance", confidence: 0.92, probs: { maintenance: 0.92, payment: 0.05, lease: 0.03 } },
        urgency: { score: 1.8, confidence: 0.88, level: "urgent but not emergency" },
        isComplaint: { noul: 0.75, confidence: 0.90 },
        paymentRelated: { noul: 0.12, confidence: 0.95 },
      },
    });
  }

  const state = {
    tenant: {
      name: tenantName || "Unknown tenant",
      property: property || "Unknown property",
      unit: unit || "Unknown unit",
    },
    message: {
      text: message,
    },
    policy: {
      // Deterministic rules stay in code — Jev only judges semantics
      urgent_keywords: ["flood", "leak", "no water", "no power", "fire", "locked out"],
    },
  };

  try {
    const client = new TypeSafeClient();
    const response = await client.systemOne({
      state,
      questions: {
        category: choice("Which team should handle `message.text`?", {
          maintenance: {
            what: "Repairs, utilities, cleaning, pest, or physical unit issues",
            not_for: "Rent, lease, or payment questions",
            examples: ["Water leak in kitchen", "AC not cooling", "Door lock broken"],
          },
          payment: {
            what: "Rent, deposits, penalties, receipts, or billing",
            not_for: "Physical repairs",
            examples: ["I sent rent receipt for May", "When is my due date?"],
          },
          lease: {
            what: "Contract, renewal, move-in/out, or terms",
            not_for: "Repairs or payments",
            examples: ["When does my lease end?", "I want to renew"],
          },
          general: {
            what: "Other or unclear",
            not_for: "Specific maintenance/payment/lease requests",
            examples: ["Hello, just checking in"],
          },
        }),
        isComplaint: noul("Does `message.text` express a complaint or negative experience?", {
          true: { what: "Expresses dissatisfaction or problem", examples: ["Water has been leaking for days"] },
          false: { what: "Neutral or positive, or just a request", examples: ["Please fix the light when convenient"] },
        }),
        paymentRelated: noul("Is `message.text` about a payment, rent, deposit, or receipt?", {
          true: { what: "Mentions money, rent, or payment", examples: ["I paid ₱5399 for May"] },
          false: { what: "No money mentioned", examples: ["AC not working"] },
        }),
        urgency: score("How urgent is `message.text`?", [
          { what: "Routine — can wait days", signals: ["Minor cosmetic issue", "When convenient"] },
          { what: "Urgent but not emergency — needs same/next day", signals: ["Leak, no hot water, AC failure"] },
          { what: "Emergency — immediate safety or habitability risk", signals: ["Flood, fire, no water/power, locked out"] },
        ]),
      },
    });

    // TypeSafe returns typed answers with probabilities and confidence
    return NextResponse.json({
      mock: false,
      answers: {
        category: response.answers.category,
        isComplaint: response.answers.isComplaint,
        paymentRelated: response.answers.paymentRelated,
        urgency: response.answers.urgency,
      },
      usage: response.usage,
    });
  } catch (e) {
    console.error("[Jev triage]", e);
    return NextResponse.json({ error: "Jev call failed", details: String(e) }, { status: 500 });
  }
}
