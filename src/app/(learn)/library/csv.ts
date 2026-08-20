/**
 * RFC 4180 quoting: double the quotes, wrap anything containing a quote, a
 * comma or a newline.
 *
 * The leading-character guard is the one that matters in practice. A cell
 * starting with `=`, `+`, `-` or `@` is executed as a formula when the file is
 * opened in Excel or Sheets — CSV injection — and a word list is exactly the
 * sort of user-adjacent data that ends up in a spreadsheet. Prefixing a single
 * quote neutralises it and is what spreadsheets themselves do.
 */
function escapeCell(value: string): string {
  const guarded = /^[=+\-@\t\r]/u.test(value) ? `'${value}` : value;

  return /["\n,]/u.test(guarded) ? `"${guarded.replaceAll('"', '""')}"` : guarded;
}

export function toCsv(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): string {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');
}
