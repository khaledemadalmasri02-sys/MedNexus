// Workers-native, best-effort PDF text extraction.
// pdfjs (and thus unpdf) cannot run on the Cloudflare Workers runtime, so we
// extract readable text directly: inflate FlateDecode streams (via the native
// DecompressionStream) and recover text shown by Tj/TJ operators and string
// literals. This recovers the bulk of the visible text for most text-based
// PDFs. Processing is bounded to stay within the Worker CPU limit.

function toBytes(s: string): Uint8Array {
  const a = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 0xff;
  return a;
}

function fromBytes(a: Uint8Array): string {
  let s = "";
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return s;
}

// Trim trailing EOL/whitespace bytes that pad PDF stream data.
function trimTrailingWs(a: Uint8Array): Uint8Array {
  let end = a.length;
  while (end > 0) {
    const b = a[end - 1];
    if (b === 0x0a || b === 0x0d || b === 0x20) end--;
    else break;
  }
  return a.subarray(0, end);
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array | null> {
  try {
    const ds = new DecompressionStream("deflate");
    const stream = new Response(bytes).body!.pipeThrough(ds);
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

function decodeLiteral(raw: string): string {
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "\\") {
      const n = raw[i + 1];
      if (n === "n") out += "\n";
      else if (n === "r") out += "\r";
      else if (n === "t") out += "\t";
      else if (n === "b") out += "\b";
      else if (n === "f") out += "\f";
      else if (n === "(") out += "(";
      else if (n === ")") out += ")";
      else if (n === "\\") out += "\\";
      else if (n >= "0" && n <= "7") {
        let oct = n;
        let j = i + 2;
        while (j < raw.length && raw[j] >= "0" && raw[j] <= "7" && oct.length < 3) {
          oct += raw[j];
          j++;
        }
        out += String.fromCharCode(parseInt(oct, 8) & 0xff);
        i = j - 1;
      } else out += n;
      i++;
    } else out += ch;
  }
  return out;
}

function decodeHex(raw: string): string {
  const clean = raw.replace(/\s+/g, "");
  let out = "";
  for (let i = 0; i + 1 < clean.length; i += 2) {
    out += String.fromCharCode(parseInt(clean.substr(i, 2), 16) || 0);
  }
  return out;
}

// Collect text-show strings, grouping every run shown by a single Tj/TJ/'/"`
// operator into one entry. Many PDFs emit text as a TJ array of one-glyph
// strings (justified text, common generators); joining each show operator's
// glyphs keeps words/paragraphs intact instead of one character per line.
// A fresh entry (line break) is started on T*, ' and " operators and on Td/TD
// text-positioning moves so distinct lines don't merge.
function collectStrings(content: string, out: string[]): void {
  let i = 0;
  let run: string[] = [];
  const flush = () => {
    if (run.length) {
      out.push(run.join("").replace(/\s+/g, " ").trim());
      run = [];
    }
  };
  while (i < content.length) {
    const ch = content[i];
    if (ch === "(") {
      let depth = 1;
      let j = i + 1;
      let buf = "";
      while (j < content.length && depth > 0) {
        const c2 = content[j];
        if (c2 === "\\") {
          buf += c2 + (content[j + 1] ?? "");
          j += 2;
          continue;
        }
        if (c2 === "(") depth++;
        else if (c2 === ")") {
          depth--;
          if (depth === 0) break;
        }
        buf += c2;
        j++;
      }
      run.push(decodeLiteral(buf));
      i = j + 1;
    } else if (ch === "<" && content[i + 1] !== "<") {
      const end = content.indexOf(">", i + 1);
      if (end === -1) {
        i++;
        continue;
      }
      run.push(decodeHex(content.slice(i + 1, end)));
      i = end + 1;
    } else if (ch === "T") {
      const n = content[i + 1];
      // Tj / TJ continue the current run; T* / Td / TD start a new line.
      if (n === "j" || n === "J") {
        i += 2;
      } else if (n === "*") {
        flush();
        i += 2;
      } else if (n === "d" || n === "D") {
        flush();
        i += 2;
      } else {
        i++;
      }
    } else if (ch === "'" || ch === '"') {
      // ' and " implicitly invoke T* (newline + show).
      flush();
      i++;
    } else {
      i++;
    }
  }
  flush();
}

export interface PdfExtractResult {
  text: string;
  pageCount: number;
}

const MAX_STREAMS = 200;
const MAX_TEXT_CHARS = 250_000;

export async function extractPdfText(data: Uint8Array): Promise<PdfExtractResult> {
  const latin = fromBytes(data);

  const pageMatches = latin.match(/\/Type\s*\/Page(?![s])/g) || [];
  const pageCount = Math.max(pageMatches.length, 1);

  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m: RegExpExecArray | null;
  const texts: string[] = [];
  let processed = 0;

  while ((m = streamRe.exec(latin)) !== null && processed < MAX_STREAMS) {
    processed++;
    // Use the stream's OWN dict (the << ... >> immediately preceding it).
    const dictStart = latin.lastIndexOf("<<", m.index);
    const dict = dictStart >= 0 ? latin.slice(dictStart, m.index) : "";
    const isImage =
      /\/Subtype\s*\/Image/.test(dict) ||
      /\/Filter\s*\/(DCTDecode|JPXDecode|CCITTFaxDecode|JBIG2Decode)/.test(dict);
    const isFlate =
      /\/Filter\s*\/FlateDecode/.test(dict) || /\/Filter\s*\[\s*\/FlateDecode/.test(dict);

    if (isImage) continue;

    let content: string;
    if (isFlate) {
      const inflated = await inflate(trimTrailingWs(toBytes(m[1])));
      if (!inflated) continue;
      content = fromBytes(inflated);
    } else {
      // Non-flate, non-image stream — try as plain text, skip if it looks binary.
      const candidate = m[1];
      if (/[\x00-\x08\x0e-\x1f]/.test(candidate.slice(0, 200))) continue;
      content = candidate;
    }

    collectStrings(content, texts);
  }

  if (texts.length === 0) {
    collectStrings(latin, texts);
  }

  const text = texts
    .map((t) => t.trim())
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { text, pageCount };
}
