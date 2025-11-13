// pdf/CreativePdf.tsx
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Font,
  Svg,
  Path,
} from "@react-pdf/renderer";
import { createTw } from "react-pdf-tailwind";
import type { CoverLetterData } from "./Formalpdf";

// same font family as your formal PDF
Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v12/UcCO3Fwr08GpBW2Qq4IO.ttf" },
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3Fwr08GpBW2Qq4IO.ttf",
      fontStyle: "italic",
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3Fwr08GpBW2Qq4IO.ttf",
      fontWeight: 700,
    },
  ],
});

const tw = createTw({
  theme: {
    fontFamily: {
      sans: ["Inter", "Helvetica", "Arial", "sans-serif"],
    },
  },
});

// tiny icons for contact row
const PhoneIcon = () => (
  <Svg width={10} height={10} viewBox="0 0 24 24">
    <Path
      fill="#4b5563"
      d="M6.62 10.79a15.05 15.05 0 006.59 6.59l1.87-1.87a1 1 0 011.01-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V21a1 1 0 01-1 1C10.85 22 2 13.15 2 2a1 1 0 011-1h3.16a1 1 0 011 1c0 1.24.2 2.45.57 3.57a1 1 0 01-.24 1.01l-1.87 1.87z"
    />
  </Svg>
);

const MailIcon = () => (
  <Svg width={10} height={10} viewBox="0 0 24 24">
    <Path
      fill="#4b5563"
      d="M20 4H4a2 2 0 00-2 2v.4l10 6 10-6V6a2 2 0 00-2-2zm2 6.2l-10 6-10-6V18a2 2 0 002 2h16a2 2 0 002-2v-7.8z"
    />
  </Svg>
);

const PinIcon = () => (
  <Svg width={10} height={10} viewBox="0 0 24 24">
    <Path
      fill="#4b5563"
      d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7zm0 9.5a2.5 2.5 0 112.5-2.5A2.5 2.5 0 0112 11.5z"
    />
  </Svg>
);

export default function CreativePDF(props: CoverLetterData) {
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

        {/* header row: [sage block] [name centered] [sage block] */}
        <View style={tw("flex-row items-center mb-6")}>
          <View
            style={[
              tw("bg-white rounded"),
              {
                backgroundColor: "#D9E5DB",
                opacity: 0.7,
                width: 170,
                height: 60,
                borderRadius: 4,
              },
            ]}
          />
          <View style={tw("flex-1")}>
            <Text
              style={tw(
                "text-center text-[20px] font-bold tracking-widest uppercase text-[#0E3B43]"
              )}
            >
              {name}
            </Text>
          </View>
          <View
            style={[
              tw("bg-white rounded"),
              {
                backgroundColor: "#D9E5DB",
                opacity: 0.7,
                width: 170,
                height: 60,
                borderRadius: 4,
              },
            ]}
          />
        </View>

        {/* contact row with icons */}
        <View style={tw("items-center mb-12")}>
          <View style={tw("flex-row items-center")}>

            {/* phone */}
            <View style={tw("flex-row items-center mr-16")}>
              <PhoneIcon />
              <Text style={tw("ml-2 text-[9px] text-gray-600 text-[#0E3B43]")}>
                {phonenumber}
              </Text>
            </View>

            {/* email */}
            <View style={tw("flex-row items-center mr-16")}>
              <MailIcon />
              <Text style={tw("ml-2 text-[9px] text-gray-600 text-[#0E3B43]")}>
                {email}
              </Text>
            </View>

            {/* address */}
            <View style={tw("flex-row items-center")}>
              <PinIcon />
              <Text style={tw("ml-2 text-[9px] text-gray-600 text-[#0E3B43]")}>
                {address}
              </Text>
            </View>
          </View>
        </View>

        {/* body */}
        <Text style={tw("text-sm mb-6")}>{date}</Text>

        <View style={tw("mb-6")}>
          {recipientLines.map((line, i) => (
            <Text key={i} style={tw("text-sm text-gray-800")}>
              {line}
            </Text>
          ))}
        </View>

        <Text style={tw("text-sm mb-6 text-gray-900")}>{greeting}</Text>

        {/* paragraphs / bullets */}
        {Array.isArray(paragraphs) && paragraphs.length ? (
          paragraphs.map((p: string, i: number) => {
            const isBullet = p.trim().startsWith("-");

            if (isBullet) {
              return (
                <View key={i} style={tw("mb-2 ml-4")}>
                  {p
                    .split(/(?=- )/)
                    .filter(Boolean)
                    .map((line: string, idx: number) => (
                      <Text
                        key={`${i}-${idx}`}
                        style={tw(
                          "text-sm leading-relaxed mb-1 text-[#0E3B43]"
                        )}
                      >
                        {line.replace(/^-/, "•").trim()}
                      </Text>
                    ))}
                </View>
              );
            }

            return (
              <Text
                key={i}
                style={tw("text-sm leading-relaxed mb-4 text-[#0E3B43]")}
              >
                {p.trim()}
              </Text>
            );
          })
        ) : (
          <Text style={tw("text-sm italic text-gray-500 mb-6")}>
            (No paragraph content)
          </Text>
        )}

        <Text style={tw("text-sm mb-6 text-gray-900")}>{closing}</Text>
        <Text style={tw("text-sm italic mb-10 text-gray-900")}>
          {signatureNote}
        </Text>
        <Text style={tw("text-sm font-semibold text-gray-900")}>{name}</Text>
      </Page>
    </Document>
  );
}
