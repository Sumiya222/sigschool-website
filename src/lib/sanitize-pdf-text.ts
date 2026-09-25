/**
 * jsPDF's standard fonts (Helvetica, etc.) only support single-byte WinAnsi
 * encoding. The moment a string contains any character outside that range,
 * jsPDF silently re-encodes the *entire* string as 2-byte UTF-16, while the
 * font resource stays declared single-byte -- a real PDF viewer then reads
 * each of those 2 bytes as its own glyph, roughly doubling the rendered
 * width of that whole line and bleeding into whatever is next to it.
 *
 * This normalizes common look-alike punctuation (e.g. an Arabic/Urdu comma
 * pasted in from a non-English-locale map, or a smart quote from a phone
 * keyboard) and strips anything else outside Latin-1, rather than letting
 * one stray character corrupt a whole field. Every jsPDF `doc.text()` /
 * `autoTable()` call site that renders user-supplied free text (names,
 * addresses, remarks, notes) must run it through this first.
 */
export function sanitizeForPdf(s: string): string {
  return (
    s
      .replace(/[،﹐﹑]/g, ",") // Arabic/Urdu comma variants
      .replace(/[‘’‛]/g, "'") // smart single quotes
      .replace(/[“”‟]/g, '"') // smart double quotes
      .replace(/[–—]/g, "-") // en/em dash
      // NBSP / figure space / narrow-no-break-space variants -- deliberate
      // eslint-disable-next-line no-irregular-whitespace
      .replace(/[   ]/g, " ")
      // Strip anything else outside Latin-1.
      // eslint-disable-next-line no-control-regex -- deliberate Latin-1 range bound
      .replace(/[^\x00-\xFF]/g, "")
  );
}
