import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { adlOptions, medicationLabels, monthLabel, monthlySections, notificationLabels, observationLabels, type MonthlyContent } from "@/lib/monthly-progress";

export type MonthlyPdfReport = { clientName: string; clientId: string; dob: Date | null; month: string; authorName: string; status: "SAVED" | "DRAFT" | "COMPLETED"; completedAt: Date | null; version: number; content: MonthlyContent };
// Avoid inherited numeric lineHeight: this renderer can multiply it during dynamic pagination.
const styles = StyleSheet.create({
  page: { paddingTop: 124, paddingBottom: 44, paddingLeft: 54, paddingRight: 32, fontFamily: "Helvetica", fontSize: 9, color: "#173036" },
  header: { position: "absolute", top: 24, left: 54, right: 32, height: 84, borderBottom: "1px solid #9ab1b6" },
  title: { position: "absolute", top: 24, left: 54, right: 32, fontSize: 14, fontWeight: 700 },
  facility: { position: "absolute", top: 46, left: 54, right: 32, fontSize: 8 },
  resident: { position: "absolute", top: 70, left: 54, right: 32, fontSize: 8 },
  meta: { fontSize: 9, marginBottom: 2 },
  section: { marginBottom: 11 },
  sectionTitle: { fontSize: 10, color: "#0f6974", fontWeight: 700, marginBottom: 3 },
  status: { fontSize: 8, color: "#52676e", marginBottom: 3 },
  field: { marginBottom: 4 },
  label: { fontWeight: 700 },
  event: { borderLeft: "2px solid #9ab1b6", paddingLeft: 7, marginTop: 5, marginBottom: 5 },
  signature: { marginTop: 10, borderTop: "1px solid #9ab1b6", paddingTop: 9 },
  signatureRow: { flexDirection: "row", marginTop: 14, gap: 20 },
  line: { borderBottom: "1px solid #173036", height: 20 },
  footerLine: { position: "absolute", top: 752, left: 54, right: 32, height: 1, borderTop: "1px solid #d5e0e2" },
  footer: { position: "absolute", top: 758, left: 54, width: 400, height: 20, fontSize: 7, color: "#52676e" },
  pageNumber: { position: "absolute", top: 758, left: 480, width: 100, fontSize: 7, color: "#52676e", textAlign: "right" }
});
function shortDate(date: Date | null) { return date ? date.toLocaleDateString("en-US", { timeZone: "UTC", month: "2-digit", day: "2-digit", year: "numeric" }) : "Not available on file"; }
function eventDate(value: string) { return value ? `${value.slice(5, 7)}/${value.slice(8, 10)}/${value.slice(0, 4)}` : "Not recorded"; }
function Field({ label, value }: { label: string; value: string }) { return <Text style={styles.field}><Text style={styles.label}>{label}: </Text>{value || "Not documented"}</Text>; }

export function MonthlyProgressPdf({ reports }: { reports: MonthlyPdfReport[] }) {
  return <Document title="Monthly Resident Progress Report" author="Zagol Seniors Care">
    {reports.map((report) => <Page key={report.clientId + report.month} size="LETTER" style={styles.page}>
      <View fixed wrap={false} style={styles.header} />
      <Text fixed style={styles.title}>MONTHLY RESIDENT PROGRESS REPORT</Text>
      <Text fixed style={styles.facility}>{report.content.homeName}</Text>
      <Text fixed style={styles.resident}><Text style={styles.label}>Resident: </Text>{report.clientName} | <Text style={styles.label}>Month: </Text>{monthLabel(report.month)}</Text>
      <View style={styles.section}>
        <Text style={styles.meta}>DOB: {shortDate(report.dob)}</Text>
        <Text style={styles.meta}>Caregiver / provider: {report.authorName}</Text>
      </View>
      {monthlySections.map((section, index) => {
        const data = report.content.sections[section.key];
        return <View key={section.key} style={styles.section}>
          <Text style={styles.sectionTitle} minPresenceAhead={30}>{index + 1}. {section.title}</Text>
          <Text style={styles.status}>{data.status ? observationLabels[data.status] : "Observation not recorded"}</Text>
          {section.key === "adls" && <Field label="Assistance provided" value={adlOptions.filter((option) => report.content.adlAssistance.includes(option)).join("; ")} />}
          {section.key === "medication" && <Field label="Medications administered as prescribed" value={report.content.medicationAdministration ? medicationLabels[report.content.medicationAdministration] : ""} />}
          {section.fields.map((field) => data.notes[field.key] ? <Field key={field.key} label={field.label} value={data.notes[field.key]} /> : data.status ? null : <Field key={field.key} label={field.label} value="" />)}
          {section.key === "changes" && <>
            <Field label="Significant changes, incidents, or concerns" value={report.content.significantChanges === "YES" ? "Yes" : report.content.significantChanges === "NO" ? "No" : report.content.significantChanges === "NOT_ASSESSED" ? "Not assessed" : ""} />
            {report.content.events.map((event, eventIndex) => <View key={eventIndex} style={styles.event}>
              <Text style={styles.label} minPresenceAhead={30}>Change {eventIndex + 1} - {eventDate(event.date)}</Text>
              <Field label="What happened" value={event.description} /><Field label="Action taken / resident response" value={event.action} />
              <Field label="Notification" value={event.notification ? notificationLabels[event.notification] : ""} />
              {(event.notifiedWho || event.notification === "NOTIFIED") && <Field label="Who was notified" value={event.notifiedWho} />}
              {event.notifiedAt && <Field label="Notification date and time (Pacific)" value={eventDate(event.notifiedAt) + " " + event.notifiedAt.slice(11)} />}
              {event.followUp && <Field label="Follow-up / outcome" value={event.followUp} />}
            </View>)}
          </>}
        </View>;
      })}
      <View style={styles.section}><Text style={styles.sectionTitle} minPresenceAhead={30}>10. Overall Monthly Summary</Text><Text>{report.content.summary || "Not documented"}</Text></View>
      <View wrap={false} style={styles.signature}>
        <View style={styles.signatureRow}><View style={{ width: "70%" }}><Text>Careprovider initial</Text><View style={styles.line} /></View><View style={{ width: "26%" }}><Text>Date</Text><View style={styles.line} /></View></View>
      </View>
      <View fixed style={styles.footerLine} />
      <Text fixed style={styles.footer}>{report.clientName} | {monthLabel(report.month)}</Text>
      <Text fixed style={styles.pageNumber} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </Page>)}
  </Document>;
}
