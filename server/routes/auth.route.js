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
} = require("../controllers/auth.controller");
const { userProtected } = require("../middlewares/auth.middleware");
const { validateBody } = require("../middlewares/validation.middleware");

const numericIdSchema = z.union([z.coerce.number().int().positive(), z.string().trim().min(1)]);

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  organizationCode: z.string().trim().optional(),
  organizationId: numericIdSchema.optional(),
  loginAs: z.string().trim().optional(),
});

const registerSchema = z
  .object({
    org: z.unknown().optional(),
    admin: z.unknown().optional(),
    plan: z.unknown().optional(),
    organizationCode: z.string().trim().optional(),
    organizationId: numericIdSchema.optional(),
    organization: numericIdSchema.optional(),
    name: z.string().trim().min(1, "Name is required").max(120, "Name is too long").optional(),
    email: z.string().trim().email("Enter a valid email address").optional(),
    mobile: z.string().trim().min(4, "Mobile number is too short").optional(),
    mobileCountryCode: z.string().trim().optional(),
    countryCode: z.string().trim().optional(),
    password: z.string().min(1, "Password is required").optional(),
    role: z.string().trim().optional(),
  })
  .passthrough();

const updateMeSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120, "Name is too long").optional(),
    email: z.string().trim().email("Enter a valid email address").optional(),
    mobile: z.string().trim().min(4, "Mobile number is too short").optional(),
    mobileCountryCode: z.string().trim().min(1, "Country code is required").optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one profile field to update",
  });

router.get("/organizations/search", searchOrganizations);
router.post("/register", validateBody(registerSchema), register);
router.post("/login", validateBody(loginSchema), login);
router.post("/logout", logout);
router.get("/me", userProtected, getMe);
router.patch("/me", userProtected, validateBody(updateMeSchema), updateMe);

module.exports = router;
