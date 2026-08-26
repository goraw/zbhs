import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { CBHSEntry, Client, User, WeeklySummary } from "@prisma/client";
import { cbhsStandardLines, parseBehaviorFrequencies } from "@/lib/cbhs-standard-lines";

type SummaryWithRelations = WeeklySummary & { client: Client; staff: User };
type EntryWithRelations = CBHSEntry & {
  staff: User;
  shiftStaff: User | null;
  firstShiftStaff: User | null;
  secondShiftStaff: User | null;
};

const styles = StyleSheet.create({
  page: { paddingTop: 20, paddingRight: 20, paddingBottom: 20, paddingLeft: 44, fontSize: 8, color: "#173036", fontFamily: "Helvetica" },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 8, color: "#506368" },
  header: { borderBottom: "1px solid #92a9ad", paddingBottom: 5, marginBottom: 6 },
  section: { marginTop: 6 },
  sectionTitle: { fontSize: 10, fontWeight: 700, color: "#0f6974", marginBottom: 3 },
  row: { flexDirection: "row", borderBottom: "1px solid #d8e3e5", minHeight: 18 },
  cell: { padding: 3, borderRight: "1px solid #d8e3e5" },
  label: { fontWeight: 700 },
  box: { border: "1px solid #d8e3e5", padding: 4, marginTop: 3 },
  behavior: { marginBottom: 2 },
  dayHeader: { backgroundColor: "#edf4f4", fontWeight: 700 },
  dateLine: { marginTop: 2, color: "#506368" },
  frequencyText: { lineHeight: 1.35 },
  summaryBox: { border: "1px solid #d8e3e5", padding: 5, minHeight: 40, lineHeight: 1.2 },
  signature: { marginTop: 6, padding: 6, border: "1px solid #0f6974" },
  signatureRow: { flexDirection: "row", gap: 14, marginTop: 10 },
  signatureLine: { borderBottom: "1px solid #173036", height: 14 },
  footer: { position: "absolute", bottom: 10, left: 44, right: 20, fontSize: 7, color: "#607075", borderTop: "1px solid #d8e3e5", paddingTop: 3 }
});

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function shortDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]?.toUpperCase()).join("").slice(0, 3);
}

function weekDate(weekStart: Date, dayIndex: number) {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + dayIndex);
  return date;
}

function frequencySummary(frequencies: Record<string, string>) {
  return cbhsStandardLines
    .map((line) => {
      const value = frequencies[String(line.line)];
      return value ? `${line.line} -> ${value}` : "";
    })
    .filter(Boolean)
    .join(", ");
}

function shiftInitials(entry: EntryWithRelations) {
  return initials(entry.shiftStaff?.name ?? entry.firstShiftStaff?.name ?? entry.secondShiftStaff?.name ?? entry.staff.name);
}

export function WeeklyCBHSReport({
  summary,
  entries
}: {
  summary: SummaryWithRelations;
  entries: EntryWithRelations[];
}) {
  return (
    <Document title={`CBHS Weekly Report ${summary.client.clientId}`}>
      <Page size="LETTER" style={styles.page} wrap={false}>
        <View style={styles.header}>
          <Text style={styles.title}>CBHS Supportive Supervision Services Tracking Form</Text>
          <Text style={styles.subtitle}>Community Behavioral Health Supports weekly report</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Client Information</Text>
          <View style={styles.row}>
            <Text style={[styles.cell, { width: "30%" }]}><Text style={styles.label}>Resident: </Text>{summary.client.name}</Text>
            <Text style={[styles.cell, { width: "22%" }]}><Text style={styles.label}>DOB: </Text>{shortDate(summary.client.dob)}</Text>
            <Text style={[styles.cell, { width: "24%" }]}><Text style={styles.label}>Client ID: </Text>{summary.client.clientId}</Text>
            <Text style={[styles.cell, { width: "24%", borderRightWidth: 0 }]}><Text style={styles.label}>Tier: </Text>{summary.client.authorizationTier}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.cell, { width: "50%" }]}><Text style={styles.label}>Week: </Text>{shortDate(summary.weekStart)} - {shortDate(summary.weekEnd)}</Text>
            <Text style={[styles.cell, { width: "50%", borderRightWidth: 0 }]}><Text style={styles.label}>Facility: </Text>Zagol Seniors Care</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Behaviors and Standard Interventions</Text>
          <View style={styles.box}>
            {cbhsStandardLines.map((line) => (
              <Text key={line.line} style={styles.behavior}>
                {line.line}. {line.behavior} with {line.intervention}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Weekly Daily Log</Text>
          <View style={[styles.row, styles.dayHeader]}>
            <Text style={[styles.cell, { width: "24%" }]}>Day / Service Date</Text>
            <Text style={[styles.cell, { width: "18%" }]}>Time</Text>
            <Text style={[styles.cell, { width: "48%" }]}>Frequency with behaviors and interventions</Text>
            <Text style={[styles.cell, { width: "10%", borderRightWidth: 0 }]}>Staff</Text>
          </View>
          {dayNames.map((dayName, dayIndex) => {
            const dayEntries = entries.filter((entry) => entry.date.getDay() === dayIndex);
            const serviceDate = weekDate(summary.weekStart, dayIndex);
            return (
              <View key={dayName} wrap={false}>
                {dayEntries.length ? dayEntries.map((entry) => {
                  const frequencies = parseBehaviorFrequencies(entry.behaviorFrequencies);
                  return (
                    <View key={entry.id} style={styles.row}>
                      <Text style={[styles.cell, { width: "24%" }]}>{dayName}<Text style={styles.dateLine}>{"\n"}{shortDate(entry.date)}</Text></Text>
                      <Text style={[styles.cell, { width: "18%" }]}>{entry.servicePeriods}</Text>
                      <Text style={[styles.cell, styles.frequencyText, { width: "48%" }]}>{frequencySummary(frequencies)}</Text>
                      <Text style={[styles.cell, { width: "10%", borderRightWidth: 0 }]}>{shiftInitials(entry)}</Text>
                    </View>
                  );
                }) : (
                  <View style={styles.row}>
                    <Text style={[styles.cell, { width: "24%" }]}>{dayName}<Text style={styles.dateLine}>{"\n"}{shortDate(serviceDate)}</Text></Text>
                    <Text style={[styles.cell, { width: "18%" }]} />
                    <Text style={[styles.cell, { width: "48%" }]} />
                    <Text style={[styles.cell, { width: "10%", borderRightWidth: 0 }]} />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Weekly Summary</Text>
          <Text style={styles.summaryBox}>{summary.narrative}</Text>
        </View>
        <View style={styles.signature}>
          <Text>A representative of the organization attests to the accuracy of this weekly CBHS information.</Text>
          <View style={styles.signatureRow}>
            <View style={{ width: "68%" }}>
              <Text>Wet signature</Text>
              <Text style={styles.signatureLine}> </Text>
            </View>
            <View style={{ width: "28%" }}>
              <Text>Date</Text>
              <Text style={styles.signatureLine}> </Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>CBHS weekly report generated from signed daily logs and prepared for wet-ink attestation.</Text>
      </Page>
    </Document>
  );
}
