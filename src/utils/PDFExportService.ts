import { NativeModules } from 'react-native';
// @ts-ignore
import { generatePDF } from 'react-native-html-to-pdf';
import { Transaction } from '../types/Transaction';

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

    const SPENDTRACER_LOGO_BASE64 = "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";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Spend Tracer Financial Report</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #00E676; padding-bottom: 20px; }
          .logo-container { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px; }
          .logo-img { width: 40px; height: 40px; }
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
            <img src="data:image/png;base64,${SPENDTRACER_LOGO_BASE64}" class="logo-img" alt="Logo" />
            <div class="logo">Spend Tracer</div>
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
          Generated securely by Spend Tracer AI &bull; ${new Date().toLocaleString()}
        </div>
      </body>
      </html>
    `;

    const options = {
      html: htmlContent,
      fileName: `SpendTracer_Report_${new Date().getTime()}`,
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
