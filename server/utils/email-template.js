const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const toItems = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
};

const renderParagraphs = (content, style) =>
  toItems(content)
    .map(
      (item) =>
        `<p style="${style}">${escapeHtml(item)}</p>`
    )
    .join("");

const renderDetailRows = (rows = []) => {
  const safeRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
  if (safeRows.length === 0) return "";

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
      ${safeRows
        .map((row, index) => {
          const safeLabel = escapeHtml(row.label || "");
          const valueHtml =
            row.valueHtml !== undefined && row.valueHtml !== null
              ? row.valueHtml
              : escapeHtml(row.value ?? "-");
          const borderStyle =
            index === safeRows.length - 1 ? "" : "border-bottom:1px solid rgba(148,163,184,0.18);";

          return `
            <tr>
              <td style="padding:12px 0;${borderStyle}font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8fb9ff;width:160px;vertical-align:top">
                ${safeLabel}
              </td>
              <td style="padding:12px 0;${borderStyle}font-size:14px;line-height:1.7;color:#f8fbff;vertical-align:top">
                ${valueHtml}
              </td>
            </tr>
          `;
        })
        .join("")}
    </table>
  `;
};

const renderSection = (section = {}) => {
  const eyebrow = section.eyebrow ? escapeHtml(section.eyebrow) : "";
  const title = section.title ? escapeHtml(section.title) : "";
  const bodyHtml =
    section.bodyHtml ||
    renderParagraphs(section.body, "margin:0 0 12px;font-size:14px;line-height:1.8;color:#d6e5ff;");
  const rowsHtml = renderDetailRows(section.rows);

  return `
    <div style="margin-top:18px;border:1px solid rgba(96,165,250,0.22);border-radius:22px;background:linear-gradient(180deg,rgba(10,24,52,0.96),rgba(7,16,35,0.96));padding:20px 22px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.04)">
      ${
        eyebrow
          ? `<p style="margin:0 0 8px;font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#76d7ff">${eyebrow}</p>`
          : ""
      }
      ${title ? `<h2 style="margin:0 0 14px;font-size:18px;line-height:1.35;color:#ffffff">${title}</h2>` : ""}
      ${rowsHtml}
      ${rowsHtml && bodyHtml ? `<div style="height:14px"></div>` : ""}
      ${bodyHtml}
    </div>
  `;
};

const renderActionButton = (action) => {
  if (!action?.href || !action?.label) return "";

  return `
    <div style="margin-top:24px">
      <a
        href="${escapeHtml(action.href)}"
        style="display:inline-block;padding:14px 22px;border-radius:16px;background:linear-gradient(135deg,#5cd1e5,#2f7cf6);color:#04101f;text-decoration:none;font-size:14px;font-weight:800;letter-spacing:0.02em"
      >
        ${escapeHtml(action.label)}
      </a>
    </div>
  `;
};

const renderSecondaryLinks = (links = []) => {
  const safeLinks = Array.isArray(links) ? links.filter((item) => item?.href && item?.label) : [];
  if (safeLinks.length === 0) return "";

  return `
    <div style="margin-top:18px">
      ${safeLinks
        .map(
          (link) => `
            <p style="margin:0 0 10px;font-size:13px;line-height:1.7;color:#9fb5d9">
              ${escapeHtml(link.label)}<br/>
              <a href="${escapeHtml(link.href)}" style="color:#7dd3fc;text-decoration:none;word-break:break-all">${escapeHtml(link.href)}</a>
            </p>
          `
        )
        .join("")}
    </div>
  `;
};

const buildEmailTemplate = ({
  eyebrow = "Veagle Attendee",
  title = "",
  subtitle = "",
  greeting = "",
  intro = [],
  sections = [],
  notice = "",
  action = null,
  secondaryLinks = [],
  footnotes = [],
  footerNote = "Attendance made simple for every workspace.",
}) => `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <title>${escapeHtml(title || "Veagle Attendee")}</title>
    </head>
    <body style="margin:0;padding:0;background:#030712;font-family:Arial,sans-serif;color:#f8fbff">
      <div style="background:radial-gradient(circle at top,rgba(47,124,246,0.35),transparent 34%),linear-gradient(180deg,#030712 0%,#071225 100%);padding:28px 14px">
        <div style="max-width:620px;margin:0 auto;border:1px solid rgba(96,165,250,0.2);border-radius:28px;background:linear-gradient(180deg,#071225 0%,#030a18 100%);overflow:hidden;box-shadow:0 28px 80px rgba(2,6,23,0.45)">
          <div style="padding:30px 28px;background:linear-gradient(135deg,#08142c 0%,#0d2553 52%,#2f7cf6 100%);border-bottom:1px solid rgba(125,211,252,0.25)">
            <p style="margin:0 0 10px;font-size:11px;font-weight:800;letter-spacing:0.24em;text-transform:uppercase;color:#c7f2ff">
              ${escapeHtml(eyebrow)}
            </p>
            <h1 style="margin:0;font-size:30px;line-height:1.18;color:#ffffff;font-weight:800">
              ${escapeHtml(title)}
            </h1>
            ${
              subtitle
                ? `<p style="margin:12px 0 0;font-size:14px;line-height:1.8;color:rgba(237,247,255,0.82)">${escapeHtml(subtitle)}</p>`
                : ""
            }
          </div>

          <div style="padding:28px 24px 30px">
            ${
              greeting
                ? `<p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#ffffff"><strong>${escapeHtml(greeting)}</strong></p>`
                : ""
            }

            ${renderParagraphs(
              intro,
              "margin:0 0 12px;font-size:14px;line-height:1.8;color:#d6e5ff;"
            )}

            ${
              notice
                ? `<div style="margin-top:18px;border:1px solid rgba(125,211,252,0.2);border-radius:18px;background:rgba(14,30,61,0.9);padding:14px 16px;font-size:13px;line-height:1.7;color:#cde7ff">${escapeHtml(
                    notice
                  )}</div>`
                : ""
            }

            ${toItems(sections).map(renderSection).join("")}
            ${renderActionButton(action)}
            ${renderSecondaryLinks(secondaryLinks)}
            ${renderParagraphs(
              footnotes,
              "margin:18px 0 0;font-size:13px;line-height:1.8;color:#9fb5d9;"
            )}

            <div style="margin-top:28px;border-top:1px solid rgba(96,165,250,0.18);padding-top:18px">
              <p style="margin:0;font-size:14px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#7dd3fc">
                Veagle Attendee
              </p>
              <p style="margin:8px 0 0;font-size:12px;line-height:1.7;color:#7f96bc">
                ${escapeHtml(footerNote)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </body>
  </html>
`;

module.exports = {
  buildEmailTemplate,
  escapeHtml,
};
