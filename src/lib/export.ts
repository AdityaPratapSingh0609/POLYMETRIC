// Client-side export helpers. All three run entirely in the browser against
// data already fetched into the page — no server-side rendering pipeline to
// keep correct, and no dependency on the app being online at export time.
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    downloadBlob(filename, new Blob(["No data for the selected filters"], { type: "text/csv" }));
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown) => {
    const str = val === null || val === undefined ? "" : String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [headers.join(","), ...rows.map((row) => headers.map((h) => escape(row[h])).join(","))];
  downloadBlob(filename, new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }));
}

export function downloadExcel(filename: string, sheetName: string, rows: Record<string, unknown>[]) {
  const worksheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: "No data for the selected filters" }]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, filename);
}

export function downloadPdfTable(
  filename: string,
  title: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString("en-IN"), 14, 22);
  autoTable(doc, {
    head: [headers],
    body: rows.length ? rows : [["No data for the selected filters"]],
    startY: 28,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [184, 128, 46] },
  });
  doc.save(filename);
}
