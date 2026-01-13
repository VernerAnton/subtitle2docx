import SrtParser2 from "srt-parser-2";
import { extractSpeaker, toSec } from "./utils";

export function parseSrt(text: string) {
  const parser = new SrtParser2();
  const items = parser.fromSrt(text) as Array<{ startTime: string; endTime: string; text: string }>;

  return items.map(i => {
    // Use the new helper to get both speaker and cleaned text
    const { speaker, text: cleanedText } = extractSpeaker(i.text);
    return {
      file: "",
      startSec: toSec(i.startTime),
      endSec: toSec(i.endTime),
      text: cleanedText,
      speaker: speaker
    };
  });
}

