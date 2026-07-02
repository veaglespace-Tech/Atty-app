const PDFDocument = require('pdfkit');

exports.generateSubscriptionAgreement = (orgData, adminData, planData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      doc.fontSize(16).text('SOFTWARE SUBSCRIPTION AGREEMENT', { align: 'center' });
      doc.fontSize(12).text('(ATTY – Dhol Tasha Pathak Management System)', { align: 'center' });
      doc.moveDown();
      doc.text('Between');
      doc.font('Helvetica-Bold').text('Veagle Space Technology Private Limited');
      doc.font('Helvetica').text('(Hereinafter referred to as the "Company")');
      doc.moveDown();
      doc.text('AND');
      doc.font('Helvetica-Bold').text(orgData.name || 'The Customer');
      doc.font('Helvetica').text('(Hereinafter referred to as the "Customer")');
      doc.moveDown();

      const sections = [
        "1. Definitions\n\"Software\" means ATTY – Dhol Tasha Pathak Management System\n\"Services\" means cloud-based software services provided by Veagle Space Technology Private Limited.\n\"Subscription\" means the selected paid plan.\n\"User\" means any authorized person using the software.",
        "2. Governing Laws\nThis Agreement shall be governed by:\n    • Information Technology Act, 2000\n    • Digital Personal Data Protection Act, 2023\n    • Indian Contract Act, 1872\n    • Consumer Protection Act, 2019\n    • Copyright Act, 1957\n    • Applicable Indian Laws",
        "3. Grant of License\nThe Company grants the Customer:\n    • Limited\n    • Non-exclusive\n    • Non-transferable\n    • Revocable\nlicense to use the Software during the active subscription period.\nOwnership of the Software shall remain exclusively with Veagle Space Technology Private Limited.",
        "4. Subscription\nThe Customer agrees to purchase the selected plan.\nSubscription becomes active only after:\n    • Successful payment\n    • Account activation",
        "5. Intellectual Property\nThe Customer acknowledges that:\nAll rights including\n    • Source Code\n    • Design\n    • Database\n    • APIs\n    • Algorithms\n    • Mobile Application\n    • Website\n    • Logo\n    • Trademark\nare the exclusive property of Veagle Space Technology Private Limited.\nNo ownership rights are transferred.",
        "6. Restrictions\nCustomer shall not\n    • Copy software\n    • Sell software\n    • Reverse engineer\n    • Modify software\n    • Extract database\n    • Create duplicate platform\n    • Rent software\n    • Resell software\nViolation may result in immediate termination.",
        "7. Customer Data\nCustomer owns its operational data.\nCompany processes data solely for providing software services.\nCompany will implement commercially reasonable security measures.",
        "8. Personal Data Processing\nCustomer confirms that it has obtained necessary consent from all members before uploading:\n    • Name\n    • Mobile Number\n    • Photograph\n    • Face Image\n    • GPS Location\n    • Attendance Data\nCustomer remains the Data Fiduciary where applicable under the DPDP Act.\nCompany acts as a Data Processor for software operations.",
        "9. Face Recognition\nCustomer agrees that\nFace Recognition feature is enabled only after obtaining consent from members.\nCompany shall not be liable for unauthorized collection of biometric information by Customer.",
        "10. GPS Attendance\nGPS attendance depends upon\n    • Internet\n    • GPS Signal\n    • Device Permissions\n    • Mobile Hardware\nCompany does not guarantee GPS accuracy.",
        "11. Availability\nTarget uptime:\n99% Monthly\nexcluding\n    • Scheduled Maintenance\n    • Force Majeure\n    • Third Party Cloud Failures",
        "12. Support\nSupport available during business hours.\nSupport includes\n    • Login Issues\n    • Technical Guidance\n    • Bug Reporting\n    • Basic Configuration",
        "13. Updates\nCompany may release\n    • Security Updates\n    • Bug Fixes\n    • Feature Enhancements\nwithout additional approval.",
        "14. Payment\nSubscription fees are payable in advance.\nGST shall be applicable wherever required.\nSubscription fees are exclusive of applicable taxes unless otherwise stated.",
        "15. Refund Policy\nThe Customer acknowledges that:\nSoftware access is activated immediately after purchase.\nAccordingly,\nSubscription Fees\nActivation Charges\nRenewal Charges\nCustomization Charges\nTraining Charges\nshall be non-refundable after activation, except where refund is required under applicable law or where the Company fails to provide the subscribed service.\nCustomers are advised to evaluate the software using the Demo or Free Trial before purchasing.",
        "16. Cancellation\nCustomer may discontinue use anytime.\nCancellation shall not affect payment obligations already incurred.",
        "17. Suspension\nCompany may suspend services if\n    • Illegal Activities\n    • Copyright Violation\n    • Fraud\n    • Unauthorized Access\n    • Payment Default",
        "18. Confidentiality\nBoth parties agree not to disclose confidential information except as required by law.",
        "19. Data Backup\nCompany performs routine backups.\nHowever,\nCustomer is advised to periodically download reports.\nCompany shall not be liable for data loss caused by\n    • Customer deletion\n    • Device Failure\n    • Third Party Cloud Outage\n    • Cyber Attacks beyond reasonable control",
        "20. Limitation of Liability\nTo the maximum extent permitted by law,\nCompany's total liability shall not exceed the subscription fee paid by Customer during the previous 12 months.\nCompany shall not be liable for\n    • Loss of Profit\n    • Business Interruption\n    • Indirect Damages\n    • Consequential Loss\n    • Reputation Loss",
        "21. Force Majeure\nNeither party shall be liable for delays caused by\n    • Flood\n    • Fire\n    • Earthquake\n    • Pandemic\n    • Internet Failure\n    • Government Restrictions\n    • War\n    • Cyber Attack\n    • Power Failure",
        "22. Termination\nCompany may terminate services if Customer\n    • Violates Agreement\n    • Misuses Platform\n    • Copies Software\n    • Uses Illegal Content",
        "23. Dispute Resolution\nParties shall first attempt amicable settlement.\nIf unresolved,\nDisputes shall be referred to arbitration in accordance with the Arbitration and Conciliation Act, 1996.\nSeat of Arbitration:\nPune, Maharashtra\nLanguage:\nEnglish",
        "24. Jurisdiction\nSubject to arbitration,\nCourts having jurisdiction over the registered office of Veagle Space Technology Private Limited shall have exclusive jurisdiction.",
        "25. Electronic Acceptance\nThe Customer agrees that clicking\n\"I Agree\"\nor purchasing any subscription constitutes a valid electronic acceptance under the Information Technology Act, 2000.\nElectronic records and electronic signatures shall have the same legal effect as physical signatures, subject to applicable law.",
        "26. Entire Agreement\nThis Agreement supersedes all previous verbal or written understandings."
      ];

      for (const section of sections) {
        const [title, ...body] = section.split('\n');
        doc.font('Helvetica-Bold').text(title);
        doc.font('Helvetica').text(body.join('\n'));
        doc.moveDown();
      }

      // Add a page break if needed for plan details
      doc.addPage();
      
      doc.fontSize(14).font('Helvetica-Bold').text('Plan Details');
      doc.moveDown();
      doc.fontSize(12).font('Helvetica');
      doc.text(`Plan Name: ${planData.name || 'N/A'}`);
      doc.text(`Plan Code: ${planData.code || 'N/A'}`);
      doc.text(`Amount: ${planData.currency || 'INR'} ${planData.amount || '0'}`);
      doc.text(`Duration (Days): ${planData.durationInDays || 'N/A'}`);
      doc.text(`Start Date: ${planData.startDate ? new Date(planData.startDate).toLocaleDateString() : 'N/A'}`);
      doc.text(`Expiry Date: ${planData.endDate ? new Date(planData.endDate).toLocaleDateString() : 'N/A'}`);
      doc.moveDown(2);

      doc.fontSize(14).font('Helvetica-Bold').text('Customer Declaration');
      doc.fontSize(12).font('Helvetica');
      doc.text('I confirm that:');
      doc.text('    • I have read this Agreement.');
      doc.text('    • I understand the Terms & Conditions.');
      doc.text('    • I agree to the Privacy Policy.');
      doc.text('    • I understand the Refund Policy.');
      doc.text('    • I agree to the Subscription Terms.');
      doc.moveDown();

      doc.font('Helvetica-Bold').text('Customer Name: ', { continued: true }).font('Helvetica').text(adminData.name || 'N/A');
      doc.font('Helvetica-Bold').text('Organization: ', { continued: true }).font('Helvetica').text(orgData.name || 'N/A');
      doc.font('Helvetica-Bold').text('Signature: ', { continued: true }).font('Helvetica').text('Electronic Acceptance');
      doc.font('Helvetica-Bold').text('Mobile Number: ', { continued: true }).font('Helvetica').text(adminData.mobile || 'N/A');
      doc.font('Helvetica-Bold').text('Date: ', { continued: true }).font('Helvetica').text(new Date().toLocaleDateString());
      doc.moveDown(2);

      doc.font('Helvetica-Bold').text('Company');
      doc.font('Helvetica').text('Veagle Space Technology Private Limited');
      doc.text('Authorized Signatory');
      doc.text('Name: Vinay Patel');
      doc.text('Website: https://atty.veaglespace.com', { link: 'https://atty.veaglespace.com' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
