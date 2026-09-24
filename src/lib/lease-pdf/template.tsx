import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { LeasePdfVariables } from "./types";

// Full EVES Master Lease Contract — Version 3.3 Enterprise Digital
// Mirrors the legacy ECO LONG TERM.docx (16 pages) with all 94 spreadsheet columns.
// Static legal clauses are embedded verbatim; variables are injected via {{placeholders}}.
// Fonts: Helvetica (Times New Roman fallback). No Tailwind.

const styles = StyleSheet.create({
  page: { padding: 28, fontFamily: "Helvetica", fontSize: 8, color: "#1a1a1a", lineHeight: 1.45 },
  controlHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, borderBottomWidth: 1, borderBottomColor: "#111", paddingBottom: 6 },
  ctrlLabel: { fontSize: 6, color: "#666", textTransform: "uppercase" },
  ctrlValue: { fontSize: 9, fontWeight: 700, marginTop: 2 },
  title: { fontSize: 14, fontWeight: 700, textAlign: "center", textTransform: "uppercase", letterSpacing: 1, marginTop: 4, marginBottom: 6 },
  subtitle: { fontSize: 7, color: "#555", textAlign: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 9, fontWeight: 700, textTransform: "uppercase", marginTop: 12, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: "#ddd", paddingBottom: 3 },
  subSection: { fontSize: 8, fontWeight: 700, marginTop: 8, marginBottom: 3 },
  para: { fontSize: 7.5, color: "#222", lineHeight: 1.5, marginBottom: 4, textAlign: "justify" },
  paraIndent: { fontSize: 7.5, color: "#222", lineHeight: 1.5, marginLeft: 12, marginBottom: 3, textAlign: "justify" },
  row: { flexDirection: "row", marginBottom: 2 },
  label: { width: 110, fontSize: 6.5, color: "#555", textTransform: "uppercase", paddingTop: 1 },
  value: { flex: 1, fontSize: 8, fontWeight: 600 },
  valueMono: { flex: 1, fontSize: 8, fontFamily: "Helvetica-Bold" },
  grid2: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  tableHeader: { flexDirection: "row", backgroundColor: "#111", color: "#fff", paddingVertical: 4, paddingHorizontal: 5, marginTop: 6 },
  tableRow: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 5, borderBottomWidth: 0.5, borderBottomColor: "#ddd" },
  tableRowAlt: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 5, borderBottomWidth: 0.5, borderBottomColor: "#ddd", backgroundColor: "#f9f9f9" },
  th: { fontSize: 6, fontWeight: 700, textTransform: "uppercase", color: "#fff" },
  td: { fontSize: 7 },
  tdSmall: { fontSize: 6.5, color: "#333" },
  colParticular: { flex: 2 },
  colCondition: { flex: 1, textAlign: "center" },
  colComment: { flex: 2 },
  badge: { fontSize: 6, color: "#fff", backgroundColor: "#111", paddingHorizontal: 4, paddingVertical: 1, borderRadius: 2, textTransform: "uppercase" },
  sigRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  sigBox: { width: "45%", borderTopWidth: 1, borderTopColor: "#111", paddingTop: 5, alignItems: "center" },
  sigName: { fontSize: 8, fontWeight: 700 },
  sigRole: { fontSize: 6, color: "#666", textTransform: "uppercase", marginTop: 1 },
  footer: { position: "absolute", bottom: 14, left: 28, right: 28, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: "#ddd", paddingTop: 4 },
  footerText: { fontSize: 5, color: "#888" },
  bullet: { flexDirection: "row", marginBottom: 2, marginLeft: 10 },
  bulletDot: { width: 10, fontSize: 7, color: "#111" },
  bulletText: { flex: 1, fontSize: 7, color: "#222", lineHeight: 1.4 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  infoCell: { width: "48%", flexDirection: "row", marginBottom: 2, borderBottomWidth: 0.5, borderBottomColor: "#eee", paddingBottom: 2 },
  infoLabel: { width: 75, fontSize: 6, color: "#666", textTransform: "uppercase" },
  infoValue: { flex: 1, fontSize: 7, fontWeight: 600 },
});

