import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Behavior, CBHSEntry, Client, EntryBehavior, User } from "@prisma/client";

type EntryWithRelations = CBHSEntry & {
  client: Client;
  staff: User;
  behaviors: Array<EntryBehavior & { behavior: Behavior }>;
};

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: "#173036", fontFamily: "Helvetica" },
  header: { borderBottom: "1px solid #9fb6ba", paddingBottom: 10, marginBottom: 14 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  section: { marginTop: 12 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 4, color: "#0f6974" },
  row: { flexDirection: "row", gap: 8, marginBottom: 3 },
  label: { width: 120, fontWeight: 700 },
  value: { flex: 1 },
  behavior: { marginBottom: 5, padding: 6, border: "1px solid #d3e0e2" },
  signature: { marginTop: 16, padding: 8, border: "1px solid #0f6974" }
});

export function CBHSReport({ entry }: { entry: EntryWithRelations }) {
  return (
    <Document title={`CBHS Report ${entry.client.clientId}`}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Community Behavioral Health Support Daily Report</Text>
          <Text>Provider ID Header: Local CBHS Secure Logs</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client & Session</Text>
          <View style={styles.row}><Text style={styles.label}>Client</Text><Text style={styles.value}>{entry.client.name}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Client ID</Text><Text style={styles.value}>{entry.client.clientId}</Text></View>
          <View style={styles.row}><Text style={styles.label}>DOB</Text><Text style={styles.value}>{entry.client.dob.toLocaleDateString()}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Date</Text><Text style={styles.value}>{entry.date.toLocaleDateString()}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Duration</Text><Text style={styles.value}>{entry.durationMinutes} minutes</Text></View>
          <View style={styles.row}><Text style={styles.label}>Staff</Text><Text style={styles.value}>{entry.staff.name}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Target Behaviors</Text>
          {entry.behaviors.map(({ behavior }) => (
            <View key={behavior.id} style={styles.behavior}>
              <Text>{behavior.name} | {behavior.category} | Severity {behavior.severity}</Text>
              <Text>{behavior.description}</Text>
              <Text>Default interventions: {behavior.defaultInterventions}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}><Text style={styles.sectionTitle}>Antecedents / Triggers</Text><Text>{entry.triggers}</Text></View>
        <View style={styles.section}><Text style={styles.sectionTitle}>Staff Interventions</Text><Text>{entry.staffInterventions}</Text></View>
        <View style={styles.section}><Text style={styles.sectionTitle}>Outcome / Baseline Status</Text><Text>{entry.outcome}</Text></View>
        <View style={styles.section}><Text style={styles.sectionTitle}>Daily Summative Note</Text><Text>{entry.summativeNote}</Text></View>

        <View style={styles.signature}>
          <Text>Electronically signed by {entry.signatureText} on {entry.signatureTimestamp?.toLocaleString()}.</Text>
          <Text>This record is locked after signature.</Text>
        </View>
      </Page>
    </Document>
  );
}
