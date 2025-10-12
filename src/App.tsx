import { useState } from "react";
import { parseSrt } from "./lib/parseSrt";
import { parseVtt } from "./lib/parseVtt";
import { exportTextOnlyDocx, exportTranslatorDocx, exportArchiveDocx } from "./lib/toDocx";
import './App.css'; // Import the new stylesheet

type Cue = {
  file: string;
  startSec: number;
  endSec: number;
  text: string;
  speaker?: string | null;
};

function detectType(name: string) {
  return name.toLowerCase().endsWith(".srt") ? "srt"
       : name.toLowerCase().endsWith(".vtt") ? "vtt"
       : "unknown";
}

const GAP_SEC_DEFAULT = 2.5;

export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [gapSec, setGapSec] = useState(GAP_SEC_DEFAULT);
  const [keepSpeakers, setKeepSpeakers] = useState(true);
  const [stripBrackets, setStripBrackets] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [theme, setTheme] = useState('dark-mode');

  function toggleTheme() {
    setTheme(current => current === 'dark-mode' ? 'light-mode' : 'dark-mode');
  }

  async function readAll(): Promise<Record<string, string>> {
    const map: Record<string, string> = {};
    for (const f of files) map[f.name] = await f.text();
    return map;
  }

  async function parseAll(): Promise<Record<string, Cue[]>> {
    const raw = await readAll();
    const out: Record<string, Cue[]> = {};
    for (const [name, text] of Object.entries(raw)) {
      const kind = detectType(name);
      if (kind === "srt") out[name] = parseSrt(text).map(c => ({...c, file: name}));
      else if (kind === "vtt") out[name] = parseVtt(text).map(c => ({...c, file: name}));
      else out[name] = []; // skip unknown
    }
    return out;
  }

  function cleanForWordCount(cues: Cue[], gap = GAP_SEC_DEFAULT): string[] {
    let cleaned = cues.map(c => ({ ...c, text: c.text.replace(/\s+/g, " ").trim() }));

    if (stripBrackets) {
      cleaned = cleaned.filter(c => !/^\[.*\]$/.test(c.text) && !/^[♪♫♩♬]+$/.test(c.text));
    }

    const paras: string[] = [];
    let cur = "";
    let lastEnd = 0;

    for (const c of cleaned) {
      const speakerPrefix = keepSpeakers && c.speaker ? `${c.speaker}: ` : "";
      const isBreak = (c.startSec - lastEnd) >= gap || /[.?!…]$/.test(cur.trim());
      if (cur && isBreak) {
        paras.push(cur.trim());
        cur = `${speakerPrefix}${c.text}`;
      } else {
        cur = cur ? `${cur} ${speakerPrefix}${c.text}` : `${speakerPrefix}${c.text}`;
      }
      lastEnd = c.endSec;
    }
    if (cur.trim()) paras.push(cur.trim());
    return paras;
  }

  function countWords(text: string) {
    const m = text.trim().match(/\b[\p{L}\p{N}’'-]+\b/gu);
    return m ? m.length : 0;
  }

  async function onWordCount() {
    try {
      setBusy(true);
      const parsed = await parseAll();
      const perFile = Object.entries(parsed).map(([name, cues]) => {
        const paragraphs = cleanForWordCount(cues, gapSec);
        const words = paragraphs.reduce((acc, p) => acc + countWords(p), 0);
        return { name, paragraphs, words };
      });
      const totalWords = perFile.reduce((a, b) => a + b.words, 0);
      await exportTextOnlyDocx({ perFile, totalWords });
    } finally {
      setBusy(false);
    }
  }

  async function onTranslatorPackage() {
    try {
      setBusy(true);
      const parsed = await parseAll();
      const rows = Object.entries(parsed).flatMap(([, cues]) =>
        cues.map(c => ({
          file: c.file,
          start: c.startSec,
          speaker: keepSpeakers ? (c.speaker ?? "") : "",
          source: c.text.replace(/\s+/g, " ").trim(),
          translation: ""
        }))
      );
      await exportTranslatorDocx({ rows, includeTimestamps });
    } finally {
      setBusy(false);
    }
  }

  async function onArchive() {
    try {
      setBusy(true);
      const raw = await readAll();
      await exportArchiveDocx(raw);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`app-container ${theme}`}>
        <div className="header">
            <div className="title">[ TOOLBOX ]</div>
            <button id="theme-btn" onClick={toggleTheme}>
                {theme === 'dark-mode' ? '🌙' : '☀️'}
            </button>
        </div>
        
        <div className="tool-header">
            <div className="tool-title-main">▌ SUBTITLE -&gt; WORD</div>
            <div className="tool-desc">Local .srt/.vtt to .docx converter___</div>
        </div>

        <div className="main-content">
            {/* Column 1: Upload & Files */}
            <div className="tool-card">
                <div className="card-header">[ UPLOAD ]</div>
                <label className="upload-btn">
                    Select .srt / .vtt files
                    <input
                        type="file"
                        accept=".srt,.vtt"
                        multiple
                        style={{ display: "none" }}
                        onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
                    />
                </label>
                <div className="file-status">
                    {files.length ? `${files.length} files selected` : "No files selected."}
                </div>
            </div>

            {/* Column 2: Options */}
            <div className="tool-card">
                <div className="card-header">[ OPTIONS ]</div>
                <div className="options-grid">
                    <label>Paragraph Gap (s)</label>
                    <input type="number" value={gapSec} step={0.5} min={0} onChange={(e)=> setGapSec(Number(e.target.value))} />
                    
                    <label>Keep Speakers</label>
                    <input type="checkbox" checked={keepSpeakers} onChange={e => setKeepSpeakers(e.target.checked)} />

                    <label>Remove [brackets]</label>
                    <input type="checkbox" checked={stripBrackets} onChange={e => setStripBrackets(e.target.checked)} />
                    
                    <label>Include Timestamps</label>
                    <input type="checkbox" checked={includeTimestamps} onChange={e => setIncludeTimestamps(e.target.checked)} />
                </div>
            </div>
            
            {/* Column 3: Export */}
            <div className="tool-card">
                <div className="card-header">[ EXPORT ]</div>
                <div className="export-buttons">
                    <button disabled={!files.length || busy} onClick={onWordCount}>
                        {busy ? "Processing..." : "Word Count (Text Only)"}
                    </button>
                    <button disabled={!files.length || busy} onClick={onTranslatorPackage}>
                        {busy ? "Processing..." : "Translator Package"}
                    </button>
                    <button disabled={!files.length || busy} onClick={onArchive}>
                        {busy ? "Processing..." : "Archive Originals"}
                    </button>
                </div>
            </div>
        </div>
        
        <div className="footer">
            [ All processing is done locally in your browser. No data is uploaded. ]
        </div>
    </div>
  );
}