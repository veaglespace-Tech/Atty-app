"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Bell,
  Building2,
  ImageUp,
  Globe,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { z } from "zod";
import ThemeToggle from "@/components/ThemeToggle";
import CountryPhoneField from "@/components/CountryPhoneField";
import UserAvatar from "@/components/UserAvatar";
import { useUpdateMeMutation } from "@/services/api/authApi";
import { setCurrentUser } from "@/store/slices/authSlice";
import { formatRoleLabel, resolveUserPermissions, ROLES } from "@/utils/roles";
import { getLocalPhoneNumber } from "@/utils/phone";
import { cn } from "@/lib/utils";
import {
  PERSON_NAME_REGEX,
  PHONE_DIGIT_MAX,
  PHONE_DIGIT_MIN,
  normalizeEmailInput,
  normalizeTextInput,
  toDigitsOnly,
} from "@/utils/formValidation";

const settingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(120, "Name is too long")
    .regex(
      PERSON_NAME_REGEX,
      "Full name can only include letters, spaces, apostrophes, dots, or hyphens"
    ),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address"),
  mobileCountryCode: z
    .string()
    .trim()
    .refine((value) => !value || /^\+\d{1,3}$/.test(value), "Use format like +91"),
  mobile: z
    .string()
    .trim()
    .refine(
      (value) => !value || toDigitsOnly(value).length >= PHONE_DIGIT_MIN,
      "Enter a valid mobile number"
    )
    .refine(
      (value) => !value || toDigitsOnly(value).length <= PHONE_DIGIT_MAX,
      "Mobile number is too long"
    ),
});

const labelClassName = "brand-kicker mb-1.5 ml-1 block";
const inputClassName =
  "w-full rounded-[1.25rem] border border-slate-200 bg-white/92 px-4 py-3 text-sm font-medium text-slate-900 shadow-[0_18px_40px_rgba(30,112,209,0.10)] outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/70 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-50 dark:focus:border-blue-400 dark:focus:ring-blue-500/10";
const errorInputClassName =
  "border-rose-400 bg-rose-50/80 focus:border-rose-500 focus:ring-rose-500/10";
const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_PROFILE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const formatValue = (value, fallback = "-") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
};

const getFormDefaults = (user) => ({
  name: user?.name || "",
  email: user?.email || "",
  mobileCountryCode: user?.mobileCountryCode || "",
  mobile: getLocalPhoneNumber(user?.mobile, user?.mobileCountryCode),
});

