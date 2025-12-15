import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export interface InvoiceData {
  number: string;
  date: string;
  dueDate: string;
  clientName: string;
  clientAddress?: string;
  clientCity?: string;
  clientState?: string;
  clientZipCode?: string;
  clientCountry?: string;
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  tax?: number;
  total: number;
  notes?: string;
}

export const generateInvoicePDF = async (invoiceData: InvoiceData): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Create PDF directory if it doesn't exist
      const pdfDir = path.join(process.cwd(), 'pdfs');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }

      const fileName = `invoice-${invoiceData.number}-${Date.now()}.pdf`;
      const filePath = path.join(pdfDir, fileName);
      const stream = fs.createWriteStream(filePath);

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      doc.pipe(stream);

      // Header
      doc.fontSize(24).text('INVOICE', { align: 'center' });
      doc.moveDown();
      
      // Invoice details
      doc.fontSize(12);
      doc.text(`Invoice Number: ${invoiceData.number}`, { align: 'right' });
      doc.text(`Date: ${invoiceData.date}`, { align: 'right' });
      doc.text(`Due Date: ${invoiceData.dueDate}`, { align: 'right' });
      doc.moveDown(2);

      // Client information
      doc.fontSize(14).text('Bill To:', { continued: false });
      doc.fontSize(12);
      doc.text(invoiceData.clientName);
      if (invoiceData.clientAddress) doc.text(invoiceData.clientAddress);
      if (invoiceData.clientCity || invoiceData.clientState || invoiceData.clientZipCode) {
        const cityStateZip = [
          invoiceData.clientCity,
          invoiceData.clientState,
          invoiceData.clientZipCode
        ].filter(Boolean).join(', ');
        doc.text(cityStateZip);
      }
      if (invoiceData.clientCountry) doc.text(invoiceData.clientCountry);
      doc.moveDown(2);

      // Items table
      doc.fontSize(14).text('Items:', { continued: false });
      doc.moveDown();
      
      // Table header
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Description', 50, doc.y);
      doc.text('Qty', 300, doc.y);
      doc.text('Rate', 350, doc.y);
      doc.text('Amount', 450, doc.y, { align: 'right' });
      doc.moveDown();
      
      // Draw line
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);

      // Items
      doc.font('Helvetica');
      invoiceData.items.forEach((item) => {
        doc.text(item.description, 50, doc.y, { width: 240 });
        doc.text(item.quantity.toString(), 300, doc.y);
        doc.text(`$${item.rate.toFixed(2)}`, 350, doc.y);
        doc.text(`$${item.amount.toFixed(2)}`, 450, doc.y, { align: 'right' });
        doc.moveDown();
      });

      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // Totals
      doc.font('Helvetica-Bold');
      doc.text('Subtotal:', 400, doc.y, { align: 'right', continued: true });
      doc.font('Helvetica');
      doc.text(` $${invoiceData.subtotal.toFixed(2)}`, { align: 'right' });
      
      if (invoiceData.tax) {
        doc.moveDown();
        doc.font('Helvetica-Bold');
        doc.text('Tax:', 400, doc.y, { align: 'right', continued: true });
        doc.font('Helvetica');
        doc.text(` $${invoiceData.tax.toFixed(2)}`, { align: 'right' });
      }
      
      doc.moveDown();
      doc.moveTo(400, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();
      
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('Total:', 400, doc.y, { align: 'right', continued: true });
      doc.text(` $${invoiceData.total.toFixed(2)}`, { align: 'right' });

      // Notes
      if (invoiceData.notes) {
        doc.moveDown(2);
        doc.fontSize(10).font('Helvetica');
        doc.text('Notes:', { continued: false });
        doc.text(invoiceData.notes, { width: 500 });
      }

      // Footer - Add at the end of document
      doc.moveDown(3);
      doc.fontSize(8).text(
        'Thank you for your business!',
        { align: 'center' }
      );

      doc.end();

      stream.on('finish', () => {
        resolve(`/pdfs/${fileName}`);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

