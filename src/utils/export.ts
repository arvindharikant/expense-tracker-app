import { Transaction } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';

export const exportToPDF = (transactions: Transaction[], currencySymbol: string) => {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text('Expense Tracker Report', 14, 22);
  
  doc.setFontSize(11);
  doc.text(`Generated on: ${format(new Date(), 'MMM d, yyyy')}`, 14, 30);

  const tableColumn = ["Date", "Type", "Category", "Description", "Amount"];
  const tableRows = transactions.map(t => [
    format(parseISO(t.date), 'MMM d, yyyy'),
    t.type === 'income' ? 'Income' : 'Expense',
    t.category,
    t.description || '',
    `${t.type === 'income' ? '+' : '-'}${currencySymbol}${t.amount.toFixed(2)}`
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [41, 41, 41] },
  });

  doc.save('expense_tracker_report.pdf');
};

export const exportToExcel = (transactions: Transaction[]) => {
  const wsData = transactions.map(t => ({
    Date: format(parseISO(t.date), 'MMM d, yyyy'),
    Type: t.type === 'income' ? 'Income' : 'Expense',
    Category: t.category,
    Description: t.description || '',
    Amount: t.type === 'income' ? t.amount : -t.amount
  }));

  const ws = XLSX.utils.json_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
  
  XLSX.writeFile(wb, "expense_tracker_report.xlsx");
};
