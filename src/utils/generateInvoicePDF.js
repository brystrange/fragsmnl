import { jsPDF } from 'jspdf';

/**
 * Generate a professional PDF invoice for an order.
 *
 * @param {Object} order - The order object
 * @param {Object} opts
 * @param {Object} opts.invoiceSettings - Business branding from Firestore
 * @param {Object} opts.paymentSettings - Payment account details
 * @param {Object} opts.timeSettings    - Time configuration (paymentWaitHours etc.)
 */
export const generateInvoicePDF = (order, { invoiceSettings = {}, paymentSettings = {}, timeSettings = {} } = {}) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;
    const rightX = pageWidth - margin;

    const businessName = invoiceSettings.businessName || 'My Shop';
    const tagline = invoiceSettings.businessTagline || '';
    const terms = invoiceSettings.termsAndConditions || '';
    const cancellation = invoiceSettings.cancellationPolicy || '';

    // Currency formatter – no symbol, comma-separated, 2 decimals
    const fmt = (n) => n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let y = 18;

    // ── Helper to check page overflow and add new page ──
    const checkPage = (needed = 20) => {
        if (y + needed > 275) {
            doc.addPage();
            y = 20;
        }
    };

    // ═══════════════════════════════════════════════
    //   HEADER — Business name + INVOICE title
    // ═══════════════════════════════════════════════

    // Business name (left)
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(businessName.toUpperCase(), margin, y);

    // "INVOICE" title (right)
    doc.setFontSize(28);
    doc.text('INVOICE', rightX, y, { align: 'right' });

    y += 6;
    if (tagline) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        doc.text(tagline, margin, y);
        doc.setTextColor(0, 0, 0);
        y += 4;
    }

    y += 6;

    // Separator line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);
    doc.line(margin, y, rightX, y);
    y += 10;

    // ═══════════════════════════════════════════════
    //   INVOICE META — Customer info + Invoice details
    // ═══════════════════════════════════════════════

    const shipping = order.shippingDetails || {};
    const customerName = shipping.name || order.customerName || 'N/A';
    const customerAddress = shipping.address || 'N/A';
    const customerPhone = shipping.phone || '';

    // Left: Invoice To
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Invoice To', margin, y);
    doc.setTextColor(0, 0, 0);
    y += 5;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(customerName, margin, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    // Wrap address if long
    const addressLines = doc.splitTextToSize(customerAddress, 80);
    doc.text(addressLines, margin, y);
    const addressEndY = y + addressLines.length * 4;
    if (customerPhone) {
        doc.text(customerPhone, margin, addressEndY);
    }

    // Right: Invoice details
    const metaStartY = y - 10;
    const labelX = 125;
    const valX = 152;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('INVOICE NO :', labelX, metaStartY);
    doc.setFont('helvetica', 'normal');
    doc.text(order.orderNumber || 'N/A', valX, metaStartY);

    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE DATE :', labelX, metaStartY + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(order.createdAt).toLocaleDateString('en-PH', { day: '2-digit', month: 'short', year: 'numeric' }), valX, metaStartY + 6);

    doc.setFont('helvetica', 'bold');
    doc.text('STATUS :', labelX, metaStartY + 12);
    doc.setFont('helvetica', 'normal');
    const statusText = (order.paymentStatus || 'pending').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    doc.text(statusText, valX, metaStartY + 12);

    y = Math.max(addressEndY + 6, metaStartY + 20);

    // ═══════════════════════════════════════════════
    //   ITEMS TABLE
    // ═══════════════════════════════════════════════

    checkPage(30);

    // Table columns — Description gets maximum space, Price/Qty/Amount are tight
    const colDesc = margin;
    const colPrice = rightX - 60;        // Price column starts 60pt from right
    const colQty = rightX - 35;          // Qty column starts 35pt from right
    const colAmount = rightX - 5;        // Amount right-aligned with 5pt right padding
    const descMaxWidth = colPrice - margin - 10; // constrain description to avoid overlapping Price

    doc.setFillColor(30, 30, 30);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Description', colDesc + 3, y + 5.5);
    doc.text('Price', colPrice, y + 5.5);
    doc.text('Qty', colQty, y + 5.5);
    doc.text('Amount', colAmount, y + 5.5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 12;

    // Table rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    order.items.forEach((item) => {
        checkPage(14);
        const nameLines = doc.splitTextToSize(item.productName || '', descMaxWidth);
        doc.setFont('helvetica', 'bold');
        doc.text(nameLines, colDesc + 3, y);
        doc.setFont('helvetica', 'normal');
        doc.text(fmt(item.unitPrice), colPrice, y);
        doc.text(item.quantity.toString(), colQty + 3, y);
        doc.text(fmt(item.totalPrice), colAmount, y, { align: 'right' });

        // Move y past the wrapped description lines
        const rowHeight = Math.max(nameLines.length * 4, 4);
        y += rowHeight;
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.2);
        doc.line(margin, y, rightX, y);
        y += 4;
    });

    // ── Subtotal / Total ──
    y += 2;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.4);
    doc.line(colPrice - 5, y, rightX, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal', colPrice, y);
    doc.text(`: ${fmt(order.totalAmount)}`, colQty + 5, y);
    y += 7;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Total', colPrice, y);
    doc.text(`: ${fmt(order.totalAmount)}`, colQty + 5, y);
    y += 12;

    // ═══════════════════════════════════════════════
    //   BOTTOM POLICIES — Two-column layout
    //   LEFT:  Payment Details (accounts)
    //   RIGHT: Cancellation of Orders + Payment Terms
    // ═══════════════════════════════════════════════

    // Build payment accounts list from settings
    const paymentAccounts = [];
    if (paymentSettings.gcashNumber) {
        paymentAccounts.push({
            label: 'GCash',
            accountName: paymentSettings.gcashName || '',
            accountNumber: paymentSettings.gcashNumber
        });
    }
    if (paymentSettings.payMayaNumber) {
        paymentAccounts.push({
            label: 'PayMaya / Maya',
            accountName: paymentSettings.payMayaName || '',
            accountNumber: paymentSettings.payMayaNumber
        });
    }
    if (paymentSettings.bankName) {
        paymentAccounts.push({
            label: `Bank Transfer (${paymentSettings.bankName})`,
            accountName: paymentSettings.bankAccountName || '',
            accountNumber: paymentSettings.bankAccount || ''
        });
    }

    const policyFontHeading = 8;
    const policyFontBody = 7;
    const policyLineHeight = 3.5;

    // ── Measure left column (Payment Details) height ──
    let leftHeight = 5; // heading
    paymentAccounts.forEach((pm) => {
        leftHeight += 4; // label
        if (pm.accountName) leftHeight += policyLineHeight;
        leftHeight += policyLineHeight;
        leftHeight += 4; // spacing
    });

    // ── Measure right column (Cancellation + Payment Terms) height ──
    const rightColX = margin + 75; // right column starts after left column
    const rightColWidth = rightX - rightColX; // flexible — takes all remaining space
    let rightHeight = 0;

    let cancLines = [];
    if (cancellation) {
        const cancellationText = cancellation.replace(/\{businessName\}/g, businessName);
        cancLines = doc.splitTextToSize(cancellationText, rightColWidth);
        rightHeight += 5 + cancLines.length * policyLineHeight + 6; // heading + body + gap
    }

    let termsLines = [];
    if (terms) {
        termsLines = doc.splitTextToSize(terms, rightColWidth);
        rightHeight += 5 + termsLines.length * policyLineHeight + 4;
    }

    const totalPolicyHeight = Math.max(leftHeight, rightHeight) + 4;
    const pageHeight = doc.internal.pageSize.getHeight();
    const bottomY = pageHeight - 8; // anchor to the very bottom with minimal margin
    const policyStartY = bottomY - totalPolicyHeight;

    // If items push past where policies should start, add a new page
    if (y > policyStartY - 5) {
        doc.addPage();
    }

    // ── Render LEFT column — Payment Details ──
    let py = policyStartY;

    if (paymentAccounts.length > 0) {
        doc.setFontSize(policyFontHeading);
        doc.setFont('helvetica', 'bold');
        doc.text('PAYMENT DETAILS:', margin, py);
        py += 5;

        doc.setFontSize(policyFontBody);
        paymentAccounts.forEach((pm) => {
            doc.setFont('helvetica', 'bold');
            doc.text(pm.label, margin, py);
            py += 4;
            doc.setFont('helvetica', 'normal');
            if (pm.accountName) {
                doc.text(`Account Name: ${pm.accountName}`, margin, py);
                py += policyLineHeight;
            }
            doc.text(`Account Number: ${pm.accountNumber}`, margin, py);
            py += policyLineHeight + 4;
        });
    }

    // ── Render RIGHT column — Cancellation + Payment Terms ──
    let ry = policyStartY;

    if (cancLines.length > 0) {
        doc.setFontSize(policyFontHeading);
        doc.setFont('helvetica', 'bold');
        doc.text('CANCELLATION OF ORDERS:', rightColX, ry);
        ry += 4;
        doc.setFontSize(policyFontBody);
        doc.setFont('helvetica', 'normal');
        doc.text(cancLines, rightColX, ry);
        ry += cancLines.length * policyLineHeight + 6;
    }

    if (termsLines.length > 0) {
        doc.setFontSize(policyFontHeading);
        doc.setFont('helvetica', 'bold');
        doc.text('PAYMENT TERMS:', rightColX, ry);
        ry += 4;
        doc.setFontSize(policyFontBody);
        doc.setFont('helvetica', 'normal');
        doc.text(termsLines, rightColX, ry);
        ry += termsLines.length * policyLineHeight + 4;
    }

    // ── Save ──
    doc.save(`Invoice_${order.orderNumber || 'order'}.pdf`);
};
