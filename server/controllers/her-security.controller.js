const AppError = require("../helpers/AppError");
const prisma = require("../lib/prisma");
const sendEmail = require("../utils/email");

const buildSosEmailHtml = (user, location, org) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fff0f0; border: 2px solid #ef4444; border-radius: 12px; overflow: hidden;">
  <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">🚨 EMERGENCY SOS ALERT 🚨</h1>
  </div>
  
  <div style="padding: 24px;">
    <p style="font-size: 16px; color: #1f2937; line-height: 1.5; margin-top: 0;">
      <strong>${user.name}</strong> from <strong>${org.name}</strong> has triggered an emergency SOS alert and needs immediate assistance.
    </p>

    <div style="background-color: white; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #fecaca;">
      <h3 style="margin-top: 0; color: #b91c1c; border-bottom: 1px solid #fecaca; padding-bottom: 8px;">User Details</h3>
      <p style="margin: 8px 0; color: #374151;"><strong>Name:</strong> ${user.name}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Email:</strong> ${user.email}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Phone:</strong> ${user.mobile || "N/A"}</p>
      <p style="margin: 8px 0; color: #374151;"><strong>Emergency Contact:</strong> ${user.emergencyContact || "N/A"}</p>
    </div>

    <div style="background-color: white; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #fecaca;">
      <h3 style="margin-top: 0; color: #b91c1c; border-bottom: 1px solid #fecaca; padding-bottom: 8px;">Location Details</h3>
      ${location.mapsUrl ? `
        <p style="margin: 8px 0; color: #374151;"><strong>Live Tracking:</strong> <br/>
          <a href="${location.mapsUrl}" style="display: inline-block; background-color: #ef4444; color: white; text-decoration: none; padding: 10px 16px; border-radius: 6px; font-weight: bold; margin-top: 10px;">
            Open in Google Maps
          </a>
        </p>
      ` : `
        <p style="margin: 8px 0; color: #ef4444;"><strong>Location Permission Denied by User</strong></p>
      `}
      ${location.deviceInfo ? `<p style="margin: 8px 0; color: #6b7280; font-size: 14px;"><strong>Source:</strong> ${location.deviceInfo}</p>` : ''}
    </div>

    <p style="font-size: 14px; color: #6b7280; text-align: center; margin-bottom: 0;">
      Please verify the user's safety immediately.
    </p>
  </div>
</div>
`;

exports.sosAlert = async (req, res, next) => {
  try {
    const { latitude, longitude, mapsUrl, deviceInfo, isUpdate } = req.body;
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true
      }
    });

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Don't spam emails on periodic background updates, only send on initial trigger
    // You could also implement WebSockets here for live tracking dashboards later
    if (isUpdate) {
      return res.status(200).json({ success: true, message: "Location update received" });
    }

    // Fetch org admins
    const admins = await prisma.user.findMany({
      where: {
        organizationId: user.organizationId,
        role: { in: ['ORG_ADMIN', 'SUPER_ADMIN'] },
        isActive: true
      },
      select: { email: true }
    });

    const adminEmails = admins.map(admin => admin.email).filter(Boolean);
    
    // Add super admin fallback if no org admins found
    if (adminEmails.length === 0) {
      adminEmails.push(process.env.EMAIL); // default fallback
    }

    const uniqueEmails = [...new Set(adminEmails)];

    if (uniqueEmails.length > 0) {
      await sendEmail({
        email: uniqueEmails.join(","),
        subject: `🚨 URGENT: SOS Alert from ${user.name}`,
        message: `SOS Alert triggered by ${user.name}. Location: ${mapsUrl || 'Unknown'}`,
        html: buildSosEmailHtml(user, { latitude, longitude, mapsUrl, deviceInfo }, user.organization),
      });
    }

    res.status(200).json({
      success: true,
      message: "SOS Alert sent successfully",
      recipientsSent: uniqueEmails
    });
  } catch (error) {
    console.error("SOS Alert Error:", error);
    next(new AppError("Failed to trigger SOS alert", 500));
  }
};

exports.stopSosAlert = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true
      }
    });

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Fetch org admins
    const admins = await prisma.user.findMany({
      where: {
        organizationId: user.organizationId,
        role: { in: ['ORG_ADMIN', 'SUPER_ADMIN'] },
        isActive: true
      },
      select: { email: true }
    });

    const adminEmails = admins.map(admin => admin.email).filter(Boolean);
    const uniqueEmails = [...new Set(adminEmails)];

    if (uniqueEmails.length > 0) {
      await sendEmail({
        email: uniqueEmails.join(","),
        subject: `✅ SOS Alert Cancelled by ${user.name}`,
        message: `The SOS Alert triggered by ${user.name} has been cancelled by the user.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #22c55e; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px;">✅ SOS CANCELLED ✅</h1>
            </div>
            <div style="padding: 24px;">
              <p style="font-size: 16px; color: #1f2937; line-height: 1.5; margin-top: 0; text-align: center;">
                <strong>${user.name}</strong> from <strong>${user.organization?.name || 'Organization'}</strong> has cancelled their SOS alert and marked themselves as safe.
              </p>
            </div>
          </div>
        `,
      });
    }

    res.status(200).json({
      success: true,
      message: "SOS Alert stopped successfully",
      recipientsSent: uniqueEmails
    });
  } catch (error) {
    console.error("Stop SOS Alert Error:", error);
    next(new AppError("Failed to stop SOS alert", 500));
  }
};
