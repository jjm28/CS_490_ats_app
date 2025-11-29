// src/components/Resume/Pdf/ChronologicalPdf.tsx
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
    fontSize: 10,
    fontFamily: "Helvetica",
    lineHeight: 1.35,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    paddingBottom: 8,
    marginBottom: 10,
  },
  name: {
    fontSize: 18,
    fontWeight: 700,
  },
  summary: {
    marginTop: 4,
    color: "#4b5563",
    fontSize: 10,
  },
  contactRow: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    color: "#4b5563",
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
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 2,
    marginBottom: 4,
  },
  sectionContent: {
    fontSize: 10,
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
  expCompany: {
    color: "#4b5563",
    marginTop: 2,
    fontSize: 9,
  },
  expMeta: {
    color: "#4b5563",
    fontSize: 9,
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
  eduSchool: {
    fontWeight: 700,
  },
  smallMuted: {
    color: "#4b5563",
    fontSize: 9,
  },
  skillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
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
});

const ChronologicalPdf: React.FC<ResumeDocProps> = ({ data }) => {
  const contact: any = (data as any).contact || {};
  const experience = Array.isArray((data as any).experience)
    ? (data as any).experience
    : [];
  const education = Array.isArray((data as any).education)
    ? (data as any).education
    : [];
  const projects = Array.isArray((data as any).projects)
    ? (data as any).projects
    : [];
  const skills = Array.isArray((data as any).skills)
    ? (data as any).skills
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

        {/* EXPERIENCE */}
        {experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Experience</Text>
            <View style={styles.sectionContent}>
              {experience.map((exp: any, idx: number) => (
                <View key={idx} style={styles.expItem}>
                  <View style={styles.expHeaderRow}>
                    <View>
                      <Text style={styles.expTitle}>
                        {exp.title || exp.position || "Role"}
                      </Text>
                      {(exp.company || exp.employer) && (
                        <Text style={styles.expCompany}>
                          {exp.company || exp.employer}
                        </Text>
                      )}
                    </View>
                    {(exp.startDate || exp.endDate || exp.location) && (
                      <View>
                        <Text style={styles.expMeta}>
                          {(exp.startDate || "") +
                            " – " +
                            (exp.endDate || "Present")}
                        </Text>
                        {exp.location && (
                          <Text style={styles.expMeta}>{exp.location}</Text>
                        )}
                      </View>
                    )}
                  </View>

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
          </View>
        )}

        {/* EDUCATION */}
        {education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Education</Text>
            <View style={styles.sectionContent}>
              {education.map((ed: any, idx: number) => (
                <View key={idx} style={styles.eduItem}>
                  <View style={styles.expHeaderRow}>
                    <Text style={styles.eduSchool}>
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
                  {ed.gpa && (
                    <Text style={styles.smallMuted}>GPA: {ed.gpa}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* SKILLS */}
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

        {/* PROJECTS */}
        {projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Projects</Text>
            <View style={styles.sectionContent}>
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
          </View>
        )}
      </Page>
    </Document>
  );
};

export default ChronologicalPdf;
