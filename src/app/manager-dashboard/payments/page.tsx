import monitoring from "@/lib/monitoring-data.json";
import PaymentsClient from "@/components/payments/payments-client";

export const dynamic = "force-dynamic";

export default function PaymentsPage() {
  const sheets = (monitoring as { sheets: Record<string, { unit: string; name: string; rate: unknown; contract: string; payments: { month: string; rent: number | null; raw: string | null; unpaid: boolean }[]; hasReservation?: boolean; closeToRenewal?: boolean; willNotRenew?: boolean }[]> }).sheets;
  return <PaymentsClient sheets={sheets} />;
}
