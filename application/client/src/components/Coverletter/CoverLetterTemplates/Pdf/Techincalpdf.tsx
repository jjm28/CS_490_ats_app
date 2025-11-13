// pdf/TechnicalPdf.tsx
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

// ---------- fonts ----------
Font.register({
  family: "Inter",
  fonts: [
    // Swap these to your preferred Inter TTFs if needed.
    { src: "https://fonts.gstatic.com/s/inter/v12/UcCO3Fwr08GpBW2Qq4IO.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/inter/v12/UcCO3Fwr08GpBW2Qq4IO.ttf", fontWeight: 700 },
  ],
});

const tw = createTw({
  theme: {
    fontFamily: {
      sans: ["Inter", "Helvetica", "Arial", "sans-serif"],
    },
  },
});

const COLORS = {
  ink: "#2c4d73",        // name color
  grayRail: "#6b7280",   // left thick rail on header/closing
  lightPanel: "#EFF0F0", // left header panel bg
  card: "#12243b",       // right contact card
  teal: "#2fb4bf",       // accents
  text: "#111827",       // default text (gray-900)
  muted: "#6b7280",      // gray-500
};

// ---------- tiny icons ----------
const PhoneIcon = () => (
  <Svg width={10} height={10} viewBox="0 0 24 24">
    <Path
      fill="#ffffff"
      opacity={0.9}
      d="M6.62 10.79a15.05 15.05 0 006.59 6.59l1.87-1.87a1 1 0 011.01-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V21a1 1 0 01-1 1C10.85 22 2 13.15 2 2a1 1 0 011-1h3.16a1 1 0 011 1c0 1.24.2 2.45.57 3.57a1 1 0 01-.24 1.01l-1.87 1.87z"
    />
  </Svg>
);

const MailIcon = () => (
  <Svg width={10} height={10} viewBox="0 0 24 24">
    <Path
      fill="#ffffff"
      opacity={0.9}
      d="M20 4H4a2 2 0 00-2 2v.4l10 6 10-6V6a2 2 0 00-2-2zm2 6.2l-10 6-10-6V18a2 2 0 002 2h16a2 2 0 002-2v-7.8z"
    />
  </Svg>
);

const PinIcon = () => (
  <Svg width={10} height={10} viewBox="0 0 24 24">
    <Path
      fill="#ffffff"
      opacity={0.9}
      d="M12 2a7 7 0 00-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 00-7-7zm0 9.5a2.5 2.5 0 112.5-2.5A2.5 2.5 0 0112 11.5z"
    />
  </Svg>
);