function DetailCard({ icon: Icon, label, value }) {
  return (
    <div className="brand-panel-soft rounded-[1.5rem] p-4">
      <div className="flex items-center gap-3">
        <div className="brand-icon-shell flex h-11 w-11 items-center justify-center rounded-2xl">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="brand-kicker">{label}</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function PreferenceCard({ icon: Icon, title, value, children }) {
  return (
    <div className="brand-panel-soft rounded-[1.5rem] p-5">
      <div className="flex items-start gap-3">
        <div className="brand-icon-shell flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold tracking-[-0.02em] text-slate-900 dark:text-white">
            {title}
          </p>
          <p className="brand-copy-sm mt-1">{value}</p>
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}

export default function WorkspaceSettingsPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [updateMe, { isLoading: isSaving }] = useUpdateMeMutation();
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [profileImageDataUrl, setProfileImageDataUrl] = useState("");
  const [removeProfileImage, setRemoveProfileImage] = useState(false);
  const [profileImageError, setProfileImageError] = useState("");
  const profileImageInputRef = useRef(null);
  const roleLabel = formatRoleLabel(user?.role);
  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;
  const permissionsCount = resolveUserPermissions(user).length;
  const workspaceCode = user?.organizationCode || user?.organization?.organizationCode || null;
  const workspaceCity = user?.city || user?.organization?.city || null;

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(settingsSchema),
    mode: "onChange",
    defaultValues: getFormDefaults(user),
  });

  useEffect(() => {
    reset(getFormDefaults(user));
  }, [user, reset]);

  const formValues = useWatch({ control });
  const previewName = formValues.name || user?.name || "Workspace User";
  const previewEmail = formValues.email || user?.email || "-";
  const previewMobile =
    formValues.mobile || user?.mobile
      ? `${formValues.mobileCountryCode || user?.mobileCountryCode || ""}${formValues.mobile || getLocalPhoneNumber(user?.mobile, user?.mobileCountryCode)}`
      : "-";
  const currentProfileImageUrl = user?.profileImageUrl || "";
  const previewProfileImageUrl =
    profileImageDataUrl || (removeProfileImage ? "" : currentProfileImageUrl);
  const hasPendingProfileImageChange = Boolean(profileImageDataUrl) || removeProfileImage;
  const canSubmit = isDirty || hasPendingProfileImageChange;

  const detailCards = useMemo(
    () => [
      { icon: User, label: "Full Name", value: formatValue(previewName) },
      { icon: Mail, label: "Email", value: formatValue(previewEmail) },
      { icon: Smartphone, label: "Mobile", value: formatValue(previewMobile) },
      { icon: ShieldCheck, label: "Role", value: roleLabel },
      {
        icon: isSuperAdmin ? Globe : Building2,
        label: isSuperAdmin ? "Access Scope" : "Organization Code",
        value: isSuperAdmin ? "Platform-wide" : formatValue(workspaceCode),
      },
      { icon: Users, label: "Permissions", value: `${permissionsCount} Enabled` },
    ],
    [isSuperAdmin, permissionsCount, previewEmail, previewMobile, previewName, roleLabel, workspaceCode]
  );

  const resetForm = () => {
    reset(getFormDefaults(user));
    setFeedback({ type: "", message: "" });
    setProfileImageDataUrl("");
    setRemoveProfileImage(false);
    setProfileImageError("");
  };

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read the selected image."));
      reader.readAsDataURL(file);
    });

  const onProfileImageSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!ACCEPTED_PROFILE_IMAGE_TYPES.has(file.type)) {
      setProfileImageError("Upload a JPG, PNG, WEBP, or GIF image.");
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      setProfileImageError("Profile image must be 2 MB or smaller.");
      return;
    }

    try {
      const nextDataUrl = await readFileAsDataUrl(file);
      setProfileImageDataUrl(nextDataUrl);
      setRemoveProfileImage(false);
      setProfileImageError("");
      setFeedback({ type: "", message: "" });
    } catch (error) {
      setProfileImageError(error.message || "Failed to prepare the selected image.");
    }
  };

  const toggleProfileImageRemoval = () => {
    setFeedback({ type: "", message: "" });
    setProfileImageError("");

    if (removeProfileImage) {
      setRemoveProfileImage(false);
      return;
    }

    if (profileImageDataUrl) {
      setProfileImageDataUrl("");
      return;
    }

    if (currentProfileImageUrl) {
      setRemoveProfileImage(true);
    }
  };

  const onSubmit = async (values) => {
    setFeedback({ type: "", message: "" });
    setProfileImageError("");

    const nextMobile = values.mobile.trim();
    const nextMobileCountryCode = values.mobileCountryCode.trim();
    const payload = {
      name: normalizeTextInput(values.name),
      email: normalizeEmailInput(values.email),
    };

    if (nextMobile || user?.mobile) {
      payload.mobile = toDigitsOnly(nextMobile) || user?.mobile || "";
      payload.mobileCountryCode = nextMobileCountryCode || user?.mobileCountryCode || "";
    }

    if (profileImageDataUrl) {
      payload.profileImageDataUrl = profileImageDataUrl;
    } else if (removeProfileImage) {
      payload.removeProfileImage = true;
    }

    try {
      const result = await updateMe(payload).unwrap();
      dispatch(setCurrentUser(result.user));
      reset(getFormDefaults(result.user));
      setProfileImageDataUrl("");
      setRemoveProfileImage(false);
      setProfileImageError("");
      setFeedback({
        type: "success",
        message: result?.message || "Profile updated successfully.",
      });
    } catch (error) {
      setProfileImageError("");
      setFeedback({
        type: "error",
        message: error?.data?.message || error?.message || "Failed to update profile.",
      });
    }
  };

  return (
    <section className="space-y-6">
      <div className="light-glow-card-static rounded-[1.75rem] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <UserAvatar
              src={previewProfileImageUrl}
              name={previewName}
              className="h-16 w-16 rounded-[1.75rem] text-2xl"
              sizes="64px"
            />
            <div>
              <p className="brand-kicker">Account Settings</p>
              <h2 className="brand-section-title mt-2">{previewName}</h2>
              <p className="brand-copy-sm mt-2">
                Edit your profile details and keep your workspace preferences in sync.
              </p>
            </div>
          </div>

          <div className="brand-chip self-start">
            {roleLabel}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {detailCards.map((item) => (
          <DetailCard key={item.label} icon={item.icon} label={item.label} value={item.value} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="light-glow-card-static rounded-[1.75rem] p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="brand-kicker">Editable Profile</h3>
              <p className="brand-copy-sm mt-2">
                Update your personal details here. Changes appear across the dashboard right away.
              </p>
            </div>
            <div className="brand-chip px-3 py-1">
              {canSubmit ? "Unsaved Changes" : "Up to Date"}
            </div>
          </div>

          {feedback.message ? (
            <p
              className={cn(
                "mt-4 rounded-2xl border px-4 py-3 text-sm font-medium",
                feedback.type === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
              )}
            >
              {feedback.message}
            </p>
          ) : null}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
            <div className="brand-panel-soft rounded-[1.5rem] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <UserAvatar
                  src={previewProfileImageUrl}
                  name={previewName}
                  className="h-24 w-24 rounded-[2rem] text-3xl"
                  sizes="96px"
                />

                <div className="min-w-0 flex-1">
                  <p className="brand-kicker">Profile Photo</p>
                  <p className="brand-copy-sm mt-2">
                    Upload a clear square image to personalize your workspace profile.
                  </p>

                  <input
                    ref={profileImageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={onProfileImageSelected}
                  />

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => profileImageInputRef.current?.click()}
                      className="brand-btn brand-btn-secondary brand-btn-md"
                    >
                      <ImageUp size={16} />
                      {previewProfileImageUrl ? "Change Photo" : "Upload Photo"}
                    </button>

                    {removeProfileImage || profileImageDataUrl || currentProfileImageUrl ? (
                      <button
                        type="button"
                        onClick={toggleProfileImageRemoval}
                        className="brand-btn brand-btn-secondary brand-btn-md"
                      >
                        <Trash2 size={16} />
                        {removeProfileImage
                          ? "Keep Current Photo"
                          : profileImageDataUrl
                            ? "Clear Selection"
                            : "Remove Photo"}
                      </button>
                    ) : null}
                  </div>

                  <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-300">
                    {removeProfileImage
                      ? "Your current profile photo will be removed when you save."
                      : profileImageDataUrl
                        ? "New profile photo is ready. Save changes to publish it."
                        : previewProfileImageUrl
                          ? "This profile photo appears anywhere your account avatar is shown."
                          : "Supported formats: JPG, PNG, WEBP, GIF. Maximum size: 2 MB."}
                  </p>

                  {profileImageError ? (
                    <p className="mt-2 text-xs font-semibold text-rose-500">
                      {profileImageError}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label htmlFor="settings-name" className={labelClassName}>
                  Full Name
                </label>
                <input
                  id="settings-name"
                  type="text"
                  placeholder="Your full name"
                  aria-invalid={errors.name ? "true" : "false"}
                  className={cn(inputClassName, errors.name ? errorInputClassName : "")}
                  {...register("name")}
                />
                {errors.name ? (
                  <p className="ml-1 mt-1.5 text-xs font-medium text-rose-500">
                    {errors.name.message}
                  </p>
                ) : null}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="settings-email" className={labelClassName}>
                  Email Address
                </label>
                <input
                  id="settings-email"
                  type="email"
                  placeholder="name@company.com"
                  aria-invalid={errors.email ? "true" : "false"}
                  className={cn(inputClassName, errors.email ? errorInputClassName : "")}
                  {...register("email")}
                />
                {errors.email ? (
                  <p className="ml-1 mt-1.5 text-xs font-medium text-rose-500">
                    {errors.email.message}
                  </p>
                ) : null}
              </div>

              <CountryPhoneField
                label="Mobile Number"
                countryCode={formValues.mobileCountryCode || ""}
                phone={formValues.mobile || ""}
                onCountryCodeChange={(event) =>
                  setValue("mobileCountryCode", event.target.value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                onPhoneChange={(event) =>
                  setValue("mobile", event.target.value.replace(/[^\d]/g, ""), {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                countryCodeError={errors.mobileCountryCode?.message}
                phoneError={errors.mobile?.message}
                helpText="Select the country code, then enter your mobile number."
                containerClassName="md:col-span-2"
                labelClassName={labelClassName}
              />
              <input type="hidden" {...register("mobileCountryCode")} />
              <input type="hidden" {...register("mobile")} />
            </div>

            <div className="brand-panel-soft grid gap-4 rounded-[1.5rem] p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="brand-kicker">Role</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {roleLabel}
                  </p>
                </div>
                <div>
                  <p className="brand-kicker">Workspace Code</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {isSuperAdmin ? "Platform-wide" : formatValue(workspaceCode, "Not available")}
                  </p>
                </div>
              </div>
              <p className="brand-copy-sm text-xs">
                Role and workspace scope are managed by the platform or organization admin.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={resetForm}
                disabled={isSaving || !canSubmit}
                className="brand-btn brand-btn-secondary brand-btn-md"
              >
                <RotateCcw size={16} />
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !canSubmit}
                className="brand-btn brand-btn-primary brand-btn-md"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Changes
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-4">
          <PreferenceCard
            icon={SlidersHorizontal}
            title="Appearance"
            value="Choose the theme that feels best for your workspace."
          >
            <ThemeToggle showLabel className="w-full justify-center" />
          </PreferenceCard>

          <PreferenceCard
            icon={Bell}
            title="Notifications"
            value="Workspace activity alerts stay enabled for important updates."
          />

          <PreferenceCard
            icon={LockKeyhole}
            title="Security"
            value="Your account is protected by role-based access and secure sessions."
          />

          <div className="light-glow-card-static rounded-[1.75rem] p-6">
            <h3 className="brand-kicker">Workspace Details</h3>
            <div className="mt-4 grid gap-4">
              <div className="brand-panel-soft rounded-[1.5rem] p-5">
                <p className="brand-kicker">Location</p>
                <div className="mt-3 flex items-center gap-3">
                  <MapPin size={18} className="text-blue-600 dark:text-blue-300" />
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {formatValue(workspaceCity, "Not set")}
                  </p>
                </div>
              </div>

              <div className="brand-panel-soft rounded-[1.5rem] p-5">
                <p className="brand-kicker">Workspace</p>
                <div className="mt-3 flex items-center gap-3">
                  <Globe size={18} className="text-blue-600 dark:text-blue-300" />
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {isSuperAdmin ? "Global Control Panel" : "Organization Workspace"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
