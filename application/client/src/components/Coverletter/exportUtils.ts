import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun } from "docx";
import type { CoverLetterData } from "./CoverLetterTemplates/Pdf/Formalpdf";

// ---------------------------
// FILENAME CLEANER
// ---------------------------
export function generateFilename(baseName: string, extension: string) {
  const clean = baseName.replace(/[^\w\d-_]+/g, "_");
  return `${clean}.${extension}`;
}

// ---------------------------
// TXT EXPORT
// ---------------------------
export function exportTXT(data: CoverLetterData, baseFilename: string) {
  const content = `
${data.name}
${data.address}
${data.phonenumber} | ${data.email}

${data.date}

${data.recipientLines.join("\n")}

${data.greeting}

${Array.isArray(data.paragraphs) ? data.paragraphs.join("\n\n") : data.paragraphs}

${data.closing}

${data.signatureNote}
  `.trim();

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  saveAs(blob, generateFilename(baseFilename, "txt"));
}

// ---------------------------
// DOCX EXPORT
// ---------------------------
export async function exportDOCX(data: CoverLetterData, baseFilename: string) {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      children: [new TextRun({ text: data.name, bold: true, size: 28 })],
    })
  );

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${data.address} | ${data.phonenumber} | ${data.email}`,
          size: 20,
        }),
      ],
    })
  );

  paragraphs.push(new Paragraph(" "));
  paragraphs.push(new Paragraph(data.date));

  data.recipientLines.forEach((line) => paragraphs.push(new Paragraph(line)));

  paragraphs.push(new Paragraph(" "));
  paragraphs.push(new Paragraph(data.greeting));
  paragraphs.push(new Paragraph(" "));

  if (Array.isArray(data.paragraphs)) {
    data.paragraphs.forEach((p) => {
      if (p.trim().startsWith("-")) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: "• " + p.replace(/^-/, "").trim(), size: 22 }),
            ],
          })
        );
      } else {
        paragraphs.push(new Paragraph(p));
      }
    });
  }

  paragraphs.push(new Paragraph(" "));
  paragraphs.push(new Paragraph(data.closing));
  paragraphs.push(new Paragraph(data.signatureNote));
  paragraphs.push(new Paragraph(data.name));

  const doc = new Document({
    sections: [{ children: paragraphs }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, generateFilename(baseFilename, "docx"));
}

// ---------------------------
// PRINT VERSION
// ---------------------------
export function openPrintWindow(data: CoverLetterData) {
  const html = `
<html>
  <head>
    <title>Print Cover Letter</title>
    <style>
      body { font-family: Arial; padding: 40px; }
      .paragraph { margin-bottom: 16px; }
    </style>
  </head>
  <body>
    <h2>${data.name}</h2>
    <div>${data.address} | ${data.phonenumber} | ${data.email}</div>
    <br/>
    <div>${data.date}</div>
    <br/>
    <div>${data.recipientLines.join("<br/>")}</div>
    <br/>
    <div>${data.greeting}</div>
    <br/>
    ${
      Array.isArray(data.paragraphs)
        ? data.paragraphs
            .map((p) => `<div class="paragraph">${p}</div>`)
            .join("")
        : `<div>${data.paragraphs}</div>`
    }
    <br/>
    <div>${data.closing}</div>
    <div>${data.signatureNote}</div>
    <br/>
    <div>${data.name}</div>
    <script>window.print();</script>
  </body>
</html>
`;

  const win = window.open("", "_blank");
  win!.document.write(html);
  win!.document.close();
}
