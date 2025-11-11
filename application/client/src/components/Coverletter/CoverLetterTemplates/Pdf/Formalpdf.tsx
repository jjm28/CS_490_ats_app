import React from "react";
import { Document, Page, Text, View, Font } from "@react-pdf/renderer";
import { createTw } from "react-pdf-tailwind";

Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v12/UcCO3Fwr08GpBW2Qq4IO.ttf" }, // regular
    { src: "https://fonts.gstatic.com/s/inter/v12/UcCO3Fwr08GpBW2Qq4IO.ttf", fontStyle: "italic" },
    { src: "https://fonts.gstatic.com/s/inter/v12/UcCO3Fwr08GpBW2Qq4IO.ttf", fontWeight: 600 },
  ],
});

const tw = createTw({
  theme: {
    fontFamily: { sans: ["Inter", "Helvetica", "Arial", "sans-serif"] },
  },
});

export type CoverLetterData = {
  name: string;
  phonenumber: string;
  email: string;
  address: string;
  date: string;
  recipientLines: string[];
  greeting: string;
  paragraphs: string[] | string; // allow either
  closing: string;
  signatureNote: string;
};

function sanitize(str?: string) {
  return (str || "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "") // strip weird chars
    .replace(/\r?\n/g, " ")
    .trim();
}

function sanitizeParagraphs(input: string[] | string): string[] {
  if (!input) return [];
  const text = Array.isArray(input) ? input.join("\n") : input;
  return text
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .split(/\n{2,}|\n|\r/) // split by newlines or double newlines
    .map(p => p.trim())
    .filter(Boolean);
}

export default function FormalPDF(props: CoverLetterData) {
  if (!props || typeof props !== "object") {
    return (
      <Document>
        <Page size="A4" style={tw("p-12 bg-white")}>
          <Text>Invalid or missing data.</Text>
        </Page>
      </Document>
    );
  }

  const {
    name,
    phonenumber,
    email,
    address,
    date,
    recipientLines,
    greeting,
    paragraphs,
    closing,
    signatureNote,
  } = props;

  const safeParagraphs = sanitizeParagraphs(paragraphs);

  return (
    <Document>
      <Page size="A4" style={tw("p-12 bg-white")}>
        {/* Header */}
        <View style={tw("items-center mb-12")}>
          <Text style={tw("text-xl font-semibold")}>{sanitize(name)}</Text>
          <Text style={tw("text-[9px] text-gray-500 mt-1 text-center")}>
            {sanitize(address)} · {sanitize(phonenumber)} · {sanitize(email)}
          </Text>
        </View>

        <Text style={tw("text-sm mb-6")}>{sanitize(date)}</Text>

        {/* Recipient block */}
        <View style={tw("mb-6")}>
          {recipientLines.map((line, i) => (
            <Text key={i} style={tw("text-sm")}>
              {sanitize(line)}
            </Text>
          ))}
        </View>

        <Text style={tw("text-sm mb-6")}>{sanitize(greeting)}</Text>

        {/* Paragraphs */}
        {safeParagraphs.length > 0 ? (
          safeParagraphs.map((p, i) => (
            <Text key={i} style={tw("text-sm leading-relaxed mb-4")}>
              {p}
            </Text>
          ))
        ) : (
          <Text style={tw("text-sm italic text-gray-500 mb-6")}>
            (No paragraph content)
          </Text>
        )}

        <Text style={tw("text-sm mb-6")}>{sanitize(closing)}</Text>
        <Text style={tw("text-sm italic mb-10")}>{sanitize(signatureNote)}</Text>
        <Text style={tw("text-sm")}>{sanitize(name)}</Text>
      </Page>
    </Document>
  );
}
