// §5.8: CSV formula-injection prevention. Excel/Google Sheets execute a cell whose value starts with
// = + - @ (or a leading tab/CR/LF that the app strips to reveal one). We prefix a single quote to force the
// cell to plain text, escape double-quotes by doubling on EVERY path, and wrap in quotes when the value
// carries a CSV structural char. Owner: TokenTally export. Version: Phase 3.
const INJECTION_START = /^[=+\-@\t\r\n]/;
const NEEDS_QUOTING = /[",\n\r]/;

export function sanitizeForCSV(value: string | number): string {
  let s = String(value);
  // Neutralize a formula/control-char lead by prefixing a literal apostrophe (kept inside the quotes if the
  // field is later wrapped) - a spreadsheet then renders the cell as text, not a formula.
  if (INJECTION_START.test(s)) s = `'${s}`;
  // Escape embedded double-quotes ALWAYS (not only when the field is wrapped).
  s = s.replace(/"/g, '""');
  // Wrap in quotes if the field carries a CSV structural char (comma, quote, or newline).
  if (NEEDS_QUOTING.test(s)) s = `"${s}"`;
  return s;
}

export function csvRow(cells: (string | number)[]): string {
  return cells.map(sanitizeForCSV).join(',');
}
