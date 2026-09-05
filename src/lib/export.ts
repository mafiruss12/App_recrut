import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ClientEntry } from '../types';

function spreadsheetCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  // Prevent formula injection when a CSV is opened by Excel/Sheets.
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

/**
 * Excel-compatible UTF-8 CSV. We intentionally do not use the unmaintained
 * SheetJS package in the browser; CSV is safer, smaller and opens directly in
 * Excel, LibreOffice and Google Sheets.
 */
export function exportToExcel(clients: ClientEntry[], filename = 'Recrutement_K2L_Export_Excel.csv') {
  exportToCSV(clients, filename.replace(/\.xlsx$/i, '.csv'));
}

export function exportToCSV(clients: ClientEntry[], filename = 'Recrutement_K2L_Export.csv') {
  const headers = [
    'N°',
    'Date_Heure',
    'Telephone_Client',
    'Commercial',
    'Tel_Commercial',
    'Cabinet',
    'Localite',
    'Partenaire',
    'Action',
    'Statut',
    'Notes',
  ];

  const rows = clients.map((client, index) => [
    String(index + 1),
    new Date(client.created_at).toLocaleString('fr-FR'),
    client.client_phone,
    client.commercial_name,
    client.commercial_phone,
    client.cabinet,
    client.localite,
    client.partenaire,
    client.action,
    client.status,
    client.notes || '',
  ].map(spreadsheetCell).join(';'));

  const csvContent = '\uFEFF' + [headers.map(spreadsheetCell).join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportToPDF(
  clients: ClientEntry[],
  title = 'Rapport Recrutement K2L',
  filename = 'Recrutement_K2L_Rapport.pdf'
) {
  const doc = new jsPDF('landscape');
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title.slice(0, 70), 14, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`Généré le ${new Date().toLocaleString('fr-FR')} | Total: ${clients.length} clients saisis`, 14, 20);

  const tableData = clients.map((client, index) => [
    String(index + 1),
    new Date(client.created_at).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
    }),
    client.client_phone,
    client.commercial_name,
    client.cabinet,
    client.localite,
    client.partenaire,
    client.action,
    client.status === 'synced' ? 'OK' : client.status === 'failed' ? 'Erreur' : 'En attente',
  ]);

  autoTable(doc, {
    head: [['N°', 'Date/Heure', 'Téléphone Client', 'Commercial', 'Cabinet', 'Localité', 'Partenaire', 'Action', 'Sync']],
    body: tableData,
    startY: 32,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 8.5, fontStyle: 'bold', halign: 'left' },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: 32, left: 12, right: 12, bottom: 15 },
  });

  doc.save(filename);
}
