/**
 * Print & Download PDF Receipt Utility
 */

export interface OrderReceiptData {
  reference: string;
  totalGhs: number;
  status: string;
  createdAt: string;
  customerPhone?: string;
  customerEmail?: string;
  items: Array<{
    network: string;
    sizeLabel: string;
    recipientPhone: string;
    priceGhs: number;
  }>;
}

export function generatePrintableReceiptHtml(data: OrderReceiptData): string {
  const itemRows = data.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 700;">${item.network} ${item.sizeLabel}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 700;">${item.recipientPhone}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 800; text-align: right;">GH₵ ${item.priceGhs.toFixed(2)}</td>
    </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt_${data.reference}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; background: #fff; color: #0f172a; }
    .receipt-box { max-width: 600px; margin: 0 auto; border: 2px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 20px; margin-bottom: 24px; }
    .badge { display: inline-block; background: #dcfce7; color: #15803d; font-weight: 800; font-size: 12px; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { text-align: left; background: #f8fafc; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; }
    .total-row { background: #f8fafc; font-size: 16px; font-weight: 900; }
    .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 30px; }
    @media print { body { padding: 0; } .receipt-box { border: none; box-shadow: none; } }
  </style>
</head>
<body>
  <div class="receipt-box">
    <div class="header">
      <h1 style="margin:0; font-size: 24px; font-weight: 900;">Bestdata Ghana Hub</h1>
      <div style="font-size: 12px; color: #64748b; font-weight: 700; margin-top: 4px;">OFFICIAL ORDER RECEIPT & INVOICE</div>
      <div class="badge">${data.status.toUpperCase()}</div>
    </div>

    <div style="display: flex; justify-content: space-between; font-size: 12px; color: #475569; margin-bottom: 20px;">
      <div>
        <strong>Order Reference:</strong> #${data.reference}<br>
        <strong>Date:</strong> ${new Date(data.createdAt).toLocaleString()}
      </div>
      <div style="text-align: right;">
        <strong>Payment Status:</strong> Verified Paid<br>
        <strong>Fulfilled Via:</strong> SwiftData API
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Package Item</th>
          <th>Recipient Phone</th>
          <th style="text-align: right;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        <tr class="total-row">
          <td colspan="2" style="padding: 14px 12px;">TOTAL AMOUNT PAID</td>
          <td style="padding: 14px 12px; text-align: right; color: #4f46e5;">GH₵ ${data.totalGhs.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <div class="footer">
      Thank you for doing business with Bestdata Ghana Hub!<br>
      For support or inquiry: support@bestdatagh.com | https://ghana-data-hub-gold.vercel.app
    </div>
  </div>
  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;
}

export function openPrintableReceipt(data: OrderReceiptData) {
  const html = generatePrintableReceiptHtml(data);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