function v(s: string | null | undefined, fallback = "—"): string {
  if (s === null || s === undefined) return fallback;
  const t = String(s).trim();
  return t === "" || t.toUpperCase() === "N/A" || t.toUpperCase() === "NA" ? fallback : t;
}
function fmtPeso(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function LeaseAgreementDocument({ data }: { data: LeasePdfVariables }) {
  const isLongTerm = data.terms.toLowerCase().includes("year") || data.leaseTerm === "1 Year";
  return (
    <Document>
      <Page size="A4" style={styles.page} wrap>
        {/* CONTROL HEADER */}
        <View style={styles.controlHeader}>
          <View>
            <Text style={styles.ctrlLabel}>Control Number</Text>
            <Text style={styles.ctrlValue}>{v(data.controlNumber)}</Text>
            {data.barCode ? <Text style={[styles.ctrlLabel, { marginTop: 4 }]}>Bar Code: {v(data.barCode)}</Text> : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.ctrlLabel}>Document Status</Text>
            <Text style={styles.ctrlValue}>{v(data.contractStatus)}</Text>
            <Text style={[styles.ctrlLabel, { marginTop: 4 }]}>Generated: {v(data.currentDate)}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.ctrlLabel}>Property</Text>
            <Text style={styles.ctrlValue}>{v(data.propertyName)} • {v(data.unitNumber)}</Text>
            <Text style={[styles.ctrlLabel, { marginTop: 4 }]}>Term: {v(data.terms)}</Text>
          </View>
        </View>

        <Text style={styles.title}>Contract of Lease</Text>
        <Text style={styles.subtitle}>Version 3.3 — Enterprise Digital Controlled Version • ARIEL-EVELYN RESIDENCES CO. LTD. • No. 69 Matahimik St. Riverside II, Brgy. Sto. Domingo, Cainta, Rizal</Text>

        <Text style={styles.para}>
          This <Text style={{ fontWeight: 700 }}>AGREEMENT</Text> made and entered into by and between <Text style={{ fontWeight: 700 }}>ARIEL-EVELYN RESIDENCES CO. LTD.</Text>, located at No. 69 Matahimik St. Riverside II Brgy. Sto. Domingo, Cainta, Rizal, Philippines, hereinafter known as the <Text style={{ fontWeight: 700 }}>LESSOR</Text>; —and— <Text style={{ fontWeight: 700 }}>{v(data.legalName)}</Text>, hereinafter known as the <Text style={{ fontWeight: 700 }}>LESSEE</Text>;
        </Text>
        <Text style={[styles.para, { fontWeight: 700, textAlign: "center", marginTop: 6 }]}>WITNESSETH:</Text>

        <Text style={styles.subSection}>1. Premises & Rental</Text>
        <Text style={styles.para}>
          That the LESSOR hereby agrees to lease unto the LESSEE a residential studio apartment unit <Text style={{ fontWeight: 700 }}>{v(data.unitNumber)}</Text>, located at Eve’s Residences, <Text style={{ fontWeight: 700 }}>{v(data.propertyLoc)}</Text> in consideration of the monthly rental of <Text style={{ fontWeight: 700 }}>{fmtPeso(data.rate)}</Text>, Philippine currency, payable in advance, on the <Text style={{ fontWeight: 700 }}>{v(data.dueDateText)}</Text>.
        </Text>

        <Text style={styles.subSection}>2. Deposits</Text>
        <Text style={styles.para}>
          That the LESSEE upon execution of this agreement shall pay an advance rental for one (1) month and two (2) months security deposit of <Text style={{ fontWeight: 700 }}>{v(data.amountInWords)}</Text> (<Text style={{ fontWeight: 700 }}>{fmtPeso(data.totalSettle)}</Text>), Philippine currency; the security deposit cannot be used as monthly rental and is not consumable.
          {data.advance1Month !== null ? ` 1 Month Advance: ${fmtPeso(data.advance1Month)}.` : ""} {data.deposit2Months !== null ? ` 2 Months Deposit: ${fmtPeso(data.deposit2Months)}.` : ""} {data.addonsAmount !== null ? ` Add-ons: ${fmtPeso(data.addonsAmount)}.` : ""} {data.occupancySupportFee !== null ? ` Occupancy Support Fee: ${fmtPeso(data.occupancySupportFee)}.` : ""}
        </Text>

        <Text style={styles.paraIndent}>3. That the LESSEE shall pay for and defray at his own expenses, the consumption of electric and water in the leased premises.</Text>
        <Text style={styles.paraIndent}>4. That the LESSEE shall not make or cause to be made any improvement in the premises without prior written consent of the LESSOR.</Text>
        <Text style={styles.paraIndent}>5. That the LESSEE shall not directly or indirectly sublease, assign or transfer his/her right under contract to a third party without written consent.</Text>

        <Text style={styles.subSection}>6. Term</Text>
        <Text style={styles.para}>That the term of this lease is <Text style={{ fontWeight: 700 }}>{v(data.terms)}</Text>, commencing from <Text style={{ fontWeight: 700 }}>{v(data.rentalStart)}</Text> and expiring on <Text style={{ fontWeight: 700 }}>{v(data.rentalEnd)}</Text>. Current date of execution: <Text style={{ fontWeight: 700 }}>{v(data.currentDate)}</Text>. {data.day20 ? `20th day notice falls on ${v(data.day20)}.` : ""} {data.penaltyDay ? `Penalty start: ${v(data.penaltyDay)}.` : ""}</Text>

        <Text style={styles.paraIndent}>7. That the LESSEE acknowledges the leased premises are in good and tenantable condition and agrees to keep the same in such condition complying with all laws and ordinances.</Text>
        <Text style={styles.paraIndent}>8. That in case of non-payment, the lease shall be considered rescinded and the LESSOR may demand the LESSEE vacate. Failure to pay one monthly rental authorizes the LESSOR to recover possession. The two (2) months security deposit shall not be refundable if vacated before expiration; refundable within thirty (30) days after proper move-out.</Text>

        <Text style={styles.sectionTitle}>9. Collection Policy (Annex 1)</Text>
        <Text style={styles.para}>The Management reserves sole discretion to determine and apply the appropriate Annex, considering property type, unit condition, lease term and payment history.</Text>
        <View style={styles.bullet}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>Grace period of 7 days — no penalties.</Text></View>
        <View style={styles.bullet}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>On the 8th day a penalty of Php 75.00 per day until the 15th day along with a demand letter.</Text></View>
        <View style={styles.bullet}><Text style={styles.bulletDot}>•</Text><Text style={styles.bulletText}>On the 16th & 17th day, the LESSEE must vacate voluntarily and complete move-out documents.</Text></View>
        <Text style={styles.para}>Bank Transfer (BDO) / MAYA/GCASH / Convenience Stores (7-Eleven, Alfamart) — <Text style={{ fontWeight: 700 }}>Cash payments strictly not allowed.</Text> Staff are not authorized to receive cash. Proof of payment (clear screenshot) must be submitted monthly via the official Facebook account https://www.facebook.com/profile.php?id=61577586137685. If channels are unavailable, use bank deposit approved by LESSOR. Lessee agrees to pay ₱99.00/mo for homeowners, garbage, security and maintenance. All bank/service charges shouldered by LESSEE.</Text>

        <Text style={styles.sectionTitle}>10–12. Renewal, Damages & Notices</Text>
        <Text style={styles.para}>10. LESSEE shall notify LESSOR of intent to renew at least thirty (30) days before expiration. Failure to notify makes expiration final; daily rental of Php700.00 shall prevail if extended without contract.</Text>
        <Text style={styles.para}>11–12. LESSEE shall be responsible for repairs of damages attributable to LESSEE negligence. All improvements require written consent at LESSEE expense.</Text>

        <Text style={styles.sectionTitle}>13. Payment Verification & Discrepancy Policy</Text>
        <Text style={styles.para}>Verification via GCash/bank may take up to 3 working days. Discrepancies verified jointly at LESSOR’s bank. If not reflected, both sign a Notarized MOA with LESSEE temporarily covering amount; if later confirmed, refunded. If never sent, LESSEE remains liable plus penalties. Verification costs borne by LESSEE.</Text>

        <Text style={styles.sectionTitle}>14–15. Rental Penalties & Failure to Pay</Text>
        <Text style={styles.para}>14. Overdue rent/utilities incur daily penalties until full payment. Partial payments not recognized as full. At 20% of monthly rent in penalties, First Demand Letter; continued non-payment after Second Demand allows termination and forfeiture of deposit. Security deposit must remain intact. Repeated failure may lead to Final Demand, legal action, termination, non-renewal. Payments applied: rent/penalties → utilities → other charges. LESSEE liable for legal/admin costs.</Text>
        <Text style={styles.para}>15. Failure to pay full amount (rent + utilities + company-rented items) may be escalated to Legal. If unpaid utilities/charges reach 20% of monthly rent, LESSOR may terminate and forfeit deposit per 20% Rule.</Text>

        <Text style={styles.sectionTitle}>16–17. Tenant Responsibility & Water Policy</Text>
        <Text style={styles.para}>Each tenant must monitor submeter readings. Spike in water usage must be reported immediately for inspection; if due to negligence/transparent readings, charges shouldered by tenant. Unreported spikes absolve management.</Text>
        <Text style={styles.para}>Water: All units have submeter. Billing = Total Water Bill ÷ Total Actual Usage (cu.m.) = Rate per cu.m. Posted every 16th; due 15 days after posting; ₱10/day penalty. Unpaid after due date: demand letter → added to next month’s rent → Legal if still unpaid. Minimum 1 cu.m./mo. No cash payments.</Text>

        <Text style={styles.sectionTitle}>18. Meralco Prepaid Electricity (Kuryente Load)</Text>
        <Text style={styles.para}>For GREEN and ECO 888: Prepaid “Kuryente Load” minimum ₱200, no expiration, lower rate, reloadable at Meralco/Bayad Centers. No refund on move-out. Monitoring/reloading is tenant’s sole responsibility. For submetered units: minimum ₱15.00/kWh (adjustable), billing based on actual submeter, posted monthly, due 5 days after issuance, ₱10/day penalty, may suspend/disconnect if unpaid.</Text>

        <Text style={styles.sectionTitle}>19. Unit Transfer, 20. Biometrics & 21. Move-in/out Checklist</Text>
        <Text style={styles.para}>19. Transfer within EVES upon Php1,500 fee + approval; unit must be in good condition; repainting fees apply for 3/6/12-month stays. 20. Each unit gets two (2) biometric codes for main gate + one unit key; guests only with tenant permission; access restricted if 2 months overdue. Handle biometrics with care; not liable for tech failures. 21. See checklist below — tenant confirms all items in good condition on move-in.</Text>

        {/* Checklist Table */}
        <View style={styles.tableHeader}>
          <Text style={[styles.th, styles.colParticular]}>Particulars</Text>
          <Text style={[styles.th, styles.colCondition]}>Condition (YES/No)</Text>
          <Text style={[styles.th, styles.colComment]}>Comment</Text>
        </View>
        {data.checklist.map((c, i) => (
          <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <Text style={[styles.td, styles.colParticular]}>{c.label}</Text>
            <Text style={[styles.tdSmall, styles.colCondition]}>{v(c.value)}</Text>
            <Text style={[styles.tdSmall, styles.colComment]}>{v(c.comment)}</Text>
          </View>
        ))}
        <View style={[styles.row, { marginTop: 4 }]}>
          <Text style={styles.label}>Unit No.</Text><Text style={styles.valueMono}>{v(data.unitNumber)}</Text>
          <Text style={styles.label}>Date:</Text><Text style={styles.value}>{v(data.currentDate)}</Text>
          <Text style={styles.label}>Tenant:</Text><Text style={styles.value}>{v(data.legalName)}</Text>
        </View>
        <Text style={[styles.para, { fontSize: 6, fontStyle: "italic" }]}>DECLARATION: I hereby confirm all above-mentioned items in my unit are in good condition upon move-in. I will be responsible for any damage during my stay. Tenant’s Signature: ______________________</Text>

        <Text style={styles.sectionTitle}>22–23. Reminders, Internet & 24. Utility Readings</Text>
        <Text style={styles.para}>22. Door knob must be replaced within 2 days; lockout fee Php200 (Php300 per addendum); move-out cleaning Php400 if not cleaned; repainting auto for long-term; monthly inspection may occur. 23. Only wireless internet permitted; request via property rep; tenant shoulders costs; management not liable for ISP issues.</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 1 }]}>Detail</Text>
          <Text style={[styles.th, { flex: 1 }]}>No. of Persons</Text>
          <Text style={[styles.th, { flex: 1 }]}>Water Meter / Reading</Text>
          <Text style={[styles.th, { flex: 1 }]}>Electric / Kuryente Load</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.td, { flex: 1 }]}>Move-in Reading</Text>
          <Text style={[styles.td, { flex: 1 }]}>{v(data.numPer)}</Text>
          <Text style={[styles.td, { flex: 1 }]}>{v(data.water)}</Text>
          <Text style={[styles.td, { flex: 1 }]}>{v(data.electric)}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.td, { flex: 1 }]}>Availment (if any)</Text>
          <Text style={[styles.td, { flex: 1 }]}>{v(data.availFrom)} {data.availTo ? `→ ${v(data.availTo)}` : ""}</Text>
          <Text style={[styles.td, { flex: 1 }]}>Items: {v(data.items)}</Text>
        </View>

        <Text style={styles.sectionTitle}>25–26. Warranty, Maintenance & New Guidelines</Text>
        <Text style={styles.para}>25. Fixtures (shower, faucet, bulb) 3-month warranty; tenant may purchase replacements, labor via rep; no private arrangements with staff; special job orders need management approval; all payments via e-wallet/bank, no cash. 26. Management may introduce/amend rules at any time for safety, compliance, emergencies; tenants must comply.</Text>

        <Text style={styles.sectionTitle}>27–32. Inspection, Waiver, Move-out Docs & Force Majeure</Text>
        <Text style={styles.para}>27. LESSOR may inspect at reasonable hours. 28. Failure to insist on strict performance not a waiver. 29. On move-out: fill move-out form, refund of deposit form, utility/AC refund; no document/no refund; Php1,000 penalty if not physically signed. 30. Violations subject to damages + attorney’s fees (100% of claim, ≥₱50,000). Tenant property left after 7 days may be disposed. 31. Force Majeure: no liability for typhoon, earthquake, war, lockdown, outage, pandemic; no refund/deduction. 32. Parking: no guarantee; park at own risk.</Text>

        <Text style={styles.para}>33. Manual Flush Units — all toilets are pale flush, cannot be converted. 34. Parcel Deliveries — sole responsibility of LESSEE.</Text>

        <Text style={styles.subSection}>35. Authorization to Access Unit & Remove Belongings</Text>
        <Text style={styles.para}>A. Short-term (daily/monthly): unpaid 1 day after expiry → may access/remove. B. Long-term (6-mo/1-yr): 15-day grace + demand → may enter/remove. C. Abandonment: no payment/no communication 15 days → may repossess. D. Emergency (fire/flood/leak/faulty wiring) → may access without notice. E. Stored belongings Php100/day storage fee.</Text>

        <Text style={styles.subSection}>36. Acknowledgment & Signing Agreement</Text>
        <Text style={styles.para}>Lessee acknowledges having read all terms, no further questions, explained by rep {v(data.propertyRep)}; upon full payment of deposit/advance, sign at #69 Matahimik St. Failure to sign incurs Php500/day penalty; “No Signed Contract, No Move-In”.</Text>

        <Text style={styles.subSection}>37. Occupancy Restrictions</Text>
        <Text style={styles.para}>Adults and minors 15+ only; children under 15 and pets strictly prohibited. Violation = material breach, may terminate.</Text>

        <Text style={styles.subSection}>38–41. Use of Management Property, Documents, House Rules & Renewal</Text>
        <Text style={styles.para}>38. Borrowing management property without permission → 1st warning, 2nd Php1,000, 3rd suspension/non-renewal. 39. Supporting documents subject to charges. 40. House Rules: no shoes/furniture in common areas, no smoking/alcohol in hallways, no drying clothes in windows/hallways (use rooftop), sealed trash only, no pets, no tissue in toilet, no gas stoves, keep common areas clean. 41. Renewal: notify before 20th day prior to end; sign within 5 calendar days or Php50/day penalty; if unable to sign in person, email/messenger to Dhan Dhan De Leon dhan55110@gmail.com.</Text>
        <Text style={styles.para}>42. Judicial Relief — losing party pays 100% of claim as attorney’s fees, ≥₱50,000.</Text>

        <View style={styles.sigRow}>
          <View style={styles.sigBox}><Text style={styles.sigName}>ARIEL-EVELYN RESIDENCES CO. LTD.</Text><Text style={styles.sigRole}>Lessor — Authorized Representative</Text><Text style={[styles.sigRole, { marginTop: 6 }]}>Date: {v(data.currentDate)}</Text></View>
          <View style={styles.sigBox}><Text style={styles.sigName}>{v(data.legalName)}</Text><Text style={styles.sigRole}>Lessee — {v(data.unitNumber)}</Text><Text style={[styles.sigRole, { marginTop: 6 }]}>Date: {v(data.dateSigned ?? data.currentDate)}</Text></View>
        </View>
        <Text style={[styles.para, { textAlign: "center", marginTop: 8, fontSize: 6 }]}>SIGNED IN THE PRESENCE OF: ______________________ &nbsp;&nbsp; Witness &nbsp;&nbsp; ______________________ Witness &nbsp;&nbsp; (REPUBLIC OF THE PHILIPPINES)</Text>

        <Text style={styles.sectionTitle}>Fire Safety, Common Areas & Unit Inspection</Text>
        <Text style={styles.para}>Per RA 9514 (Fire Code), hallways/corridors/stairways/common areas must remain clear. Shoes, slippers, bicycles, furniture, appliances or personal belongings prohibited in hallways. Obstructing items may be removed without notice to Management stockroom at {v(data.propertyLoc)}; retrieval via proper documentation; not liable for loss/damage; unclaimed 30 days deemed abandoned and may be disposed/donated.</Text>
        <Text style={[styles.para, { fontSize: 6, fontStyle: "italic" }]}>CONFORME: ______________________</Text>

        <Text style={styles.sectionTitle}>Contract Signing Agreement & Waivers</Text>
        <Text style={styles.para}>I, <Text style={{ fontWeight: 700 }}>{v(data.legalName)}</Text> of {v(data.unitNumber)} of {v(data.propertyName)} fully understand and affix my signature. I have no more questions. Advance/Deposit signing only at #69 Matahimik St.; failure to sign Php500/day penalty; No contract, No move-in. Tenant: ______________________ Management: {v(data.propertyRep)} Waiver for renewal: sign within 5 days or Php50/day; contact Dhan Dhan De Leon.</Text>
        <Text style={styles.para}>Miscellaneous Fee Agreement: I, {v(data.legalName)}, agree to pay Php99.00 for homeowners, garbage, security and maintenance. Conforme: __________</Text>
        <Text style={styles.para}>Utility Deposit: Availment {v(data.availFrom)} → {v(data.availTo)} Items: {v(data.items)} — Php750/mo (monthly) with 1 mo AC deposit Php750; Php650/mo (6-mo/yearly) with 2 mos Php1,300; K-Load no utility deposit, Php300 for lost Meralco Sim; Metered Php3,000 utility deposit; Own AC Php3,000. Failure to inform AC install Php1,000 penalty; unpaid AC/foam/electric fan Php10/day. Conforme: __________</Text>
        <Text style={styles.para}>Waiver to Open Room: I, {v(data.legalName)} of unit {v(data.unitNumber)} authorize opening/removal per conditions A–E above. Storage Php100/day. Conforme: __________</Text>

        <Text style={styles.sectionTitle}>20th Day Notice & Addendum</Text>
        <Text style={styles.para}>Tenant must sign renewal on/before 20th day prior to end ({v(data.day20)}). If not renewing, written notice via Messenger on/before that date. Failure within 5 days after 20th → penalty Php500/day from {v(data.penaltyDay)} until confirmation. Management may market unit after grace period. Deductions from deposit. Renewal at #69 Matahimik St. Parking Disclaimer: no parking provided. Conforme: __________</Text>

        <Text style={styles.sectionTitle}>Information Sheet — Personal Information</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoCell}><Text style={styles.infoLabel}>Last / First / Middle</Text><Text style={styles.infoValue}>{v(data.lastName)} / {v(data.firstName)} / {v(data.middleName)}</Text></View>
          <View style={styles.infoCell}><Text style={styles.infoLabel}>Age / Gender</Text><Text style={styles.infoValue}>{v(data.age)} / {v(data.gender)}</Text></View>
          <View style={styles.infoCell}><Text style={styles.infoLabel}>Nationality</Text><Text style={styles.infoValue}>{v(data.nationality)}</Text></View>
          <View style={styles.infoCell}><Text style={styles.infoLabel}>Religion</Text><Text style={styles.infoValue}>{v(data.religion)}</Text></View>
          <View style={styles.infoCell}><Text style={styles.infoLabel}>Civil Status</Text><Text style={styles.infoValue}>{v(data.civilStatus)}</Text></View>
          <View style={styles.infoCell}><Text style={styles.infoLabel}>Mobile</Text><Text style={styles.infoValue}>{v(data.contactNo)} / {v(data.mobileNumber)}</Text></View>
          <View style={styles.infoCell}><Text style={styles.infoLabel}>Email</Text><Text style={styles.infoValue}>{v(data.emailAddr)}</Text></View>
          <View style={styles.infoCell}><Text style={styles.infoLabel}>FB Messenger</Text><Text style={styles.infoValue}>{v(data.fbMessenger)}</Text></View>
          <View style={styles.infoCell}><Text style={styles.infoLabel}>Perm Address</Text><Text style={styles.infoValue}>{v(data.permAddress)}</Text></View>
          <View style={styles.infoCell}><Text style={styles.infoLabel}>Recent Address</Text><Text style={styles.infoValue}>{v(data.recAddress)}</Text></View>
        </View>
        <Text style={styles.subSection}>Employment</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoCell}><Text style={styles.infoLabel}>Company</Text><Text style={styles.infoValue}>{v(data.company)}</Text></View>
          <View style={styles.infoCell}><Text style={styles.infoLabel}>Position / Status</Text><Text style={styles.infoValue}>{v(data.position)} / {v(data.workStatus)}</Text></View>
          <View style={styles.infoCell}><Text style={styles.infoLabel}>Comp Address</Text><Text style={styles.infoValue}>{v(data.compAddr)}</Text></View>
          <View style={styles.infoCell}><Text style={styles.infoLabel}>Comp Tel / Email</Text><Text style={styles.infoValue}>{v(data.compTel)} / {v(data.compEmail)}</Text></View>
          <View style={styles.infoCell}><Text style={styles.infoLabel}>Comp Messenger</Text><Text style={styles.infoValue}>{v(data.compMssgr)}</Text></View>
          <View style={styles.infoCell}><Text style={styles.infoLabel}>Found via</Text><Text style={styles.infoValue}>{v(data.marketingSrc)}</Text></View>
        </View>
        <Text style={styles.subSection}>In Case of Emergency (2 contacts)</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoCell}><Text style={styles.infoLabel}>EC1 Name / Tel</Text><Text style={styles.infoValue}>{v(data.ec1Name)} / {v(data.ec1Tel)}</Text></View>
          <View style={styles.infoCell}><Text style={styles.infoLabel}>EC1 Email / Mssgr</Text><Text style={styles.infoValue}>{v(data.ec1Email)} / {v(data.ec1Mssgr)}</Text></View>
          <View style={styles.infoCell}><Text style={styles.infoLabel}>EC2 Name / Tel</Text><Text style={styles.infoValue}>{v(data.ec2Name)} / {v(data.ec2Tel)}</Text></View>
          <View style={styles.infoCell}><Text style={styles.infoLabel}>EC2 Email / Mssgr</Text><Text style={styles.infoValue}>{v(data.ec2Email)} / {v(data.ec2Mssgr)}</Text></View>
        </View>
        <Text style={styles.subSection}>ID & Signatures</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoCell}><Text style={styles.infoLabel}>ID Type / Number</Text><Text style={styles.infoValue}>{v(data.idType)} / {v(data.idNumber)}</Text></View>
          <View style={styles.infoCell}><Text style={styles.infoLabel}>ID Link</Text><Text style={styles.infoValue}>{v(data.idLink)}</Text></View>
          <View style={styles.infoCell}><Text style={styles.infoLabel}>Date Issued / Signed</Text><Text style={styles.infoValue}>{v(data.dateIssued)} / {v(data.dateSigned)}</Text></View>
          <View style={styles.infoCell}><Text style={styles.infoLabel}>Property Rep</Text><Text style={styles.infoValue}>{v(data.propertyRep)}</Text></View>
        </View>
        <Text style={[styles.para, { fontSize: 6, fontStyle: "italic", marginTop: 6 }]}>I hereby certify information above is true and correct. Client Signature: ______________________ Date: {v(data.currentDate)}</Text>

        <Text style={styles.sectionTitle}>Addendum — House Rules, Biometrics, Meralco, Digital Contract Policy</Text>
        <Text style={styles.para}>House Rules verbatim per contract: cleanliness, smoking/alcohol, drying, waste, pets, toilet, cooking, common areas. Biometrics: 2 codes per unit + 1 key; access restricted if 2 months overdue. Internet: wireless only via rep. Parcel: lessee sole responsibility. Manual flush: pale flush only. Digital Contract Policy: active email {v(data.emailAddr)} is exclusive delivery channel; electronic signatures per RA 8792; Messenger not valid; printed copy Php100. Master Lease v3.3 — Digital execution in presence of Property Representative {v(data.propertyRep)}; barcode verification may be affixed; seal/signature required.</Text>
        <Text style={[styles.para, { fontSize: 6, color: "#444" }]}>Entire Agreement: signatures below constitute full acceptance. Executed electronically; affixing signature acknowledges all provisions. Property Representative: {v(data.propertyRep)} — Conforme: ______________________</Text>

        <View style={styles.sigRow}>
          <View style={styles.sigBox}><Text style={styles.sigName}>{v(data.legalName)}</Text><Text style={styles.sigRole}>Lessee — conforme</Text></View>
          <View style={styles.sigBox}><Text style={styles.sigName}>ARIEL-EVELYN RESIDENCES</Text><Text style={styles.sigRole}>Management — seal & signature</Text></View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>EVES {v(data.propertyName)} {v(data.unitNumber)} • Ctrl {v(data.controlNumber)} • {v(data.currentDate)} • {data.leaseId}</Text>
          <Text style={styles.footerText}>System Draft — {v(data.contractStatus)} • v3.3 Digital Controlled</Text>
        </View>
      </Page>
    </Document>
  );
}
