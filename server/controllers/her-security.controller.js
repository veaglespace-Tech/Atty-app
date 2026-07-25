const prisma = require("../lib/prisma");
const sendEmail = require("../utils/email");

/**
 * Controller to process Her Security / Tichi Suraksha Emergency SOS Alert
 */
const sendSosAlert = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized user." });
    }

    // Fetch full user and organization details
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      include: {
        organization: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User profile not found." });
    }

    const { latitude, longitude, mapsUrl, address, note } = req.body || {};

    // Determine Org Admin Email
    let orgAdminEmail = user.organization?.email || null;
    if (user.orgId) {
      const orgAdminUser = await prisma.user.findFirst({
        where: {
          orgId: user.orgId,
          role: "ORG_ADMIN",
          isActive: true,
        },
        select: { email: true },
      });
      if (orgAdminUser?.email) {
        orgAdminEmail = orgAdminUser.email;
      }
    }

    const supportEmail =
      process.env.SUPPORT_EMAIL ||
      process.env.EMAIL_1 ||
      process.env.EMAIL_USER ||
      "support@veagle.in";

    const alertTime = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "medium",
    });

    const calculatedMapsUrl =
      mapsUrl ||
      (latitude && longitude
        ? `https://maps.google.com/?q=${latitude},${longitude}`
        : null);

    const locationDisplay = calculatedMapsUrl
      ? `<a href="${calculatedMapsUrl}" target="_blank" style="display:inline-block; padding:12px 24px; background-color:#dc2626; color:#ffffff; font-weight:bold; text-decoration:none; border-radius:8px; margin-top:10px;">📍 View Live Location on Google Maps</a>`
      : "<p style='color:#ef4444; font-weight:bold;'>Location unavailable or permission denied by device.</p>";

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 2px solid #dc2626; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #dc2626; color: #ffffff; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; text-transform: uppercase; tracking: 1px;">🚨 EMERGENCY SOS ALERT 🚨</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Tichi Suraksha / Her Security Emergency System</p>
        </div>
        
        <div style="padding: 24px; color: #1e293b;">
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px;">
            <strong style="color: #991b1b; font-size: 15px;">IMMEDIATE ATTENTION REQUIRED</strong>
            <p style="margin: 4px 0 0 0; color: #7f1d1d; font-size: 13px;">
              An emergency distress trigger was activated by the user below. Please verify their safety immediately.
            </p>
          </div>

          <h3 style="border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; color: #0f172a; margin-top: 0;">👤 User Details</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 40%;"><strong>Full Name:</strong></td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${user.name}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Email:</strong></td>
              <td style="padding: 6px 0; color: #0f172a;">${user.email}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Phone Number:</strong></td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${user.mobile || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Emergency Contact:</strong></td>
              <td style="padding: 6px 0; color: #dc2626; font-weight: 700;">${user.emergencyContact || user.mobile || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Organisation Name:</strong></td>
              <td style="padding: 6px 0; color: #0f172a;">${user.organization?.name || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Organisation ID:</strong></td>
              <td style="padding: 6px 0; color: #0f172a;">${user.orgId || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Alert Time:</strong></td>
              <td style="padding: 6px 0; color: #0f172a;">${alertTime}</td>
            </tr>
          </table>

          <h3 style="border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; color: #0f172a;">🗺️ Live Location & GPS Data</h3>
          <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #334155;">
              <strong>Coordinates:</strong> ${latitude && longitude ? `${latitude}, ${longitude}` : "Captured via Web GPS"}
            </p>
            ${address ? `<p style="margin: 0 0 12px 0; font-size: 13px; color: #64748b;"><strong>Address:</strong> ${address}</p>` : ""}
            ${locationDisplay}
          </div>

          ${note ? `<div style="background-color: #fffbebf; border: 1px solid #fef3c7; padding: 12px; border-radius: 6px; font-size: 13px; color: #92400e; margin-bottom: 20px;"><strong>User Note:</strong> ${note}</div>` : ""}

          <div style="font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; pt-12; padding-top: 12px; text-align: center;">
            This is an automated high-priority emergency alert generated by Veagle Attendee Safety System.
          </div>
        </div>
      </div>
    `;

    // Recipient emails array
    const recipients = Array.from(
      new Set([orgAdminEmail, supportEmail].filter(Boolean))
    );

    if (recipients.length > 0) {
      await sendEmail({
        email: recipients.join(","),
        subject: `🚨 URGENT SOS ALERT: ${user.name} (${user.organization?.name || "Attendee User"})`,
        html: htmlBody,
        fromName: "Tichi Suraksha SOS System",
      });
    }

    return res.status(200).json({
      success: true,
      message: "SOS Emergency Alert dispatched successfully.",
      recipientsSent: recipients,
      timestamp: alertTime,
    });
  } catch (error) {
    console.error("Error sending SOS Emergency alert:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to dispatch SOS alert. Please try calling emergency number directly.",
      error: error.message,
    });
  }
};

module.exports = {
  sendSosAlert,
};
