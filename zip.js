/*
 * كاتب ZIP مصغّر (طريقة STORE بدون ضغط) — بلا أي اعتماد خارجي.
 * الصور (PNG/JPEG/WebP) مضغوطة أصلًا، فالضغط الإضافي لا يوفّر شيئًا يُذكر.
 */
'use strict';

const ZipWriter = (() => {
  const TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(u8) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < u8.length; i++) c = (c >>> 8) ^ TABLE[(c ^ u8[i]) & 0xFF];
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function dosDateTime(d) {
    const time = ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((d.getSeconds() / 2) & 31);
    const date = (((d.getFullYear() - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31);
    return { time, date };
  }

  const enc = new TextEncoder();

  class View {
    constructor(size) { this.u8 = new Uint8Array(size); this.dv = new DataView(this.u8.buffer); this.o = 0; }
    u16(v) { this.dv.setUint16(this.o, v, true); this.o += 2; return this; }
    u32(v) { this.dv.setUint32(this.o, v >>> 0, true); this.o += 4; return this; }
    bytes(b) { this.u8.set(b, this.o); this.o += b.length; return this; }
  }

  async function toU8(data) {
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (typeof data === 'string') return enc.encode(data);
    return new Uint8Array(await data.arrayBuffer()); // Blob
  }

  /**
   * @param {{name:string, data:Blob|Uint8Array|string}[]} entries
   * @param {(pct:number)=>void} [onProgress]
   * @returns {Promise<Blob>}
   */
  async function create(entries, onProgress) {
    const parts = [];
    const central = [];
    const { time, date } = dosDateTime(new Date());
    let offset = 0;

    for (let i = 0; i < entries.length; i++) {
      const nameBytes = enc.encode(entries[i].name);
      const data = await toU8(entries[i].data);
      const crc = crc32(data);
      const size = data.length;

      const local = new View(30 + nameBytes.length);
      local.u32(0x04034b50).u16(20).u16(0x0800).u16(0)      // signature, version, UTF-8 flag, store
        .u16(time).u16(date).u32(crc).u32(size).u32(size)
        .u16(nameBytes.length).u16(0).bytes(nameBytes);

      parts.push(local.u8, data);

      const cen = new View(46 + nameBytes.length);
      cen.u32(0x02014b50).u16(20).u16(20).u16(0x0800).u16(0)
        .u16(time).u16(date).u32(crc).u32(size).u32(size)
        .u16(nameBytes.length).u16(0).u16(0).u16(0).u16(0).u32(0).u32(offset)
        .bytes(nameBytes);
      central.push(cen.u8);

      offset += local.u8.length + size;
      if (onProgress) onProgress((i + 1) / entries.length * 100);
    }

    const cdSize = central.reduce((a, b) => a + b.length, 0);
    const end = new View(22);
    end.u32(0x06054b50).u16(0).u16(0)
      .u16(entries.length).u16(entries.length)
      .u32(cdSize).u32(offset).u16(0);

    return new Blob([...parts, ...central, end.u8], { type: 'application/zip' });
  }

  return { create, crc32 };
})();
