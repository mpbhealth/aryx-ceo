/**
 * What a page hands the export UI.
 *
 * `headers` is a column allow-list *and* an ordering: pages build rows with more keys
 * than they want exported (Projects builds 10 and lists 7), so only these columns are
 * written, in this order. Omit it to export every key of the first row.
 */
export interface ExportPayload {
  title: string;
  data: Array<Record<string, unknown>>;
  headers?: string[];
  filename: string;
}

/** Project a payload onto its declared columns, in declared order. */
export function selectColumns({ data, headers }: ExportPayload): Array<Record<string, unknown>> {
  const keys = headers?.length ? headers : Object.keys(data[0] ?? {});
  return data.map((row) => Object.fromEntries(keys.map((key) => [key, row[key] ?? ''])));
}

/** Serialise rows to CSV text. Separated from the download so it can be tested. */
export function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return '';
  const keys = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  return [keys.join(','), ...rows.map((row) => keys.map((key) => escape(row[key])).join(','))].join('\n');
}

function triggerDownload(body: string, mimeType: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([body], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>): void {
  if (rows.length === 0) return;
  triggerDownload(toCsv(rows), 'text/csv;charset=utf-8', filename);
}

export function downloadJson(payload: ExportPayload): void {
  const body = JSON.stringify(
    { title: payload.title, exportedAt: new Date().toISOString(), rows: selectColumns(payload) },
    null,
    2,
  );
  triggerDownload(body, 'application/json;charset=utf-8', `${payload.filename}.json`);
}
