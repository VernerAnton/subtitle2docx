/**
 * Extracts a speaker tag (e.g., "- [John]") from the text.
 * @returns An object with the speaker's name and the cleaned text.
 */
function extractSpeaker(rawText: string): { speaker: string | null; text: string } {
    const lines = rawText.split(/\r?\n/);
    const firstLine = lines[0]?.trim() ?? "";
    const match = firstLine.match(/^- \[([^\]]+)\]\s*/);

    if (match) {
        const speaker = match[1].trim();
        const cleanedFirstLine = firstLine.replace(match[0], "");
        const remainingLines = lines.slice(1);
        const cleanedText = [cleanedFirstLine, ...remainingLines].join(" ").replace(/\s+/g, " ").trim();
        return { speaker, text: cleanedText };
    }

    const text = rawText.replace(/\r?\n/g, " ").trim();
    return { speaker: null, text };
}

function toSec(t: string) {
  const m = t.match(/(\d{2}):(\d{2}):(\d{2})[.,](\d{3})/);
  if (!m) return 0;
  const [, hh, mm, ss, ms] = m;
  return (+hh)*3600 + (+mm)*60 + (+ss) + (+ms)/1000;
}

export function parseVtt(text: string) {
  // Strip WEBVTT header if present
  const body = text.replace(/^WEBVTT[^\n]*\n*/i, "");
  const blocks = body.split(/\r?\n\r?\n/);
  const cues = [];

  for (const b of blocks) {
    const lines = b.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) continue;
    const timeLine = lines.find(l => /-->/i.test(l));
    if (!timeLine) continue;

    const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
    if (!timeMatch) continue;
    
    const startSec = toSec(timeMatch[1]);
    const endSec = toSec(timeMatch[2]);
    
    const textLines = lines.filter(l => l !== timeLine);
    const rawText = textLines.join("\n"); // Rejoin for the helper
    
    // Use the new helper to get both speaker and cleaned text
    const { speaker, text: cleanedText } = extractSpeaker(rawText);

    if (cleanedText) { // Only add cues that have text after cleaning
        cues.push({
            file: "",
            startSec,
            endSec,
            text: cleanedText,
            speaker: speaker
        });
    }
  }
  return cues;
}

