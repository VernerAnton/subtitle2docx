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
  const [error, setError] = useState<string | null>(null);
  const [gapSec, setGapSec] = useState(GAP_SEC_DEFAULT);
  const [keepSpeakers, setKeepSpeakers] = useState(true);
  const [stripBrackets, setStripBrackets] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);

  // --- IMPROVED THEME STATE AND LOGIC ---
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    const saved = localStorage.getItem('themePreference');
    return (saved as ThemePreference) || 'system';
  });

  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>(() => {
    if (themePreference === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return themePreference === 'dark' ? 'dark' : 'light';
  });

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

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (themePreference === 'system') {
        updateActualTheme();
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [themePreference]);

  useEffect(() => {
    localStorage.setItem('themePreference', themePreference);
  }, [themePreference]);

  const cycleTheme = () => {
    setThemePreference(prev => {
      if (prev === 'system') return 'light';
      if (prev === 'light') return 'dark';
      return 'system';
    });
  };

  const getThemeIcon = () => {
    if (themePreference === 'system') return '🌓';
    return actualTheme === 'dark' ? '☀️' : '🌙';
  };

  const getThemeTooltip = () => {
    if (themePreference === 'system') return `Auto (currently ${actualTheme})`;
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
      setError(null);
      const parsed = await parseAll();
      const perFile = Object.entries(parsed).map(([name, cues]) => {
        const paragraphs = cleanForWordCount(cues, gapSec);
        const words = paragraphs.reduce((acc, p) => acc + countWords(p), 0);
        return { name, paragraphs, words };
      });
      const totalWords = perFile.reduce((a, b) => a + b.words, 0);
      await exportTextOnlyDocx({ perFile, totalWords });
    } catch (err) {
      setError(`Failed to export Word Count: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Export error:', err);
    } finally {
      setBusy(false);
    }
  }

  async function onTranslatorPackage() {
    try {
      setBusy(true);
      setError(null);
      const parsed = await parseAll();
      const rows = Object.values(parsed).flat().map(c => ({
          file: c.file,
          start: c.startSec,
          speaker: keepSpeakers && c.speaker ? c.speaker : "",
          source: c.text.replace(/\s+/g," ").trim(),
          translation: ""
      }));
      await exportTranslatorDocx({ rows, includeTimestamps });
    } catch (err) {
      setError(`Failed to export Translator Package: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Export error:', err);
    } finally {
      setBusy(false);
    }
  }

  async function onArchive() {
    try {
      setBusy(true);
      setError(null);
      const raw = await readAll();
      await exportArchiveDocx(raw);
    } catch (err) {
      setError(`Failed to export Archive: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('Export error:', err);
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
          aria-label={`Theme: ${getThemeTooltip()}. Click to cycle theme`}
        >
          {getThemeIcon()}
        </button>
      </header>
      
      <div className="tool-header">
          <h2 className="tool-title-main">[ SUBTITLE -&gt; WORD ]___</h2>
          <p className="tool-desc">Local-only subtitle to .docx converter.</p>
      </div>

      <main className="main-content">
        <section className="tool-card">
          <h3 className="card-header">[ 1. UPLOAD ]</h3>
          <label className="upload-btn">
            {files.length ? `[ ${files.length} FILE(S) SELECTED ]` : "[ SELECT .SRT / .VTT FILES ]"}
            <input
              type="file"
              accept=".srt,.vtt"
              multiple
              style={{display:"none"}}
              onChange={(e)=> setFiles(e.target.files ? Array.from(e.target.files) : [])}
              aria-label="Upload subtitle files (.srt or .vtt format)"
            />
          </label>
           <p className="file-status">{files.length ? files.map(f => f.name).join(', ') : "No files selected."}</p>
        </section>

        <section className="tool-card">
          <h3 className="card-header">[ 2. OPTIONS ]</h3>
          {/* This is the structurally improved section */}
          <div className="options-container">
            <div className="option-item">
              <span>Paragraph gap (sec):</span>
              <input 
                type="number" 
                value={gapSec} 
                step={0.5} 
                min={0}
                onChange={(e)=> setGapSec(Number(e.target.value))} 
                className="option-input"/>
            </div>
            <label className="option-item checkbox-item">
              <span>Keep speaker names</span>
              <input 
                type="checkbox" 
                checked={keepSpeakers} 
                onChange={e => setKeepSpeakers(e.target.checked)} />
            </label>
            <label className="option-item checkbox-item">
              <span>Remove bracketed text</span>
              <input 
                type="checkbox" 
                checked={stripBrackets} 
                onChange={e => setStripBrackets(e.target.checked)} />
            </label>
            <label className="option-item checkbox-item">
              <span>Include timestamps</span>
              <input 
                type="checkbox" 
                checked={includeTimestamps} 
                onChange={e => setIncludeTimestamps(e.target.checked)} />
            </label>
          </div>
        </section>

        <section className="tool-card">
          <h3 className="card-header">[ 3. EXPORT ]</h3>
          <div className="export-buttons">
            <button
              disabled={!files.length || busy}
              onClick={onWordCount}
              aria-label="Export word count (text only) document"
            >
              {busy ? "[ PROCESSING... ]" : "[ WORD COUNT (TEXT ONLY) ]"}
            </button>
            <button
              disabled={!files.length || busy}
              onClick={onTranslatorPackage}
              aria-label="Export translator package with table format"
            >
              {busy ? "[ PROCESSING... ]" : "[ TRANSLATOR PACKAGE ]"}
            </button>
            <button
              disabled={!files.length || busy}
              onClick={onArchive}
              aria-label="Export archive combining original subtitle files"
            >
              {busy ? "[ PROCESSING... ]" : "[ COMBINE ORIGINALS ]"}
            </button>
          </div>
        </section>
      </main>

      {error && (
        <div className="error-message">
          <strong>ERROR:</strong> {error}
        </div>
      )}

      <footer className="footer">
        [ All processing is done locally in your browser. No data is ever uploaded. ]
      </footer>
    </div>
  );
}

