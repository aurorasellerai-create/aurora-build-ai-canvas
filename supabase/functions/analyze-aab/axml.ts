// ─────────────────────────────────────────────────────────────────────────────
// axml.ts — Android binary XML (AXML) decoder.
// Decodes AndroidManifest.xml extracted from an AAB into a structured tree.
// Reference: https://justanapplication.wordpress.com/2011/09/22/android-internals-binary-xml-file-format-part-one-an-overview/
// Self-contained: no external deps.
// ─────────────────────────────────────────────────────────────────────────────

// Chunk types
const CHUNK_STRING_POOL = 0x0001;
const CHUNK_XML         = 0x0003;
const CHUNK_XML_RESOURCE_MAP = 0x0180;
const CHUNK_XML_START_NS = 0x0100;
const CHUNK_XML_END_NS   = 0x0101;
const CHUNK_XML_START_EL = 0x0102;
const CHUNK_XML_END_EL   = 0x0103;
const CHUNK_XML_CDATA    = 0x0104;

// Value types
const TYPE_NULL       = 0x00;
const TYPE_REFERENCE  = 0x01;
const TYPE_STRING     = 0x03;
const TYPE_FLOAT      = 0x04;
const TYPE_INT_DEC    = 0x10;
const TYPE_INT_HEX    = 0x11;
const TYPE_INT_BOOL   = 0x12;

const FLAG_UTF8 = 0x100;

export type AxmlAttribute = {
  ns: string | null;
  name: string;
  rawValue: string | number | boolean | null;
  resourceId?: number;
};

export type AxmlElement = {
  name: string;
  ns: string | null;
  attributes: Record<string, string | number | boolean | null>;
  attributesRaw: AxmlAttribute[];
  children: AxmlElement[];
};

class Reader {
  private view: DataView;
  offset = 0;
  constructor(public buffer: Uint8Array) {
    this.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }
  u16() { const v = this.view.getUint16(this.offset, true); this.offset += 2; return v; }
  u32() { const v = this.view.getUint32(this.offset, true); this.offset += 4; return v; }
  i32() { const v = this.view.getInt32(this.offset, true); this.offset += 4; return v; }
  skip(n: number) { this.offset += n; }
  seek(o: number) { this.offset = o; }
}

function readStringPool(buf: Uint8Array, chunkStart: number): string[] {
  const r = new Reader(buf);
  r.seek(chunkStart);
  const type = r.u16();
  if (type !== CHUNK_STRING_POOL) throw new Error("axml: expected string pool");
  const headerSize = r.u16();
  const chunkSize  = r.u32();
  const stringCount = r.u32();
  r.u32(); // styleCount
  const flags = r.u32();
  const stringsStart = r.u32();
  r.u32(); // stylesStart

  const isUtf8 = (flags & FLAG_UTF8) !== 0;
  const offsets: number[] = [];
  for (let i = 0; i < stringCount; i++) offsets.push(r.u32());

  const strings: string[] = [];
  const stringsBase = chunkStart + stringsStart;
  const dec = new TextDecoder(isUtf8 ? "utf-8" : "utf-16le", { fatal: false });

  for (const off of offsets) {
    let p = stringsBase + off;
    if (isUtf8) {
      // utf-16 length (skip), then utf-8 length, then bytes, then NUL
      let u16len = buf[p++];
      if (u16len & 0x80) { u16len = ((u16len & 0x7f) << 8) | buf[p++]; }
      let u8len = buf[p++];
      if (u8len & 0x80) { u8len = ((u8len & 0x7f) << 8) | buf[p++]; }
      strings.push(dec.decode(buf.subarray(p, p + u8len)));
    } else {
      let len = buf[p] | (buf[p + 1] << 8); p += 2;
      if (len & 0x8000) { len = ((len & 0x7fff) << 16) | (buf[p] | (buf[p + 1] << 8)); p += 2; }
      strings.push(dec.decode(buf.subarray(p, p + len * 2)));
    }
    void chunkSize; void headerSize;
  }
  return strings;
}

function formatValue(type: number, data: number, strings: string[]): string | number | boolean | null {
  switch (type) {
    case TYPE_NULL: return null;
    case TYPE_STRING: return strings[data] ?? "";
    case TYPE_REFERENCE: return `@0x${data.toString(16).padStart(8, "0")}`;
    case TYPE_INT_DEC: return data | 0;
    case TYPE_INT_HEX: return `0x${data.toString(16)}`;
    case TYPE_INT_BOOL: return data !== 0;
    case TYPE_FLOAT: {
      const buf = new ArrayBuffer(4);
      new DataView(buf).setUint32(0, data, true);
      return new DataView(buf).getFloat32(0, true);
    }
    default: return data;
  }
}

