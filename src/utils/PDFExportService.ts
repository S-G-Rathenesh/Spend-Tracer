import { NativeModules } from 'react-native';
// @ts-ignore
import { generatePDF } from 'react-native-html-to-pdf';
import { Transaction } from '../types/Transaction';
import { SPENDLY_LOGO_BASE64 } from './spendly_logo_base64';

export class PDFExportService {
  static async exportTransactions(transactions: Transaction[], dateRangeStr: string): Promise<string> {
    
    const totalExpense = transactions.filter(t => t.type === 'Debit').reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = transactions.filter(t => t.type === 'Credit').reduce((sum, t) => sum + t.amount, 0);
    const netBalance = totalIncome - totalExpense;

    let tableRows = '';
    transactions.forEach(t => {
      const amountStr = (t.type === 'Debit' ? '-' : '+') + 'INR ' + t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 });
      const color = t.type === 'Debit' ? '#d32f2f' : '#2e7d32';
      
      tableRows += `
        <tr>
          <td>${t.date} ${t.time.substring(0, 5)}</td>
          <td>${t.merchantId || t.bank || 'Unknown'}</td>
          <td>${t.categoryId || 'Unknown'}</td>
          <td>${t.transactionType || 'UPI'}</td>
          <td style="color: ${color}; font-weight: bold;">${amountStr}</td>
        </tr>
      `;
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Spendly Financial Report</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #00E676; padding-bottom: 20px; }
          .logo-container { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 10px; }
          .logo-img { width: 44px; height: 44px; border-radius: 8px; object-fit: contain; }
          .logo { font-size: 28px; font-weight: bold; color: #00E676; }
          .report-title { font-size: 20px; margin-top: 5px; color: #555; }
          .date-range { font-size: 14px; color: #888; }
          
          .summary-container { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .summary-box { flex: 1; padding: 15px; background: #f5f5f5; border-radius: 8px; margin: 0 10px; text-align: center; }
          .summary-box:first-child { margin-left: 0; }
          .summary-box:last-child { margin-right: 0; }
          .summary-label { font-size: 12px; text-transform: uppercase; color: #888; }
          .summary-value { font-size: 18px; font-weight: bold; margin-top: 5px; }
          .income { color: #2e7d32; }
          .expense { color: #d32f2f; }
          .balance { color: #1565c0; }

          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          th { background-color: #00E676; color: white; padding: 10px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          
          .footer { text-align: center; margin-top: 50px; font-size: 10px; color: #aaa; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-container">
            <img src="data:image/png;base64,${SPENDLY_LOGO_BASE64}" class="logo-img" alt="Spendly Logo" />
            <div class="logo">Spendly</div>
          </div>
          <div class="report-title">Financial Report</div>
          <div class="date-range">${dateRangeStr}</div>
        </div>

        <div class="summary-container">
          <div class="summary-box">

            <div class="summary-label">Total Income</div>
            <div class="summary-value income">INR ${totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="summary-box">
            <div class="summary-label">Total Expense</div>
            <div class="summary-value expense">INR ${totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="summary-box">
            <div class="summary-label">Net Balance</div>
            <div class="summary-value balance">INR ${netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Merchant / Title</th>
              <th>Category</th>
              <th>Mode</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="footer">
          Generated securely by Spendly AI &bull; ${new Date().toLocaleString()}
        </div>
      </body>
      </html>
    `;

    const options = {
      html: htmlContent,
      fileName: `Spendly_Report_${new Date().getTime()}`,
      directory: 'Documents',
    };


    try {
      console.log("[PDFExportService] Checking module availability...");
      console.log("[PDFExportService] generatePDF function exists:", typeof generatePDF === 'function');
      console.log("[PDFExportService] NativeModules.HtmlToPdf exists:", !!NativeModules.HtmlToPdf);
      console.log("[PDFExportService] Calling generatePDF(options)...");
      
      const file = await generatePDF(options);
      return file.filePath || '';
    } catch (error) {
      console.error("[PDFExportService] Failed to generate PDF. Is native module linked properly?", error);
      throw new Error("Unable to generate the PDF. Please try again.");
    }
  }
}
