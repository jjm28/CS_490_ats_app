// src/components/Resume/Pdf/FunctionalPdf.tsx
import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { ResumeDocProps } from "..";

const styles = StyleSheet.create({
  page: { padding: 28 },
  name: { fontSize: 18, fontWeight: 700, marginBottom: 6 },
  sectionTitle: { fontSize: 12, marginTop: 10, marginBottom: 4, textTransform: "uppercase" },
  line: { fontSize: 10, marginBottom: 3 },
  small: { fontSize: 9, color: "#444" },
});

export default function FunctionalPdf({ data }: ResumeDocProps) {
  const skillsArr = Array.isArray(data.skills) ? data.skills : [];
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const exp = Array.isArray(data.experience) ? data.experience : [];

  const skillNames: string[] = skillsArr
    .map((s: any) => (s && typeof s.name === "string" ? s.name : null))
    .filter(Boolean) as string[];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{data.name || "Your Name"}</Text>
        {data.summary ? <Text style={styles.line}>{String(data.summary)}</Text> : null}

        {skillNames.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Core Skills</Text>
            <Text style={styles.small}>{skillNames.join(", ")}</Text>
          </View>
        )}

        {projects.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Selected Projects</Text>
            {projects.slice(0, 3).map((p: any, i: number) => (
              <View key={i}>
                <Text style={styles.line}>{p?.name ? String(p.name) : "Project"}</Text>
                {p?.technologies ? <Text style={styles.small}>{String(p.technologies)}</Text> : null}
                {p?.outcomes ? <Text style={styles.small}>{String(p.outcomes)}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {exp.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Experience Highlights</Text>
            {exp.slice(0, 2).map((e: any, i: number) => {
              const highlights: string[] = Array.isArray(e?.highlights)
                ? (e.highlights as any[]).map((x) => String(x))
                : [];
              return (
                <View key={i}>
                  <Text style={styles.line}>
                    {`${e?.jobTitle || "Title"} • ${e?.company || "Company"}`}
                  </Text>
                  {highlights.slice(0, 2).map((h: string, j: number) => (
                    <Text key={j} style={styles.small}>• {h}</Text>
                  ))}
                </View>
              );
            })}
          </View>
        )}
      </Page>
    </Document>
  );
}