// ---------- component ----------
export default function TechnicalPDF(props: CoverLetterData) {
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
      <Page size="A4" style={[tw("p-12"), { backgroundColor: "#ffffff" }]}>

        {/* HEADER ROW */}
        <View style={[tw("flex-row items-start mb-6")]}>
          {/* left column (≈1.4fr) */}
          <View style={{ flex: 14, paddingRight: 12 }}>
            <View
              style={{
                backgroundColor: COLORS.lightPanel,
                borderLeftWidth: 7,
                borderLeftColor: COLORS.grayRail,
                padding: 12,
              }}
            >
              <Text
                style={[
                  tw("text-[22px] font-bold"),
                  { color: COLORS.ink, marginBottom: 6 },
                ]}
              >
                {name}
              </Text>

              {/* recipient + date */}
              <View style={{ marginTop: 6 }}>
                <Text
                  style={[
                    tw("uppercase"),
                    { fontSize: 8, color: COLORS.muted, marginBottom: 3 },
                  ]}
                >
                  To
                </Text>

                {!!recipientLines?.length && (
                  <View>
                    <Text
                      style={[
                        tw("font-semibold"),
                        {
                          fontSize: 10,
                          color: "#1f2937",
                          marginBottom: 2,
                        },
                      ]}
                    >
                      {recipientLines[0] || "Company Details"}
                    </Text>

                    {recipientLines.slice(1).map((l, i) => (
                      <Text key={i} style={{ fontSize: 10, color: "#4b5563" }}>
                        {l}
                      </Text>
                    ))}
                  </View>
                )}

                {date ? (
                  <Text
                    style={{
                      fontSize: 10,
                      color: COLORS.muted,
                      fontStyle: "italic",
                      marginTop: 8,
                    }}
                  >
                    {date}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* right column (≈1fr) */}
          <View style={{ flex: 10, position: "relative" }}>
            <View
              style={{
                backgroundColor: COLORS.card,
                borderRadius: 12,
                padding: 14,
                color: "#ffffff",
                borderColor: "#0e1a2a",
                borderWidth: 0.2,
              }}
            >
              {/* contact rows */}
              <View>
                {email ? (
                  <View style={[tw("flex-row items-center"), { marginBottom: 16 }]}>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: "rgba(255,255,255,0.1)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MailIcon />
                    </View>
                    <Text style={[tw("ml-6"), { fontSize: 10, color: "#ffffff" }]}>
                      {email}
                    </Text>
                  </View>
                ) : null}

                {phonenumber ? (
                  <View style={[tw("flex-row items-center"), { marginBottom: 16 }]}>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: "rgba(255,255,255,0.1)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <PhoneIcon />
                    </View>
                    <Text style={[tw("ml-6"), { fontSize: 10, color: "#ffffff" }]}>
                      {phonenumber}
                    </Text>
                  </View>
                ) : null}

                {address ? (
                  <View style={[tw("flex-row items-center")]}>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: "rgba(255,255,255,0.1)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <PinIcon />
                    </View>
                    <Text style={[tw("ml-6"), { fontSize: 10, color: "#ffffff" }]}>
                      {address}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        {/* TEAL CONNECTOR DOT centered between columns */}
        <View style={[tw("flex-row items-center mb-10")]}>
          <View style={{ flex: 14 }} />
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: COLORS.teal,
            }}
          />
          <View style={{ flex: 10 }} />
        </View>

        {/* BODY with teal rail */}
        <View
          style={{
            borderLeftWidth: 7,
            borderLeftColor: COLORS.teal,
            paddingLeft: 14,
            marginBottom: 22,
          }}
        >
          {greeting ? (
            <Text style={[tw("mb-3"), { fontSize: 12, color: COLORS.text }]}>
              {greeting}
            </Text>
          ) : null}

          {Array.isArray(paragraphs) && paragraphs.length ? (
            paragraphs.map((p: string, i: number) => {
              const isBullet = p.trim().startsWith("-");

              if (isBullet) {
                return (
                  <View key={i} style={{ marginLeft: 8, marginBottom: 4 }}>
                    {p
                      .split(/(?=- )/)
                      .filter(Boolean)
                      .map((line: string, idx: number) => (
                        <Text
                          key={`${i}-${idx}`}
                          style={{
                            fontSize: 12,
                            color: COLORS.text,
                            marginBottom: 3,
                            lineHeight: 1.4,
                          }}
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
                  style={{
                    fontSize: 12,
                    color: COLORS.text,
                    marginBottom: 8,
                    lineHeight: 1.6,
                  }}
                >
                  {p.trim()}
                </Text>
              );
            })
          ) : (
            <Text style={{ fontSize: 12, fontStyle: "italic", color: COLORS.muted }}>
              (No paragraph content)
            </Text>
          )}
        </View>

        {/* CLOSING + short gray rail */}
        <View
          style={{
            borderLeftWidth: 7,
            borderLeftColor: COLORS.grayRail,
            paddingLeft: 14,
          }}
        >
          {closing ? (
            <Text style={[tw("mb-2"), { fontSize: 12, color: COLORS.text }]}>
              {closing}
            </Text>
          ) : null}

          {signatureNote ? (
            <Text
              style={[
                tw("mb-2"),
                { fontSize: 12, fontStyle: "italic", color: "#374151" },
              ]}
            >
              {signatureNote}
            </Text>
          ) : null}

          <Text style={{ fontSize: 12, fontWeight: 700, color: COLORS.text }}>
            {name}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
