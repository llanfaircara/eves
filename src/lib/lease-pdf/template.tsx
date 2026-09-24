import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { LeasePdfVariables } from "./types";

// EVES Lease Agreement — type-safe, print-ready.
// Uses only @react-pdf primitives; no arbitrary Tailwind.
// Layout matches legacy "Responses" contract conventions: header → parties → premises → term → financials → signatures.

const styles = StyleSheet.create({
  page: { padding: 32, fontFamily: "Helvetica", fontSize: 9, color: "#1a1a1a", lineHeight: 1.5 },
  header: { marginBottom: 16, borderBottomWidth: 2, borderBottomColor: "#111", paddingBottom: 10 },
  headerTitle: { fontSize: 16, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 },
  headerSub: { fontSize: 8, color: "#555", marginTop: 4 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14, backgroundColor: "#f6f6f6", padding: 8, borderRadius: 4 },
  metaCell: { fontSize: 8 },
  metaLabel: { color: "#666", fontSize: 7, textTransform: "uppercase" },
  metaValue: { fontSize: 9, fontWeight: 700, marginTop: 2 },
  sectionTitle: { fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginTop: 14, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: "#ddd", paddingBottom: 4 },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: 140, color: "#555", fontSize: 8, textTransform: "uppercase" },
  value: { flex: 1, fontSize: 9, fontWeight: 600 },
  valueMono: { flex: 1, fontSize: 9, fontFamily: "Helvetica-Bold" },
  tableHeader: { flexDirection: "row", backgroundColor: "#111", color: "#fff", paddingVertical: 5, paddingHorizontal: 6, marginTop: 6 },
  tableRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: "#e5e5e5" },
  th: { fontSize: 7, fontWeight: 700, textTransform: "uppercase" },
  td: { fontSize: 8 },
  colDesc: { flex: 2 },
  colAmt: { flex: 1, textAlign: "right" },
  totalRow: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 6, backgroundColor: "#f6f6f6", borderTopWidth: 1, borderTopColor: "#111" },
  totalLabel: { flex: 2, fontSize: 9, fontWeight: 700 },
  totalAmt: { flex: 1, fontSize: 9, fontWeight: 700, textAlign: "right" },
  paragraph: { fontSize: 8, color: "#333", marginTop: 6, lineHeight: 1.6 },
  sigRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 28 },
  sigBox: { width: "45%", borderTopWidth: 1, borderTopColor: "#111", paddingTop: 6, alignItems: "center" },
  sigName: { fontSize: 9, fontWeight: 700 },
  sigRole: { fontSize: 7, color: "#666", textTransform: "uppercase", marginTop: 2 },
  footer: { position: "absolute", bottom: 20, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#ddd", paddingTop: 6 },
  footerText: { fontSize: 6, color: "#888" },
});

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
function fmtPeso(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function LeaseAgreementDocument({ data }: { data: LeasePdfVariables }) {
  const addonsTotal = (data.addons ?? []).reduce((s, a) => s + Number(a.amount || 0), 0);
  const grandTotal = Number(data.securityDeposit ?? 0) + Number(data.advanceDeposit ?? 0) + addonsTotal;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Lease Agreement — EVES</Text>
          <Text style={styles.headerSub}>
            {data.propertyName} • Unit {data.unitNumber} • Control {data.controlNumber ?? data.leaseId.slice(0, 8).toUpperCase()}
          </Text>
        </View>

        {/* Meta */}
        <View style={styles.metaRow}>
          <View><Text style={styles.metaLabel}>Lease ID</Text><Text style={styles.metaValue}>{data.leaseId.slice(0, 12)}</Text></View>
          <View><Text style={styles.metaLabel}>Status</Text><Text style={styles.metaValue}>{data.contractStatus}</Text></View>
          <View><Text style={styles.metaLabel}>Term</Text><Text style={styles.metaValue}>{data.leaseTerm}</Text></View>
          <View><Text style={styles.metaLabel}>Intent</Text><Text style={styles.metaValue}>{data.leaseIntent}</Text></View>
          <View><Text style={styles.metaLabel}>Generated</Text><Text style={styles.metaValue}>{fmtDate(data.generatedAt)}</Text></View>
        </View>

        <Text style={styles.sectionTitle}>1 — Parties</Text>
        <View style={styles.row}><Text style={styles.label}>Lessor (EVES)</Text><Text style={styles.value}>EVES Property Management — {data.propertyName}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Lessee (Tenant)</Text><Text style={styles.value}>{data.tenantName}</Text></View>
        {data.tenantEmail ? <View style={styles.row}><Text style={styles.label}>Email</Text><Text style={styles.value}>{data.tenantEmail}</Text></View> : null}
        {data.tenantMobile ? <View style={styles.row}><Text style={styles.label}>Mobile</Text><Text style={styles.value}>{data.tenantMobile}</Text></View> : null}
        {data.tenantCompany ? <View style={styles.row}><Text style={styles.label}>Company</Text><Text style={styles.value}>{data.tenantCompany}</Text></View> : null}

        <Text style={styles.sectionTitle}>2 — Premises</Text>
        <View style={styles.row}><Text style={styles.label}>Property</Text><Text style={styles.value}>{data.propertyName}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Unit</Text><Text style={styles.valueMono}>{data.unitNumber}</Text></View>
        {data.propertyAddress ? <View style={styles.row}><Text style={styles.label}>Address</Text><Text style={styles.value}>{data.propertyAddress}</Text></View> : null}

        <Text style={styles.sectionTitle}>3 — Term & Dates</Text>
        <View style={styles.row}><Text style={styles.label}>Lease Start</Text><Text style={styles.value}>{fmtDate(data.leaseStartDate)}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Lease End</Text><Text style={styles.value}>{fmtDate(data.leaseEndDate)}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Move-in Date</Text><Text style={styles.value}>{fmtDate(data.moveInDate)}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Rent Due Date</Text><Text style={styles.value}>{fmtDate(data.rentDueDate)}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Notice Period</Text><Text style={styles.value}>{data.noticePeriodDays} days</Text></View>

        <Text style={styles.sectionTitle}>4 — Financial Terms</Text>
        <View style={styles.row}><Text style={styles.label}>Monthly Rent</Text><Text style={styles.value}>{fmtPeso(data.monthlyRent)}</Text></View>

        <View style={styles.tableHeader}>
          <Text style={[styles.th, styles.colDesc]}>Description</Text>
          <Text style={[styles.th, styles.colAmt]}>Amount</Text>
          <Text style={[styles.th, styles.colAmt]}>Due Date</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.td, styles.colDesc]}>Security Deposit (1st Deposit)</Text>
          <Text style={[styles.td, styles.colAmt]}>{fmtPeso(data.securityDeposit)}</Text>
          <Text style={[styles.td, styles.colAmt]}>{fmtDate(data.firstDepositDue)}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.td, styles.colDesc]}>Advance Rental (2nd Deposit)</Text>
          <Text style={[styles.td, styles.colAmt]}>{fmtPeso(data.advanceDeposit)}</Text>
          <Text style={[styles.td, styles.colAmt]}>{fmtDate(data.secondDepositDue)}</Text>
        </View>
        {(data.addons ?? []).map((a, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={[styles.td, styles.colDesc]}>{a.label}</Text>
            <Text style={[styles.td, styles.colAmt]}>{fmtPeso(a.amount)}</Text>
            <Text style={[styles.td, styles.colAmt]}>—</Text>
          </View>
        ))}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Amount Due at Signing (Deposits + Add-ons)</Text>
          <Text style={styles.totalAmt}>{fmtPeso(grandTotal)}</Text>
          <Text style={styles.totalAmt}></Text>
        </View>
        <View style={styles.row}><Text style={styles.label}>Total To Settle</Text><Text style={styles.value}>{fmtPeso(data.totalAmountToSettle)}</Text></View>

        <Text style={styles.sectionTitle}>5 — Terms</Text>
        <Text style={styles.paragraph}>
          This draft lease is generated from the EVES reservation system for <Text style={{ fontWeight: 700 }}>{data.tenantName}</Text> for unit{" "}
          <Text style={{ fontWeight: 700 }}>{data.unitNumber}</Text> at <Text style={{ fontWeight: 700 }}>{data.propertyName}</Text>. The monthly rental
          of {fmtPeso(data.monthlyRent)} shall be due on {fmtDate(data.rentDueDate)} each month. Failure to pay on or before the due date shall incur
          applicable penalties per EVES policy. The security deposit of {fmtPeso(data.securityDeposit)} shall be refundable upon proper turnover and settlement
          of outstanding obligations. Notice of non-renewal must be given at least {data.noticePeriodDays} days before lease end date of {fmtDate(data.leaseEndDate)}.
        </Text>
        <Text style={styles.paragraph}>
          This document is a system-generated DRAFT and requires review and signature by both parties to become effective. The lessee confirms that information
          provided is accurate and agrees to the property rules and inspection checklist recorded under this lease.
        </Text>

        <View style={styles.sigRow}>
          <View style={styles.sigBox}>
            <Text style={styles.sigName}>{data.tenantName}</Text><Text style={styles.sigRole}>Lessee — Signature over printed name</Text>
          </View>
          <View style={styles.sigBox}>
            <Text style={styles.sigName}>EVES Property Management</Text><Text style={styles.sigRole}>Lessor — Authorized Representative</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>EVES • Generated {fmtDate(data.generatedAt)} • {data.leaseId}</Text>
          <Text style={styles.footerText}>System Draft — Pending Review</Text>
        </View>
      </Page>
    </Document>
  );
}
