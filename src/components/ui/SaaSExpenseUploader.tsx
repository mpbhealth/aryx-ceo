import Papa from 'papaparse';
import CsvUploader from './CsvUploader';
import { rowsToExpenses } from '../../lib/saasExpenseCsv';
import type { SaaSExpenseInput } from '../../hooks/useSaaSExpenses';

/**
 * These props are the ones SaaSSpend passes. Before this the component declared
 * `{ onUpload, className }` and its only consumer passed `{ onSuccess, onError,
 * onBulkImport }` — so the CSV import never worked, in the same way ExportDropdown's
 * missing `data` prop meant the Export button never rendered. Clicking Upload would
 * have called an undefined `onUpload`.
 */
interface SaaSExpenseUploaderProps {
  onBulkImport: (expenses: SaaSExpenseInput[]) => Promise<{ success: boolean; error?: string }>;
  onSuccess?: (count: number) => void;
  onError?: (message: string) => void;
  className?: string;
}

function parseCsv(text: string): Promise<Array<Record<string, unknown>>> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.errors.length > 0) {
          reject(new Error(`CSV parsing failed: ${result.errors[0].message}`));
          return;
        }
        resolve(result.data);
      },
      error: reject,
    });
  });
}

export default function SaaSExpenseUploader({
  onBulkImport,
  onSuccess,
  onError,
  className,
}: SaaSExpenseUploaderProps) {
  // CsvUploader shows the thrown message next to the file, so a failure here is
  // reported in the drop zone as well as handed to the page.
  const handleUpload = async (file: File) => {
    try {
      const { rows, skipped } = rowsToExpenses(await parseCsv(await file.text()));

      if (rows.length === 0) {
        throw new Error(
          skipped.length > 0
            ? `No rows could be imported. First problem: line ${skipped[0].line}, ${skipped[0].reason}.`
            : 'That file has no rows.',
        );
      }

      const result = await onBulkImport(rows);
      if (!result.success) throw new Error(result.error ?? 'Import failed');

      // A partly imported file reports through onError: rows went in, but lines were
      // dropped and the file needs fixing, which is not a plain success.
      if (skipped.length > 0) {
        onError?.(
          `Imported ${rows.length} of ${rows.length + skipped.length} rows. Skipped: ` +
            skipped.map((row) => `line ${row.line} (${row.reason})`).join(', '),
        );
      } else {
        onSuccess?.(rows.length);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed';
      onError?.(message);
      throw err;
    }
  };

  return (
    <CsvUploader
      onUpload={handleUpload}
      accept=".csv"
      maxSize={5 * 1024 * 1024}
      className={className}
    />
  );
}
