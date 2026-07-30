import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { CBHSEntry, Client, User, WeeklySummary } from "@prisma/client";
import { cbhsStandardLines, parseBehaviorFrequencies } from "@/lib/cbhs-standard-lines";

type SummaryWithRelations = WeeklySummary & { client: Client; staff: User };
type EntryWithRelations = CBHSEntry & {
  staff: User;
};

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, color: "#173036", fontFamily: "Helvetica" },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 3 },
  subtitle: { fontSize: 9, color: "#506368" },
  header: { borderBottom: "1px solid #92a9ad", paddingBottom: 8, marginBottom: 10 },
  section: { marginTop: 10 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: "#0f6974", marginBottom: 5 },
  row: { flexDirection: "row", borderBottom: "1px solid #d8e3e5", minHeight: 20 },
  cell: { padding: 4, borderRight: "1px solid #d8e3e5" },
  label: { fontWeight: 700 },
  box: { border: "1px solid #d8e3e5", padding: 6, marginTop: 4 },
  behavior: { marginBottom: 4 },
  dayHeader: { backgroundColor: "#edf4f4", fontWeight: 700 },
  signature: { marginTop: 12, padding: 8, border: "1px solid #0f6974" },
  footer: { position: "absolute", bottom: 16, left: 28, right: 28, fontSize: 8, color: "#607075", borderTop: "1px solid #d8e3e5", paddingTop: 4 }
});

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function shortDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]?.toUpperCase()).join("").slice(0, 3);
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
      <Page size="LETTER" style={styles.page}>
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
          {dayNames.map((dayName, dayIndex) => {
            const dayEntries = entries.filter((entry) => entry.date.getDay() === dayIndex);
            return (
              <View key={dayName} wrap={false}>
                <View style={[styles.row, styles.dayHeader]}>
                  <Text style={[styles.cell, { width: "14%" }]}>{dayName}</Text>
                  <Text style={[styles.cell, { width: "14%" }]}>Service Date</Text>
                  <Text style={[styles.cell, { width: "18%" }]}>Time</Text>
                  <Text style={[styles.cell, { width: "44%" }]}>Frequency with behaviors and interventions</Text>
                  <Text style={[styles.cell, { width: "10%", borderRightWidth: 0 }]}>Staff</Text>
                </View>
                {dayEntries.length ? dayEntries.map((entry) => {
                  const frequencies = parseBehaviorFrequencies(entry.behaviorFrequencies);
                  return (
                    <View key={entry.id} style={styles.row}>
                      <Text style={[styles.cell, { width: "14%" }]}>{dayName}</Text>
                      <Text style={[styles.cell, { width: "14%" }]}>{shortDate(entry.date)}</Text>
                      <Text style={[styles.cell, { width: "18%" }]}>{entry.servicePeriods}</Text>
                      <Text style={[styles.cell, { width: "44%" }]}>
                        {cbhsStandardLines.map((line) => `${line.line}: ${frequencies[String(line.line)] || ""}`).join("   ")}
                        {"\n"}Daily summative note: {entry.summativeNote}
                      </Text>
                      <Text style={[styles.cell, { width: "10%", borderRightWidth: 0 }]}>{initials(entry.staff.name)}</Text>
                    </View>
                  );
                }) : (
                  <View style={styles.row}>
                    <Text style={[styles.cell, { width: "14%" }]}>{dayName}</Text>
                    <Text style={[styles.cell, { width: "14%" }]}>Leave blank if none</Text>
                    <Text style={[styles.cell, { width: "18%" }]} />
                    <Text style={[styles.cell, { width: "44%" }]} />
                    <Text style={[styles.cell, { width: "10%", borderRightWidth: 0 }]} />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <Text style={styles.footer}>CBHS weekly report generated from signed daily logs and signed weekly attestation.</Text>
      </Page>

      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Weekly Summary and Attestation</Text>
          <Text style={styles.subtitle}>{summary.client.name} | {shortDate(summary.weekStart)} - {shortDate(summary.weekEnd)}</Text>
        </View>
        <View style={styles.section}><Text style={styles.sectionTitle}>Weekly Summary</Text><Text style={styles.box}>{summary.narrative}</Text></View>
        <View style={styles.section}><Text style={styles.sectionTitle}>Unusual Events</Text><Text style={styles.box}>{summary.unusualEvents || "None noted."}</Text></View>
        <View style={styles.section}><Text style={styles.sectionTitle}>Interventions Used</Text><Text style={styles.box}>{summary.interventionsUsed}</Text></View>
        <View style={styles.section}><Text style={styles.sectionTitle}>Effectiveness / Outcome</Text><Text style={styles.box}>{summary.effectiveness}</Text></View>
        <View style={styles.signature}>
          <Text>A representative of the organization attests to the accuracy of this weekly CBHS information.</Text>
          <Text>Printed name: {summary.attestationName || summary.staff.name}</Text>
          <Text>Signature: {summary.signatureText}</Text>
          <Text>Date of signature: {summary.signatureTimestamp?.toLocaleString()}</Text>
        </View>
        <Text style={styles.footer}>HCA-style CBHS supportive supervision weekly packet.</Text>
      </Page>
    </Document>
  );
}
