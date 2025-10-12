import { saveAs } from "file-saver";
import {
  Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell,
  WidthType, TextRun
} from "docx";

export async function exportTextOnlyDocx(opts: {
  perFile: { name: string; paragraphs: string[]; words: number }[];
  totalWords: number;
}) {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ text: "Word Count (Text Only)", heading: HeadingLevel.TITLE }),
        new Paragraph({ text: `Total words: ${opts.totalWords}` }),
        ...opts.perFile.flatMap(f => [
          new Paragraph({ text: "" }),
          new Paragraph({ text: f.name, heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: `Words: ${f.words}` }),
          ...f.paragraphs.map(p => new Paragraph(p))
        ])
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "word-count-text-only.docx");
}

// The type definition for 'opts' is the only part that has been changed.
export async function exportTranslatorDocx(opts: {
  rows: { file: string; start: number; speaker: string; source: string; translation: string }[];
  includeTimestamps: boolean; // <-- THIS LINE IS THE FIX
}) {
  const headers = ["File", "Speaker", "Source", "Translation"];
  if (opts.includeTimestamps) {
    headers.splice(1, 0, "Start"); // Insert "Start" column if needed
  }
  
  const header = new TableRow({
    children: headers.map(h =>
      new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, children: [new Paragraph({ text: h })] })
    )
  });

  const rows = opts.rows.map(r => {
    const cells = [
      cell(r.file),
      cell(r.speaker || ""),
      cell(r.source),
      cell("") // Empty translation cell
    ];
    if (opts.includeTimestamps) {
      cells.splice(1, 0, cell(formatTime(r.start))); // Insert time cell if needed
    }
    return new TableRow({ children: cells });
  });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [header, ...rows]
  });

  const doc = new Document({
    sections: [{ properties: {}, children: [
      new Paragraph({ text: "Translator Package", heading: HeadingLevel.TITLE }),
      table
    ]}]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "translator-package.docx");
}

export async function exportArchiveDocx(files: Record<string,string>) {
  const children = [];
  for (const name of Object.keys(files)) {
    children.push(new Paragraph({ text: name, heading: HeadingLevel.HEADING_2 }));
    const lines = files[name].replace(/\r/g,"").split("\n");
    for (const ln of lines) {
      children.push(new Paragraph({ children: [new TextRun({ text: ln || " ", font: "Consolas" })] }));
    }
    children.push(new Paragraph({ text: "" }));
  }

  const doc = new Document({
    sections: [{ properties: {}, children }]
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, "archive-originals.docx");
}

function cell(text: string) {
  return new TableCell({ children: [new Paragraph({ text })] });
}

function formatTime(sec: number) {
  const h = Math.floor(sec/3600);
  const m = Math.floor((sec%3600)/60);
  const s = Math.floor(sec%60);
  return [h,m,s].map(v => v.toString().padStart(2,"0")).join(":");
}
