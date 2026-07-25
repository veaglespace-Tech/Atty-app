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
    let user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      include: {
        organization: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User profile not found." });
    }

    // Fallback: If user.orgId / user.organization is null, find organization via TeamMember
    let effectiveOrgId = user.orgId || user.organization?.id || null;
    let effectiveOrgName = user.organization?.name || null;
    let effectiveOrgCode = user.organization?.organizationCode || null;

    if (!effectiveOrgId) {
      const teamMember = await prisma.teamMember.findFirst({
        where: { userId: user.id },
        include: {
          team: {
            include: {
              organization: true,
            },
          },
        },
      });

      if (teamMember?.team?.organization) {
        effectiveOrgId = teamMember.team.organization.id;
        effectiveOrgName = teamMember.team.organization.name;
        effectiveOrgCode = teamMember.team.organization.organizationCode;
        user.organization = teamMember.team.organization;
      }
    }

    const { latitude, longitude, mapsUrl, address, note } = req.body || {};

    // Determine Org Admin Email
    let orgAdminEmail = user.organization?.email || null;
    if (effectiveOrgId) {
      const orgAdminUser = await prisma.user.findFirst({
        where: {
          orgId: effectiveOrgId,
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
      ? `<a href="${calculatedMapsUrl}" target="_blank" style="display:inline-block; max-width:100%; box-sizing:border-box; padding:12px 20px; background-color:#dc2626; color:#ffffff; font-weight:bold; text-decoration:none; border-radius:8px; margin-top:10px; word-break:break-word; text-align:center;">📍 View Live Location on Google Maps</a>`
      : "<p style='color:#ef4444; font-weight:bold; margin:10px 0 0 0;'>Location unavailable or permission denied by device.</p>";

    const userPhotoUrl =
      user.profileImageUrl ||
      user.profileImage ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "User")}&background=dc2626&color=ffffff&size=200&bold=true`;

    const htmlBody = `
      <div style="font-family: Arial, Helvetica, sans-serif; width: 100%; max-width: 600px; margin: 0 auto; border: 2px solid #dc2626; border-radius: 12px; overflow: hidden; background-color: #ffffff; box-sizing: border-box; word-wrap: break-word; word-break: break-word; overflow-wrap: break-word;">
        <div style="background-color: #dc2626; color: #ffffff; padding: 20px 16px; text-align: center; box-sizing: border-box;">
          <h1 style="margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 1px; word-break: break-word;">🚨 EMERGENCY SOS ALERT 🚨</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.95;"> तिची सुरक्षा / Her Security Emergency System </p>
        </div>
        
        <div style="padding: 20px 16px; color: #1e293b; box-sizing: border-box;">
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 12px 14px; margin-bottom: 20px; border-radius: 4px; box-sizing: border-box;">
            <strong style="color: #991b1b; font-size: 14px;">IMMEDIATE ATTENTION REQUIRED</strong>
            <p style="margin: 4px 0 0 0; color: #7f1d1d; font-size: 13px; line-height: 1.4;">
              An emergency distress trigger was activated by the user below. Please verify their safety immediately.
            </p>
          </div>

          <h3 style="border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; color: #0f172a; margin: 0 0 14px 0; font-size: 16px;">👤 User Details</h3>
          <div style="text-align: center; margin-bottom: 16px;">
            <img src="${userPhotoUrl}" alt="${user.name}" style="width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 3px solid #dc2626; display: inline-block;" />
            <div style="margin-top: 4px;"><a href="${userPhotoUrl}" target="_blank" style="font-size: 11px; color: #2563eb; text-decoration: underline;">Open Full Size Photo</a></div>
          </div>
          <table style="width: 100%; table-layout: fixed; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; box-sizing: border-box;">
            <tr>
              <td style="padding: 8px 6px 8px 0; color: #64748b; width: 38%; vertical-align: top; word-break: break-word;"><strong>Full Name:</strong></td>
              <td style="padding: 8px 0 8px 6px; color: #0f172a; font-weight: 600; width: 62%; vertical-align: top; word-break: break-word;">${user.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 6px 8px 0; color: #64748b; vertical-align: top; word-break: break-word;"><strong>Email:</strong></td>
              <td style="padding: 8px 0 8px 6px; color: #0f172a; vertical-align: top; word-break: break-word;">${user.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 6px 8px 0; color: #64748b; vertical-align: top; word-break: break-word;"><strong>Phone Number:</strong></td>
              <td style="padding: 8px 0 8px 6px; color: #0f172a; font-weight: 600; vertical-align: top; word-break: break-word;">${user.mobile || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 6px 8px 0; color: #64748b; vertical-align: top; word-break: break-word;"><strong>Emergency Contact:</strong></td>
              <td style="padding: 8px 0 8px 6px; color: #dc2626; font-weight: 700; vertical-align: top; word-break: break-word;">${user.emergencyContact || user.mobile || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 6px 8px 0; color: #64748b; vertical-align: top; word-break: break-word;"><strong>Organisation:</strong></td>
              <td style="padding: 8px 0 8px 6px; color: #0f172a; vertical-align: top; word-break: break-word;">${user.organization?.name || "N/A"} (ID: ${user.orgId || "N/A"})</td>
            </tr>
            <tr>
              <td style="padding: 8px 6px 8px 0; color: #64748b; vertical-align: top; word-break: break-word;"><strong>Alert Time:</strong></td>
              <td style="padding: 8px 0 8px 6px; color: #0f172a; vertical-align: top; word-break: break-word;">${alertTime}</td>
            </tr>
          </table>

          <h3 style="border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; color: #0f172a; margin: 0 0 14px 0; font-size: 16px;">🗺️ Live Location & GPS Data</h3>
          <div style="background-color: #f8fafc; padding: 14px; border-radius: 8px; margin-bottom: 20px; text-align: center; box-sizing: border-box; word-break: break-word;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #334155; word-break: break-word;">
              <strong>Coordinates:</strong> ${latitude && longitude ? `${latitude}, ${longitude}` : "Captured via Web GPS"}
            </p>
            ${address ? `<p style="margin: 0 0 10px 0; font-size: 13px; color: #64748b; word-break: break-word;"><strong>Address:</strong> ${address}</p>` : ""}
            ${locationDisplay}
          </div>

          ${note ? `<div style="background-color: #fffbeb; border: 1px solid #fef3c7; padding: 12px; border-radius: 6px; font-size: 13px; color: #92400e; margin-bottom: 20px; word-break: break-word;"><strong>User Note:</strong> ${note}</div>` : ""}

          <div style="font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 14px; text-align: center; word-break: break-word;">
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
