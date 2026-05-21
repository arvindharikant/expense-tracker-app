import React from 'react';
import * as XLSX from 'xlsx';
import { Upload } from 'lucide-react';

const categorizeTransaction = (description: string) => {
  const desc = description.toLowerCase();

  if (
    desc.includes('swiggy') ||
    desc.includes('zomato') ||
    desc.includes('restaurant')
  ) {
    return 'Food';
  }

  if (
    desc.includes('amazon') ||
    desc.includes('shopping')
  ) {
    return 'Shopping';
  }

  if (
    desc.includes('uber') ||
    desc.includes('bus') ||
    desc.includes('petrol')
  ) {
    return 'Transport';
  }

  if (
    desc.includes('salary') ||
    desc.includes('freelance')
  ) {
    return 'Income';
  }

  if (
    desc.includes('electricity') ||
    desc.includes('bill')
  ) {
    return 'Bills';
  }

  return 'Others';
};

export function BankStatementImport() {

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {

    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {

      const data = e.target?.result;

      const workbook = XLSX.read(data, {
        type: 'binary',
      });

      const sheetName = workbook.SheetNames[0];

      const worksheet = workbook.Sheets[sheetName];

      const jsonData =
        XLSX.utils.sheet_to_json<any>(worksheet);

      const importedTransactions =
        jsonData.map((row: any) => ({
          id: crypto.randomUUID(),

          date:
            row.Date ||
            new Date().toISOString(),

          description:
            row.Description ||
            'Transaction',

          amount:
            Math.abs(Number(row.Amount)) || 0,

          type:
            Number(row.Amount) > 0
              ? 'income'
              : 'expense',

          category:
            categorizeTransaction(
              row.Description || ''
            ),
        }));

      console.log(importedTransactions);

      alert(
        'Bank statement imported successfully!'
      );
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div className="bg-gray-900 rounded-3xl p-10 text-center text-white">

      <div className="flex justify-center mb-6">
        <div className="bg-blue-500/20 p-5 rounded-2xl">
          <Upload size={40} className="text-blue-400" />
        </div>
      </div>

      <h2 className="text-4xl font-bold mb-4">
        Import Bank Statement
      </h2>

      <p className="text-gray-400 max-w-2xl mx-auto mb-8 text-lg">
        Upload your bank statement in CSV or Excel format.
        Transactions will be automatically categorized.
      </p>

      <label className="inline-block cursor-pointer">

        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileUpload}
          className="hidden"
        />

        <div className="bg-blue-600 hover:bg-blue-700 transition px-8 py-4 rounded-2xl font-semibold text-lg">
          Select File to Upload
        </div>

      </label>

      <div className="flex justify-center gap-6 mt-6 text-gray-400">

        <span>📄 CSV</span>

        <span>📊 Excel</span>

      </div>

    </div>
  );
}