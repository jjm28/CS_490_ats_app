// src/components/Resume/Pdf/HybridPdf.tsx
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
    paddingTop: 30,
    paddingBottom: 30,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.35,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 8,
    marginBottom: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: 700,
  },
  summary: {
    marginTop: 4,
    color: "#6b7280",
  },
  contactRow: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    color: "#6b7280",
    fontSize: 9,
  },
  contactItem: {
    marginRight: 8,
  },
  bodyRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  colLeft: {
    flex: 0.95,
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: "#e5e7eb",
  },
  colRight: {
    flex: 1.05,
    paddingLeft: 10,
  },
  section: {
    marginTop: 8,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 2,
    marginBottom: 4,
  },
  smallMuted: {
    fontSize: 9,
    color: "#6b7280",
  },
  skillChip: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 4,
    fontSize: 9,
  },
  skillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
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

const HybridPdf: React.FC<ResumeDocProps> = ({ data }) => {
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

  const flatSkills: string[] = skills.flatMap((group: any) =>
    Array.isArray(group.items) ? group.items : group.name ? [group.name] : []
  );

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

        {/* TWO-COLUMN BODY */}
        <View style={styles.bodyRow}>
          {/* LEFT: Skills + Education */}
          <View style={styles.colLeft}>
            {flatSkills.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>Skills</Text>
                <View style={styles.skillsWrap}>
                  {flatSkills.map((skill, idx) => (
                    <Text key={`${skill}-${idx}`} style={styles.skillChip}>
                      {skill}
                    </Text>
                  ))}
                </View>
              </View>
            )}

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
          </View>

          {/* RIGHT: Experience + Projects */}
          <View style={styles.colRight}>
            {experience.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>Experience</Text>
                {experience.map((exp: any, idx: number) => (
                  <View key={idx} style={styles.expItem}>
                    <View style={styles.expHeaderRow}>
                      <View>
                        <Text style={styles.expTitle}>
                          {exp.title || exp.position || "Role"}
                        </Text>
                        {(exp.company || exp.employer) && (
                          <Text style={styles.smallMuted}>
                            {exp.company || exp.employer}
                          </Text>
                        )}
                      </View>
                      {(exp.startDate || exp.endDate || exp.location) && (
                        <View>
                          <Text style={styles.smallMuted}>
                            {(exp.startDate || "") +
                              " – " +
                              (exp.endDate || "Present")}
                          </Text>
                          {exp.location && (
                            <Text style={styles.smallMuted}>
                              {exp.location}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>

                    {Array.isArray(exp.highlights) &&
                      exp.highlights.length > 0 && (
                        <View style={styles.bulletList}>
                          {exp.highlights
                            .slice(0, 4)
                            .map((h: string, i: number) => (
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

            {projects.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>Projects</Text>
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
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default HybridPdf;
