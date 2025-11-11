import React from "react";
import { Document, Page, Text, View, Font, StyleSheet } from "@react-pdf/renderer";
import { createTw } from "react-pdf-tailwind";
import type { ResumeData } from "..";

Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v12/UcCO3Fwr08GpBW2Qq4IO.ttf" },
    { src: "https://fonts.gstatic.com/s/inter/v12/UcCO3Fwr08GpBW2Qq4IO.ttf", fontStyle: "italic" },
    { src: "https://fonts.gstatic.com/s/inter/v12/UcCO3Fwr08GpBW2Qq4IO.ttf", fontWeight: 700 },
  ],
});
const tw = createTw({ theme: { fontFamily: { sans: ["Inter", "Helvetica", "Arial", "sans-serif"] } } });

export default function ChronologicalPdf(props: ResumeData) {
  const { name, title, email, phone, location, summary, experience, education, skills, projects } = props;
  const primary = props.style?.color?.primary ?? "#111827";
  const fontFamily = props.style?.font?.family === "Serif" ? "Times-Roman" : "Inter";
  const sizeScale = props.style?.font?.sizeScale ?? "M";
  const baseSize = sizeScale === "S" ? 11 : sizeScale === "L" ? 13 : 12;

  const styles = StyleSheet.create({
    heading: { color: primary },
    base: { fontFamily, fontSize: baseSize },
  });

  return (
    <Document>
      <Page size="A4" style={[tw("p-12 bg-white"), styles.base]}>
        <View style={tw("items-center mb-8")}>
          <Text style={[tw("text-xl font-bold"), styles.heading]}>{name}</Text>
          <Text style={tw("text-[10px] text-gray-500 mt-1")}>{[title, location].filter(Boolean).join(" • ")}</Text>
          <Text style={tw("text-[10px] text-gray-500")}>{[email, phone].filter(Boolean).join(" • ")}</Text>
        </View>

        {summary ? (
          <View style={tw("mb-6")}>
            <Text style={[tw("text-[10px] uppercase tracking-wide mb-1"), styles.heading]}>Summary</Text>
            <Text style={tw("text-[12px] leading-relaxed")}>{summary}</Text>
          </View>
        ) : null}

        {!!experience?.length && (
          <View style={tw("mb-6")}>
            <Text style={[tw("text-[10px] uppercase tracking-wide mb-1"), styles.heading]}>Experience</Text>
            {[...experience].slice().reverse().map((job, i) => (
              <View key={i} style={tw("mb-2")}>
                <View style={tw("flex-row items-baseline")}>
                  <Text style={tw("text-[12px] font-semibold")}>{job.role}</Text>
                  <Text style={tw("text-[12px] text-gray-700")}> • {job.company}</Text>
                  <Text style={tw("ml-auto text-[10px] text-gray-500")}>{job.start} – {job.end}</Text>
                </View>
                {!!job.bullets?.length && job.bullets.map((b, j) => (
                  <Text key={j} style={tw("text-[11px] ml-3")}>• {b}</Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {!!education?.length && (
          <View style={tw("mb-6")}>
            <Text style={[tw("text-[10px] uppercase tracking-wide mb-1"), styles.heading]}>Education</Text>
            {education.map((ed, i) => (
              <View key={i} style={tw("mb-1")}>
                <Text style={tw("text-[12px] font-semibold")}>{ed.school}</Text>
                <Text style={tw("text-[11px] text-gray-700")}>{ed.degree}</Text>
                {ed.years ? <Text style={tw("text-[10px] text-gray-500")}>{ed.years}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {!!skills?.length && (
          <View style={tw("mb-6")}>
            <Text style={[tw("text-[10px] uppercase tracking-wide mb-1"), styles.heading]}>Skills</Text>
            <Text style={tw("text-[12px]")}>{skills.join(" • ")}</Text>
          </View>
        )}

        {!!projects?.length && (
          <View>
            <Text style={[tw("text-[10px] uppercase tracking-wide mb-1"), styles.heading]}>Projects</Text>
            {projects.map((p, i) => (
              <View key={i} style={tw("mb-2")}>
                <Text style={tw("text-[12px] font-semibold")}>{p.name}</Text>
                {p.summary ? <Text style={tw("text-[11px]")}>{p.summary}</Text> : null}
                {!!p.bullets?.length && p.bullets.map((b, j) => (
                  <Text key={j} style={tw("text-[11px] ml-3")}>• {b}</Text>
                ))}
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
