import { jsPDF } from 'jspdf';

export const generateQuotePDF = (quoteData, companyDetails) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = margin;

  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(30, 64, 175);
  doc.text('QUOTE', margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`#${quoteData.id || 'N/A'}`, margin, y);
  y += 5;
  doc.text(`Date: ${quoteData.date || new Date().toLocaleDateString()}`, margin, y);
  y += 15;

  if (companyDetails.name) {
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(companyDetails.name, pageWidth - margin, 20, { align: 'right' });
  }

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(80, 80, 80);
  let companyY = 28;
  if (companyDetails.address) {
    const addressLines = doc.splitTextToSize(companyDetails.address, 80);
    doc.text(addressLines, pageWidth - margin, companyY, { align: 'right' });
    companyY += addressLines.length * 5;
  }
  if (companyDetails.email) {
    doc.text(companyDetails.email, pageWidth - margin, companyY, { align: 'right' });
    companyY += 5;
  }
  if (companyDetails.phone) {
    doc.text(companyDetails.phone, pageWidth - margin, companyY, { align: 'right' });
    companyY += 5;
  }
  if (companyDetails.abn) {
    doc.text(`ABN: ${companyDetails.abn}`, pageWidth - margin, companyY, { align: 'right' });
  }

  y = Math.max(y, companyY + 10);

  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, pageWidth - 2 * margin, 35, 'F');

  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Prepared For:', margin + 5, y + 8);

  doc.setFontSize(11);
  doc.text(quoteData.clientName || 'Valued Client', margin + 5, y + 15);

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(80, 80, 80);
  if (quoteData.jobAddress) {
    const jobAddressLines = doc.splitTextToSize(quoteData.jobAddress, 160);
    doc.text(jobAddressLines, margin + 5, y + 21);
  }
  if (quoteData.clientEmail) {
    doc.text(`Email: ${quoteData.clientEmail}`, margin + 5, y + 28);
  }

  y += 45;

  if (quoteData.scopeSummary) {
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Scope of Work Summary', margin, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(60, 60, 60);
    const summaryLines = doc.splitTextToSize(quoteData.scopeSummary, pageWidth - 2 * margin);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 5 + 10;
  }

  if (y > pageHeight - 80) {
    doc.addPage();
    y = margin;
  }

  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);

  const tableTop = y;
  const col1 = margin;
  const col2 = pageWidth - 110;
  const col3 = pageWidth - 70;
  const col4 = pageWidth - margin - 30;

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, tableTop, pageWidth - 2 * margin, 8, 'F');

  doc.text('Description', col1 + 2, tableTop + 5);
  doc.text('Qty', col2, tableTop + 5);
  doc.text('Unit', col3, tableTop + 5);
  doc.text('Total', col4, tableTop + 5);

  y = tableTop + 10;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);

  if (quoteData.items && quoteData.items.length > 0) {
    quoteData.items.forEach((item, index) => {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = margin;
      }

      const descLines = doc.splitTextToSize(item.description || '', col2 - col1 - 10);
      doc.text(descLines, col1 + 2, y);

      const lineHeight = Math.max(descLines.length * 5, 6);

      doc.text(String(item.qty || 0), col2, y);
      doc.text(`$${(item.price || 0).toFixed(2)}`, col3, y);
      doc.text(`$${((item.qty || 0) * (item.price || 0)).toFixed(2)}`, col4, y);

      y += lineHeight + 2;

      if (index < quoteData.items.length - 1) {
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, y - 1, pageWidth - margin, y - 1);
        y += 2;
      }
    });
  }

  y += 5;

  const total = quoteData.items
    ? quoteData.items.reduce((sum, item) => sum + (item.qty || 0) * (item.price || 0), 0)
    : 0;

  const gstAmount = companyDetails.gstRegistered ? total / 11 : 0;
  const subTotal = companyDetails.gstRegistered ? total - gstAmount : total;

  if (y > pageHeight - 50) {
    doc.addPage();
    y = margin;
  }

  doc.setDrawColor(50, 50, 50);
  doc.line(col3 - 10, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(9);
  if (companyDetails.gstRegistered) {
    doc.text('Subtotal', col3 - 10, y);
    doc.text(`$${subTotal.toFixed(2)}`, col4, y);
    y += 6;

    doc.text('GST (10%)', col3 - 10, y);
    doc.text(`$${gstAmount.toFixed(2)}`, col4, y);
    y += 8;
  }

  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Total', col3 - 10, y);
  doc.setTextColor(30, 64, 175);
  doc.text(`$${total.toFixed(2)}`, col4, y);
  y += 3;

  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(companyDetails.gstRegistered ? 'Includes GST' : 'GST Free', col4, y, { align: 'right' });

  y += 15;

  if (y > pageHeight - 40) {
    doc.addPage();
    y = margin;
  }

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  const detailsStartY = y;

  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Bank Details', margin, y);
  y += 7;

  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(80, 80, 80);
  if (companyDetails.bankName) {
    doc.text(`Bank: ${companyDetails.bankName}`, margin, y);
    y += 5;
  }
  if (companyDetails.accountName) {
    doc.text(`Acct: ${companyDetails.accountName}`, margin, y);
    y += 5;
  }
  if (companyDetails.bsb && companyDetails.accountNumber) {
    doc.text(`BSB: ${companyDetails.bsb} | Acc: ${companyDetails.accountNumber}`, margin, y);
    y += 5;
  }

  let termsY = detailsStartY;
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Terms', pageWidth - margin, termsY, { align: 'right' });
  termsY += 7;

  doc.setFontSize(8);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(80, 80, 80);
  if (companyDetails.terms) {
    doc.text(companyDetails.terms, pageWidth - margin, termsY, { align: 'right' });
    termsY += 5;
  }
  doc.text('Valid for 30 Days', pageWidth - margin, termsY, { align: 'right' });

  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Powered by Talk2Quote App', pageWidth / 2, pageHeight - 10, { align: 'center' });

  return doc;
};

export const generatePDFBase64 = (quoteData, companyDetails) => {
  const doc = generateQuotePDF(quoteData, companyDetails);
  return doc.output('datauristring').split(',')[1];
};

export const downloadPDF = (quoteData, companyDetails) => {
  const doc = generateQuotePDF(quoteData, companyDetails);
  doc.save(`Quote_${quoteData.id}.pdf`);
};
