/**
 * Code 128 barcode encoder (no dependencies; works on the server and in the browser).
 * Used for the price-tag PDFs and for showing barcodes on screen.
 *
 * All-digit codes with an even length (our 8-digit tag numbers) use code set C, which packs
 * two digits per symbol and keeps the barcode narrow; anything else uses code set B (ASCII 32-127).
 */

// Bar/space widths (in modules) for symbol values 0-106. Each symbol is 11 modules wide,
// except STOP (106), which is 13.
const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];
const START_B = 104;
const START_C = 105;
const STOP = 106;

/** Symbol values for `text`, including start, checksum and stop. */
function symbols(text: string): number[] {
  if (!text) throw new Error("Barcode text is empty");
  let values: number[];
  if (/^\d+$/.test(text) && text.length % 2 === 0) {
    values = [START_C];
    for (let i = 0; i < text.length; i += 2) values.push(Number(text.slice(i, i + 2)));
  } else {
    values = [START_B];
    for (const ch of text) {
      const code = ch.charCodeAt(0);
      if (code < 32 || code > 127) throw new Error(`Character "${ch}" can't be encoded in a barcode`);
      values.push(code - 32);
    }
  }
  const checksum = values.reduce((sum, v, i) => sum + v * (i === 0 ? 1 : i), 0) % 103;
  return [...values, checksum, STOP];
}

/**
 * The barcode as alternating bar/space widths in modules, starting with a bar
 * (quiet zones not included).
 */
export function code128Widths(text: string): number[] {
  return symbols(text).flatMap((v) => PATTERNS[v].split("").map(Number));
}

/** Total width in modules, excluding quiet zones. */
export function code128Modules(text: string): number {
  return code128Widths(text).reduce((a, b) => a + b, 0);
}

/** Bars as [x, width] pairs in modules (x measured from the first bar). */
export function code128Bars(text: string): [number, number][] {
  const bars: [number, number][] = [];
  let x = 0;
  code128Widths(text).forEach((w, i) => {
    if (i % 2 === 0) bars.push([x, w]);
    x += w;
  });
  return bars;
}

/** Can this text be printed as one of our barcodes? */
export function isEncodable(text: string) {
  return text.length > 0 && [...text].every((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) <= 127);
}
