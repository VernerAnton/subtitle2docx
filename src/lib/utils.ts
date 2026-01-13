/**
 * Shared utility functions for subtitle parsing
 */

/**
 * Extracts a speaker tag (e.g., "- [John]") from the text.
 * @returns An object with the speaker's name and the cleaned text.
 */
export function extractSpeaker(rawText: string): { speaker: string | null; text: string } {
  const lines = rawText.split(/\r?\n/);
  const firstLine = lines[0]?.trim() ?? "";
  const match = firstLine.match(/^- \[([^\]]+)\]\s*/);

  // If a speaker tag is found on the first line...
  if (match) {
    const speaker = match[1].trim();
    // Remove the speaker tag from the first line
    const cleanedFirstLine = firstLine.replace(match[0], "");
    // Reassemble the text from the (now clean) first line and the rest
    const remainingLines = lines.slice(1);
    const cleanedText = [cleanedFirstLine, ...remainingLines].join(" ").replace(/\s+/g, " ").trim();
    return { speaker, text: cleanedText };
  }

  // If no speaker is found, just clean up and return the original text
  const text = rawText.replace(/\r?\n/g, " ").trim();
  return { speaker: null, text };
}

/**
 * Converts a timestamp string to seconds
 * @param t Timestamp string in format HH:MM:SS.mmm or HH:MM:SS,mmm
 * @returns Time in seconds
 */
export function toSec(t: string): number {
  // 00:00:01,000 or 00:00:01.000
  const m = t.match(/(\d{2}):(\d{2}):(\d{2})[.,](\d{3})/);
  if (!m) return 0;
  const [, hh, mm, ss, ms] = m;
  return (+hh) * 3600 + (+mm) * 60 + (+ss) + (+ms) / 1000;
}
