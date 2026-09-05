import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ClientEntry } from '../types';

/**
 * Export clients to Excel (.xlsx)
 */
export function exportToExcel(clients: ClientEntry[], filename = 'Recrutement_K2L_Export.xlsx') {
  const data = clients.map((c, index) => ({
    'N°': index + 1,
    'Date / Heure': new Date(c.created_at).toLocaleString('fr-FR'),
    'Téléphone Client': c.client_phone,
    'Commercial': c.commercial_name,
    'Tél Commercial': c.commercial_phone,
    'Cabinet': c.cabinet,
    'Localité': c.localite,
    'Partenaire': c.partenaire,
    'Action': c.action,
    'Statut Synchro': c.status === 'synced' ? 'Synchronisé' : 'En attente',
    'Notes': c.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients K2L');

  // Adjust column widths
  const colWidths = [
    { wch: 6 },
    { wch: 20 },
    { wch: 18 },
    { wch: 20 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 14 },
    { wch: 25 },
  ];
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, filename);
}

/**
 * Export clients to CSV (with UTF-8 BOM for Excel compatibility)
 */
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

  const rows = clients.map((c, i) => [
    i + 1,
    `"${new Date(c.created_at).toLocaleString('fr-FR')}"`,
    `"${c.client_phone}"`,
    `"${(c.commercial_name || '').replace(/"/g, '""')}"`,
    `"${c.commercial_phone || ''}"`,
    `"${(c.cabinet || '').replace(/"/g, '""')}"`,
    `"${(c.localite || '').replace(/"/g, '""')}"`,
    `"${(c.partenaire || '').replace(/"/g, '""')}"`,
    `"${(c.action || '').replace(/"/g, '""')}"`,
    `"${c.status}"`,
    `"${(c.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export clients to PDF with K2L branding & frosted-glass accent headers
 */
export function exportToPDF(
  clients: ClientEntry[],
  title = 'Rapport Recrutement K2L',
  filename = 'Recrutement_K2L_Rapport.pdf'
) {
  const doc = new jsPDF('landscape');

  // Header Banner
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, 297, 26, 'F');

  // Title Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('K2L RECRUTEMENT — RAPPORT DE SUIVI CLIENTS', 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    `Généré le ${new Date().toLocaleString('fr-FR')} | Total: ${clients.length} clients saisis`,
    14,
    20
  );

  // Table
  const tableData = clients.map((c, i) => [
    (i + 1).toString(),
    new Date(c.created_at).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    c.client_phone,
    c.commercial_name,
    c.cabinet,
    c.localite,
    c.partenaire,
    c.action,
    c.status === 'synced' ? 'OK' : 'En attente',
  ]);

  autoTable(doc, {
    head: [
      [
        'N°',
        'Date/Heure',
        'Téléphone Client',
        'Commercial',
        'Cabinet',
        'Localité',
        'Partenaire',
        'Action',
        'Sync',
      ],
    ],
    body: tableData,
    startY: 32,
    theme: 'striped',
    headStyles: {
      fillColor: [79, 70, 229], // indigo-600
      textColor: 255,
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { top: 32, left: 12, right: 12, bottom: 15 },
  });

  doc.save(filename);
}
