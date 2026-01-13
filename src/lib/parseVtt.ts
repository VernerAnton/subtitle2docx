import { extractSpeaker, toSec } from "./utils";

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

