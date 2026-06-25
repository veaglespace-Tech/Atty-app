const express = require("express");
const { z } = require("zod");
const router = express.Router();
const {
  register,
  login,
  logout,
  getMe,
  updateMe,
  searchOrganizations,
  forgotPassword,
  validateResetPasswordToken,
  resetPassword,
} = require("../controllers/auth.controller");
const {
  validateReferralCode,
  submitJoinRequest,
} = require("../controllers/registration-request.controller");
const { userProtected } = require("../middlewares/auth.middleware");
const { validateBody } = require("../middlewares/validation.middleware");

const numericIdSchema = z.union([z.coerce.number().int().positive(), z.string().trim().min(1)]);
const normalizeIncomingRole = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  organizationCode: z.string().trim().optional(),
  organizationId: numericIdSchema.optional(),
  organizationName: z.string().trim().optional(),
  loginAs: z.string().trim().optional(),
});

const forgotPasswordSchema = z
  .object({
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
    organizationCode: z.string().trim().optional(),
    organizationId: numericIdSchema.optional(),
    loginAs: z.string().trim().min(1, "Role is required"),
  })
  .superRefine((value, ctx) => {
    const normalizedRole = String(value.loginAs || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
    if (normalizedRole !== "SUPER_ADMIN" && !value.organizationCode && !value.organizationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Organization selection is required for this role",
        path: ["organizationId"],
      });
    }
  });

const resetPasswordTokenSchema = z.object({
  token: z.string().trim().min(1, "Reset token is required"),
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, "Reset token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

const registerSchema = z
  .object({
    org: z.unknown().optional(),
    admin: z.unknown().optional(),
    plan: z.unknown().optional(),
    organizationCode: z.string().trim().optional(),
    referralCode: z
      .string()
      .trim()
      .optional()
      .refine(
        (value) => !value || /^REF-[A-Za-z0-9]{8}$/i.test(value),
        "Referral code format should be REF-XXXXXXXX"
      ),
    organizationId: numericIdSchema.optional(),
    organization: numericIdSchema.optional(),
    name: z.string().trim().min(1, "Name is required").max(120, "Name is too long").optional(),
    email: z.string().trim().email("Enter a valid email address").optional(),
    mobile: z.string().trim().min(4, "Mobile number is too short").optional(),
    mobileCountryCode: z.string().trim().optional(),
    emergencyContact: z.string().trim().min(4, "Emergency contact is too short").optional(),
    currentAddress: z.string().trim().min(5, "Current address is too short").max(191).optional(),
    permanentAddress: z.string().trim().min(5, "Permanent address is too short").max(191).optional(),
    countryCode: z.string().trim().optional(),
    password: z.string().min(1, "Password is required").optional(),
    role: z.string().trim().optional(),
  })
  .superRefine((value, ctx) => {
    const normalizedRole = normalizeIncomingRole(value.role || "MEMBER");
    if (normalizedRole === "MEMBER" && !String(value.referralCode || "").trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Referral code is required for member registration",
        path: ["referralCode"],
      });
    }
  })
  .passthrough();

const updateMeSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120, "Name is too long").optional(),
    email: z.string().trim().email("Enter a valid email address").optional(),
    mobile: z.union([z.string().trim().min(4, "Mobile number is too short"), z.literal("")]).optional(),
    mobileCountryCode: z.union([z.string().trim().min(1, "Country code is required"), z.literal("")]).optional(),
    emergencyContact: z.string().trim().optional(),
    currentAddress: z.string().trim().optional(),
    profileImageDataUrl: z
      .string()
      .trim()
      .min(1, "Profile image is required")
      .max(14_000_000, "Profile image is too large")
      .optional(),
    removeProfileImage: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide at least one profile field to update",
      });
    }

    if (value.profileImageDataUrl && value.removeProfileImage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["removeProfileImage"],
        message: "Choose either a new profile image or remove the current one",
      });
    }
  });

router.get("/organizations/search", searchOrganizations);
router.get("/join/:referralCode", validateReferralCode);
router.post("/join/:referralCode", submitJoinRequest);
router.post("/register", validateBody(registerSchema), register);
router.post("/login", validateBody(loginSchema), login);
router.post("/forgot-password", validateBody(forgotPasswordSchema), forgotPassword);
router.post(
  "/reset-password/validate",
  validateBody(resetPasswordTokenSchema),
  validateResetPasswordToken
);
router.post("/reset-password", validateBody(resetPasswordSchema), resetPassword);
router.post("/logout", logout);
router.get("/me", userProtected, getMe);
router.patch("/me", userProtected, validateBody(updateMeSchema), updateMe);

module.exports = router;