export function decodeAxml(bytes: Uint8Array): AxmlElement | null {
  const r = new Reader(bytes);
  const magic = r.u16();
  if (magic !== CHUNK_XML) {
    // Some AABs store plain-text XML too — try that.
    try {
      const txt = new TextDecoder("utf-8").decode(bytes);
      if (txt.trimStart().startsWith("<?xml") || txt.trimStart().startsWith("<")) {
        return parsePlainXml(txt);
      }
    } catch { /* noop */ }
    return null;
  }
  r.u16(); // headerSize
  r.u32(); // fileSize

  // String pool comes next
  const stringPoolStart = r.offset;
  const strings = readStringPool(bytes, stringPoolStart);
  // Advance past string pool
  const spHeaderSize = new DataView(bytes.buffer, bytes.byteOffset + stringPoolStart + 2, 2).getUint16(0, true);
  const spChunkSize  = new DataView(bytes.buffer, bytes.byteOffset + stringPoolStart + 4, 4).getUint32(0, true);
  void spHeaderSize;
  r.seek(stringPoolStart + spChunkSize);

  // Optional resource map
  if (r.offset < bytes.length) {
    const peekType = new DataView(bytes.buffer, bytes.byteOffset + r.offset, 2).getUint16(0, true);
    if (peekType === CHUNK_XML_RESOURCE_MAP) {
      r.u16(); r.u16();
      const size = r.u32();
      r.skip(size - 8);
    }
  }

  const stack: AxmlElement[] = [];
  let root: AxmlElement | null = null;

  while (r.offset < bytes.length) {
    const chunkStart = r.offset;
    const type = r.u16();
    r.u16(); // headerSize
    const size = r.u32();
    if (!size) break;
    r.u32(); // lineNumber
    r.u32(); // comment

    if (type === CHUNK_XML_START_EL) {
      const nsIdx = r.i32();
      const nameIdx = r.i32();
      r.u16(); // attributeStart
      r.u16(); // attributeSize
      const attrCount = r.u16();
      r.u16(); // idIndex
      r.u16(); // classIndex
      r.u16(); // styleIndex

      const attrs: AxmlAttribute[] = [];
      const attrMap: Record<string, string | number | boolean | null> = {};
      for (let i = 0; i < attrCount; i++) {
        const aNs = r.i32();
        const aName = r.i32();
        const aRawVal = r.i32();
        r.u16(); // size
        r.u16(); // 8bit padding + type
        const valType = new DataView(bytes.buffer, bytes.byteOffset + r.offset - 2, 2).getUint8(1);
        const valData = r.u32();
        const nameStr = strings[aName] ?? `attr_${aName}`;
        const value = aRawVal >= 0 && aRawVal < strings.length && valType === TYPE_STRING
          ? strings[aRawVal]
          : formatValue(valType, valData, strings);
        attrs.push({ ns: aNs >= 0 ? strings[aNs] ?? null : null, name: nameStr, rawValue: value });
        attrMap[nameStr] = value;
      }
      const el: AxmlElement = {
        name: strings[nameIdx] ?? "unknown",
        ns: nsIdx >= 0 ? strings[nsIdx] ?? null : null,
        attributes: attrMap,
        attributesRaw: attrs,
        children: [],
      };
      if (stack.length) stack[stack.length - 1].children.push(el);
      else root = el;
      stack.push(el);
      r.seek(chunkStart + size);
    } else if (type === CHUNK_XML_END_EL) {
      stack.pop();
      r.seek(chunkStart + size);
    } else {
      r.seek(chunkStart + size);
    }
  }

  return root;
}

// Fallback naive XML parser (for AABs storing plain text manifest — rare)
function parsePlainXml(text: string): AxmlElement | null {
  const re = /<([a-zA-Z0-9_:\-]+)([^>/]*)(\/?)>|<\/([a-zA-Z0-9_:\-]+)>/g;
  const attrRe = /([a-zA-Z0-9_:\-]+)\s*=\s*"([^"]*)"/g;
  const stack: AxmlElement[] = [];
  let root: AxmlElement | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[4]) { stack.pop(); continue; }
    const name = m[1];
    const attrs: Record<string, string> = {};
    let a: RegExpExecArray | null;
    while ((a = attrRe.exec(m[2] || "")) !== null) attrs[a[1].replace(/^[^:]+:/, "")] = a[2];
    const el: AxmlElement = { name, ns: null, attributes: attrs, attributesRaw: [], children: [] };
    if (stack.length) stack[stack.length - 1].children.push(el);
    else root = el;
    if (!m[3]) stack.push(el);
  }
  return root;
}

// Utility: walk element tree
export function walk(el: AxmlElement, fn: (e: AxmlElement, parents: AxmlElement[]) => void, parents: AxmlElement[] = []) {
  fn(el, parents);
  for (const c of el.children) walk(c, fn, [...parents, el]);
}

// Utility: strip android namespace prefix from attribute key
export function attr(el: AxmlElement, name: string): string | number | boolean | null {
  const direct = el.attributes[name];
  if (direct !== undefined) return direct;
  const short = name.replace(/^[^:]+:/, "");
  return el.attributes[short] ?? null;
}
