// src/components/Resume/Pdf/FunctionalPdf.tsx
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ResumeDocProps } from "..";

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.35,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingBottom: 8,
    marginBottom: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: 700,
  },
  summary: {
    marginTop: 12,
    color: "#000000",
  },
  contactRow: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    color: "#000000",
    fontSize: 9,
  },
  contactItem: {
    marginRight: 8,
  },
  section: {
    marginTop: 10,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    paddingBottom: 2,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
  },
  skillBlock: {
    borderWidth: 1,
    borderColor: "#000000",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginBottom: 4,
  },
  skillHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  skillTitle: {
    fontWeight: 700,
  },
  skillLevel: {
    fontSize: 9,
    color: "#000000",
  },
  skillItemsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  skillChip: {
    fontSize: 9,
    borderWidth: 1,
    borderColor: "#000000",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 4,
  },
  smallMuted: {
    color: "#000000",
    fontSize: 9,
  },
  expItem: {
    marginBottom: 6,
  },
  expHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  expTitle: {
    fontWeight: 700,
  },
  bulletList: {
    marginTop: 2,
    marginLeft: 10,
  },
  bulletItem: {
    flexDirection: "row",
  },
  bulletDot: {
    width: 8,
  },
  bulletText: {
    flex: 1,
  },
  eduItem: {
    marginBottom: 4,
  },
});

const FunctionalPdf: React.FC<ResumeDocProps> = ({ data }) => {
  const contact: any = (data as any).contact || {};
  const skills = Array.isArray((data as any).skills)
    ? (data as any).skills
    : [];
  const experience = Array.isArray((data as any).experience)
    ? (data as any).experience
    : [];
  const projects = Array.isArray((data as any).projects)
    ? (data as any).projects
    : [];
  const education = Array.isArray((data as any).education)
    ? (data as any).education
    : [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.name}>{data.name || "Your Name"}</Text>
          {data.summary && <Text style={styles.summary}>{data.summary}</Text>}

          <View style={styles.contactRow}>
            {contact.email && (
              <Text style={styles.contactItem}>{contact.email}</Text>
            )}
            {contact.phone && (
              <Text style={styles.contactItem}>{contact.phone}</Text>
            )}
            {contact.location && (
              <Text style={styles.contactItem}>{contact.location}</Text>
            )}
            {contact.website && (
              <Text style={styles.contactItem}>{contact.website}</Text>
            )}
          </View>
        </View>

        {/* SKILLS – core of functional resume */}
        {skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Skills Overview</Text>
            {skills.map((group: any, idx: number) => (
              <View key={idx} style={styles.skillBlock}>
                <View style={styles.skillHeaderRow}>
                  <Text style={styles.skillTitle}>
                    {group.category || group.name || "Skill Group"}
                  </Text>
                  {group.level && (
                    <Text style={styles.skillLevel}>{group.level}</Text>
                  )}
                </View>
                {Array.isArray(group.items) && group.items.length > 0 && (
                  <View style={styles.skillItemsRow}>
                    {group.items.map((s: string, i: number) => (
                      <Text key={i} style={styles.skillChip}>
                        {s}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* EXPERIENCE HIGHLIGHTS */}
        {experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Experience Highlights</Text>
            {experience.map((exp: any, idx: number) => (
              <View key={idx} style={styles.expItem}>
                <View style={styles.expHeaderRow}>
                  <Text style={styles.expTitle}>
                    {exp.title || exp.position || "Role"}
                  </Text>
                  {(exp.company || exp.employer) && (
                    <Text style={styles.smallMuted}>
                      {exp.company || exp.employer}
                    </Text>
                  )}
                </View>
                {(exp.startDate || exp.endDate) && (
                  <Text style={styles.smallMuted}>
                    {(exp.startDate || "") +
                      " – " +
                      (exp.endDate || "Present")}
                  </Text>
                )}
                {Array.isArray(exp.highlights) &&
                  exp.highlights.length > 0 && (
                    <View style={styles.bulletList}>
                      {exp.highlights.slice(0, 4).map((h: string, i: number) => (
                        <View key={i} style={styles.bulletItem}>
                          <Text style={styles.bulletDot}>•</Text>
                          <Text style={styles.bulletText}>{h}</Text>
                        </View>
                      ))}
                    </View>
                  )}
              </View>
            ))}
          </View>
        )}

        {/* PROJECTS */}
        {projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Representative Projects</Text>
            {projects.map((proj: any, idx: number) => (
              <View key={idx} style={styles.expItem}>
                <View style={styles.expHeaderRow}>
                  <Text style={styles.expTitle}>
                    {proj.name || "Project Name"}
                  </Text>
                  {proj.link && (
                    <Text style={styles.smallMuted}>{proj.link}</Text>
                  )}
                </View>
                {proj.summary && (
                  <Text style={styles.smallMuted}>{proj.summary}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* EDUCATION */}
        {education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Education</Text>
            {education.map((ed: any, idx: number) => (
              <View key={idx} style={styles.eduItem}>
                <View style={styles.expHeaderRow}>
                  <Text style={{ fontWeight: 700 }}>
                    {ed.school || ed.institution || "School Name"}
                  </Text>
                  {(ed.startDate || ed.endDate) && (
                    <Text style={styles.smallMuted}>
                      {(ed.startDate || "") +
                        " – " +
                        (ed.endDate || "Present")}
                    </Text>
                  )}
                </View>
                {ed.degree && (
                  <Text style={styles.smallMuted}>
                    {ed.degree}
                    {ed.field ? ` · ${ed.field}` : ""}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
};

export default FunctionalPdf;
