import { NextResponse } from "next/server";

const CALLBACK_FIELDS = [
  "status",
  "txnid",
  "mihpayid",
  "hash",
  "amount",
  "productinfo",
  "firstname",
  "email",
  "phone",
  "udf1",
  "udf2",
  "udf3",
  "udf4",
  "udf5",
  "udf6",
  "udf7",
  "udf8",
  "udf9",
  "udf10",
  "additionalCharges",
  "additional_charges",
  "mode",
  "bankcode",
  "error",
  "error_Message",
  "error_message",
];

const pickCallbackFields = (entries = []) =>
  CALLBACK_FIELDS.reduce((accumulator, field) => {
    const match = entries.find(([key]) => key === field);
    if (match && match[1] !== undefined && match[1] !== null) {
      accumulator[field] = String(match[1]);
    }
    return accumulator;
  }, {});

const buildRedirectUrl = ({ origin, payload }) => {
  const flow = String(payload?.udf1 || "").trim().toUpperCase();
  const targetPath = flow === "RENEWAL" ? "/pricing" : "/register/organisation/payment";
  const redirectUrl = new URL(targetPath, origin);

  if (payload && Object.keys(payload).length > 0) {
    const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    redirectUrl.searchParams.set("payu", encodedPayload);
  } else {
    redirectUrl.searchParams.set("payu_error", "missing_callback_payload");
  }

  return redirectUrl;
};

export async function POST(request) {
  let payload = {};

  try {
    const formData = await request.formData();
    payload = pickCallbackFields(Array.from(formData.entries()));
  } catch {
    payload = {};
  }

  const redirectUrl = buildRedirectUrl({
    origin: request.nextUrl.origin,
    payload,
  });

  return NextResponse.redirect(redirectUrl, 303);
}

export async function GET(request) {
  const payload = pickCallbackFields(Array.from(request.nextUrl.searchParams.entries()));
  const redirectUrl = buildRedirectUrl({
    origin: request.nextUrl.origin,
    payload,
  });

  return NextResponse.redirect(redirectUrl, 303);
}
