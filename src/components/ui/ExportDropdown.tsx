import { useState } from 'react';
import { Download, FileText, Table } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { downloadCsv, downloadJson, selectColumns, type ExportPayload } from '../../lib/exportFacts';

interface ExportDropdownProps {
  data?: ExportPayload;
  onExportCSV?: () => void;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  onExportJSON?: () => void;
}

export default function ExportDropdown({
  data,
  onExportCSV,
  onExportPDF,
  onExportExcel,
  onExportJSON,
}: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Every page that uses this component passes `data` and no callbacks. Before this,
  // `data` was not part of the props at all: the options list filtered to the handlers
  // that existed, found none, and the component returned null — so the Export button
  // silently did not render on Projects, TechStack, Deployments or SaaSSpend, while
  // each page went on computing a full export payload every render.
  const hasRows = !!data && data.data.length > 0;
  const csv = onExportCSV ?? (hasRows ? () => downloadCsv(`${data.filename}.csv`, selectColumns(data)) : undefined);
  const json = onExportJSON ?? (hasRows ? () => downloadJson(data) : undefined);

  // PDF and Excel are offered only when a page supplies its own handler. Implementing
  // them here would mean importing exceljs and jspdf, which are currently dependencies
  // that nothing imports — adding roughly a megabyte to a bundle already over budget to
  // serve two menu entries. A button that renders should work; these do not render.
  const exportOptions = [
    { label: 'Export as CSV', icon: Table, onClick: csv, format: 'csv' },
    { label: 'Export as JSON', icon: FileText, onClick: json, format: 'json' },
    { label: 'Export as PDF', icon: FileText, onClick: onExportPDF, format: 'pdf' },
    { label: 'Export as Excel', icon: Table, onClick: onExportExcel, format: 'xlsx' },
  ].filter((option) => option.onClick);

  if (exportOptions.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <Download className="w-4 h-4" />
        <span>Export</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              role="menu"
              className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20"
            >
              {exportOptions.map((option) => (
                <button
                  key={option.format}
                  role="menuitem"
                  onClick={() => {
                    option.onClick?.();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-2 hover:bg-slate-50 transition-colors text-left"
                >
                  <option.icon className="w-4 h-4 text-slate-600" />
                  <span className="text-sm text-slate-700">{option.label}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
