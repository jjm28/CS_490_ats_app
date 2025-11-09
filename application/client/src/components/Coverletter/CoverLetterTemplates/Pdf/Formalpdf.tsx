// pdf/CoverletterPdf.tsx
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Font,
} from "@react-pdf/renderer";
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
  address:string;
  date: string;
  recipientLines: string[];
  greeting: string;
  paragraphs: string[];
  closing: string;
  signatureNote: string;
};

export default function FormalPDF(props: CoverLetterData) {
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

  return (
    <Document>
      <Page size="A4" style={tw("p-12 bg-white")}>
        <View style={tw("items-center mb-12")}>
          <Text style={tw("text-xl font-semibold")}>{name}</Text>
          <Text style={tw("text-[9px] text-gray-500 mt-1 text-center")}>
             {address +" · " + phonenumber+ " · "+ email}
          </Text>
        </View>

        <Text style={tw("text-sm mb-6")}>{date}</Text>

        <View style={tw("mb-6")}>
          {recipientLines.map((line, i) => (
            <Text key={i} style={tw("text-sm")}>{line}</Text>
          ))}
        </View>

        <Text style={tw("text-sm mb-6")}>{greeting}</Text>

        {paragraphs.map((p, i) => (
          <Text key={i} style={tw("text-sm leading-relaxed mb-6")}>{p}</Text>
        ))}

        <Text style={tw("text-sm mb-6")}>{closing}</Text>
        <Text style={tw("text-sm italic mb-10")}>{signatureNote}</Text>

        <Text style={tw("text-sm")}>{name}</Text>
      </Page>
    </Document>
  );
}
