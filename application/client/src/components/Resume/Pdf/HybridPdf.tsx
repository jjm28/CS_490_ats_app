// src/components/Resume/Pdf/HybridPdf.tsx
import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { ResumeDocProps } from "..";

const styles = StyleSheet.create({
  page: { padding: 28 },
  name: { fontSize: 18, fontWeight: 700, marginBottom: 6 },
  sectionTitle: { fontSize: 12, marginTop: 10, marginBottom: 4, textTransform: "uppercase" },
  line: { fontSize: 10, marginBottom: 3 },
  small: { fontSize: 9, color: "#444" },
  twoCol: { flexDirection: "row", gap: 12 },
  col: { flexGrow: 1 },
});

export default function HybridPdf({ data }: ResumeDocProps) {
  const exp = Array.isArray(data.experience) ? data.experience : [];
  const skillsArr = Array.isArray(data.skills) ? data.skills : [];
  const edu = Array.isArray(data.education) ? data.education : [];

  const skillNames: string[] = skillsArr
    .map((s: any) => (s && typeof s.name === "string" ? s.name : null))
    .filter(Boolean) as string[];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{data.name || "Your Name"}</Text>
        {data.summary ? <Text style={styles.line}>{String(data.summary)}</Text> : null}

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Experience</Text>
            {exp.slice(0, 3).map((e: any, i: number) => (
              <View key={i}>
                <Text style={styles.line}>
                  {`${e?.jobTitle || "Title"} • ${e?.company || "Company"}`}
                </Text>
                <Text style={styles.small}>
                  {(e?.startDate || "")} – {(e?.endDate || "Present")}
                  {e?.location ? ` • ${e.location}` : ""}
                </Text>
              </View>
            ))}

            {edu.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Education</Text>
                {edu.slice(0, 2).map((ed: any, i: number) => (
                  <View key={i}>
                    <Text style={styles.line}>
                      {(ed?.degree || "Degree") + (ed?.fieldOfStudy ? `, ${ed.fieldOfStudy}` : "")}
                    </Text>
                    <Text style={styles.small}>
                      {(ed?.institution || "School")} {ed?.graduationDate ? `• ${ed.graduationDate}` : ""}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </View>

          <View style={styles.col}>
            {skillNames.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Skills</Text>
                <Text style={styles.small}>{skillNames.join(", ")}</Text>
              </>
            )}
          </View>
        </View>
      </Page>
    </Document>
  );
}