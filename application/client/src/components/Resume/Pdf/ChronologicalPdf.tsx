// src/components/Resume/Pdf/ChronologicalPdf.tsx
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

export default function ChronologicalPdf({ data }: ResumeDocProps) {
  const exp = Array.isArray(data.experience) ? data.experience : [];
  const edu = Array.isArray(data.education) ? data.education : [];
  const skills = Array.isArray(data.skills) ? data.skills : [];

  const skillNames: string[] = skills
    .map((s: any) => (s && typeof s.name === "string" ? s.name : null))
    .filter(Boolean) as string[];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.name}>{data.name || "Your Name"}</Text>
          {data.summary ? <Text style={styles.line}>{String(data.summary)}</Text> : null}
        </View>

        {exp.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Experience</Text>
            {exp.map((e: any, i: number) => {
              const highlights: string[] = Array.isArray(e?.highlights)
                ? (e.highlights as any[]).map((x) => String(x))
                : [];
              return (
                <View key={i}>
                  <Text style={styles.line}>
                    {`${e?.jobTitle || "Title"} • ${e?.company || "Company"}`}
                  </Text>
                  <Text style={styles.small}>
                    {(e?.startDate || "")} – {(e?.endDate || "Present")}
                    {e?.location ? ` • ${e.location}` : ""}
                  </Text>
                  {highlights.slice(0, 3).map((h: string, j: number) => (
                    <Text key={j} style={styles.small}>• {h}</Text>
                  ))}
                </View>
              );
            })}
          </View>
        )}

        {edu.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Education</Text>
            {edu.map((ed: any, i: number) => (
              <View key={i}>
                <Text style={styles.line}>
                  {(ed?.degree || "Degree") + (ed?.fieldOfStudy ? `, ${ed.fieldOfStudy}` : "")}
                </Text>
                <Text style={styles.small}>
                  {(ed?.institution || "School")}
                  {ed?.graduationDate ? ` • ${ed.graduationDate}` : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        {skillNames.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Skills</Text>
            <Text style={styles.small}>{skillNames.join(", ")}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}