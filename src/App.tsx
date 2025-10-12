import { useState, useEffect } from "react";
import { parseSrt } from "./lib/parseSrt";
import { parseVtt } from "./lib/parseVtt";
import { exportTextOnlyDocx, exportTranslatorDocx, exportArchiveDocx } from "./lib/toDocx";
import './App.css';

type Cue = {
  file: string;
  startSec: number;
  endSec: number;
  text: string;
  speaker?: string | null;
};

// Theme preference type
type ThemePreference = 'light' | 'dark' | 'system';

// Helper Functions
function detectType(name: string) {
  return name.toLowerCase().endsWith(".srt") ? "srt"
       : name.toLowerCase().endsWith(".vtt") ? "vtt"
       : "unknown";
}

const GAP_SEC_DEFAULT = 2.5;

export default function App() {
  // State for the application
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [gapSec, setGapSec] = useState(GAP_SEC_DEFAULT);
  const [keepSpeakers, setKeepSpeakers] = useState(true);
  const [stripBrackets, setStripBrackets] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);

  // --- IMPROVED THEME STATE AND LOGIC ---
  // Check if user has a saved preference
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    const saved = localStorage.getItem('themePreference');
    return (saved as ThemePreference) || 'system';
  });

  // Track actual theme being displayed
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>(() => {
    if (themePreference === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return themePreference === 'dark' ? 'dark' : 'light';
  });

  // Update actual theme when preference or system theme changes
  useEffect(() => {
    const updateActualTheme = () => {
      if (themePreference === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setActualTheme(isDark ? 'dark' : 'light');
      } else {
        setActualTheme(themePreference === 'dark' ? 'dark' : 'light');
      }
    };

    updateActualTheme();

    // Listen for system theme changes (only matters when preference is 'system')
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (themePreference === 'system') {
        updateActualTheme();
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [themePreference]);

  // Save preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('themePreference', themePreference);
  }, [themePreference]);

  // Toggle function cycles through: system -> light -> dark -> system
  const cycleTheme = () => {
    setThemePreference(prev => {
      if (prev === 'system') return 'light';
      if (prev === 'light') return 'dark';
      return 'system';
    });
  };

  // Get icon based on current state
  const getThemeIcon = () => {
    if (themePreference === 'system') {
      return '🌓'; // Half moon to indicate auto/system mode
    }
    return actualTheme === 'dark' ? '☀️' : '🌙';
  };

  // Get tooltip text
  const getThemeTooltip = () => {
    if (themePreference === 'system') {
      return `Auto (currently ${actualTheme})`;
    }
    return `${actualTheme === 'dark' ? 'Dark' : 'Light'} mode`;
  };

  // --- DATA HANDLING FUNCTIONS ---
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
      else out[name] = [];
    }
    return out;
  }

  function cleanForWordCount(cues: Cue[], gap: number): string[] {
    let cleaned = cues.map(c => ({...c, text: c.text.replace(/\s+/g, " ").trim()}));

    if (stripBrackets) {
      cleaned = cleaned.filter(c => c.text && !/^[♪♫♩♬]+$/.test(c.text) && !/^\[.*\]$/.test(c.text));
    }
    
    const paras: string[] = [];
    let cur = "";
    let lastEnd = 0;

    for (const c of cleaned) {
      const speakerPrefix = keepSpeakers && c.speaker ? `${c.speaker}: ` : "";
      const newText = speakerPrefix + c.text;

      const isBreak = (c.startSec - lastEnd) >= gap || /[.?!…]$/.test(cur.trim());
      if (cur && isBreak) {
        paras.push(cur.trim());
        cur = newText;
      } else {
        cur = cur ? `${cur} ${newText}` : newText;
      }
      lastEnd = c.endSec;
    }
    if (cur.trim()) paras.push(cur.trim());
    return paras;
  }

  function countWords(text: string) {
    const m = text.trim().match(/\b[\p{L}\p{N}''-]+\b/gu);
    return m ? m.length : 0;
  }

  // --- EXPORT EVENT HANDLERS ---
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
      const rows = Object.values(parsed).flat().map(c => ({
          file: c.file,
          start: c.startSec,
          speaker: keepSpeakers && c.speaker ? c.speaker : "",
          source: c.text.replace(/\s+/g," ").trim(),
          translation: ""
      }));
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

  // --- RENDER ---
  return (
    <div className={`app-container ${actualTheme === 'dark' ? 'dark-mode' : 'light-mode'}`}>
      <header className="header">
        <h1 className="title">[ TOOLBOX ]</h1>
        <button 
          id="theme-btn" 
          className="theme-btn" 
          onClick={cycleTheme}
          title={getThemeTooltip()}
        >
          {getThemeIcon()}
        </button>
      </header>
      
      <div className="tool-header">
          <h2>[ SUBTITLE -&gt; WORD ]___</h2>
          <p>Local-only subtitle to .docx converter.</p>
      </div>

      <main className="main-content">
        <section className="tool-card">
          <h3>[ 1. UPLOAD ]</h3>
          <label className="upload-btn">
            {files.length ? `[ ${files.length} FILE(S) SELECTED ]` : "[ SELECT .SRT / .VTT FILES ]"}
            <input
              type="file"
              accept=".srt,.vtt"
              multiple
              style={{display:"none"}}
              onChange={(e)=> setFiles(e.target.files ? Array.from(e.target.files) : [])}
            />
          </label>
        </section>

        <section className="tool-card">
          <h3>[ 2. OPTIONS ]</h3>
          <div className="options-grid">
            <div className="option-item">
              <label>Paragraph gap (sec):</label>
              <input type="number" value={gapSec} step={0.5} min={0}
                     onChange={(e)=> setGapSec(Number(e.target.value))} className="option-input"/>
            </div>
            <div className="option-item checkbox-item">
              <input type="checkbox" id="keepSpeakers" checked={keepSpeakers} onChange={e => setKeepSpeakers(e.target.checked)} />
              <label htmlFor="keepSpeakers">Keep speaker names</label>
            </div>
            <div className="option-item checkbox-item">
              <input type="checkbox" id="stripBrackets" checked={stripBrackets} onChange={e => setStripBrackets(e.target.checked)} />
              <label htmlFor="stripBrackets">Remove bracketed text (e.g., [applause])</label>
            </div>
            <div className="option-item checkbox-item">
              <input type="checkbox" id="includeTimestamps" checked={includeTimestamps} onChange={e => setIncludeTimestamps(e.target.checked)} />
              <label htmlFor="includeTimestamps">Include timestamps in Translator Package</label>
            </div>
          </div>
        </section>

        <section className="tool-card">
          <h3>[ 3. EXPORT ]</h3>
          <div className="export-buttons">
            <button disabled={!files.length || busy} onClick={onWordCount}>
              {busy ? "[ PROCESSING... ]" : "[ WORD COUNT (TEXT ONLY) ]"}
            </button>
            <button disabled={!files.length || busy} onClick={onTranslatorPackage}>
              {busy ? "[ PROCESSING... ]" : "[ TRANSLATOR PACKAGE ]"}
            </button>
            <button disabled={!files.length || busy} onClick={onArchive}>
              {busy ? "[ COMBINE ORIGINALS ]" : "[ COMBINE ORIGINALS ]"}
            </button>
          </div>
        </section>
      </main>

      <footer className="footer">
        [ All processing is done locally in your browser. No data is ever uploaded. ]
      </footer>
    </div>
  );
}