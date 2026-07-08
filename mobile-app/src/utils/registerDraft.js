const REGISTRATION_DRAFT_KEYS = Object.freeze({
  organisation: "register.organisation",
  admin: "register.admin",
  selectedPlan: "register.selectedPlan",
});

const LEGACY_REGISTRATION_DRAFT_KEYS = Object.freeze({
  [REGISTRATION_DRAFT_KEYS.organisation]: "organisationData",
  [REGISTRATION_DRAFT_KEYS.admin]: "adminData",
  [REGISTRATION_DRAFT_KEYS.selectedPlan]: "selectedPlan",
});

let hasMigratedLegacyDrafts = false;

// React Native In-Memory Storage
const memoryStorage = new Map();

const getSessionStorage = () => memoryStorage;
const getLocalStorage = () => memoryStorage;

const ensureLegacyDraftMigration = () => {
  if (hasMigratedLegacyDrafts) return;

  const sessionStorage = getSessionStorage();
  const localStorage = getLocalStorage();

  if (!sessionStorage || !localStorage) return;

  Object.entries(LEGACY_REGISTRATION_DRAFT_KEYS).forEach(([draftKey, legacyKey]) => {
    const currentDraft = sessionStorage.get(draftKey);
    if (currentDraft) return;

    const legacyDraft = localStorage.get(legacyKey);
    if (!legacyDraft) return;

    try {
      JSON.parse(legacyDraft);
      sessionStorage.set(draftKey, legacyDraft);
    } catch (_) {
      // Ignore malformed legacy drafts and fall through to cleanup.
    }

    localStorage.delete(legacyKey);
  });

  hasMigratedLegacyDrafts = true;
};

const readRegistrationDraft = (key) => {
  const sessionStorage = getSessionStorage();
  if (!sessionStorage) return null;

  ensureLegacyDraftMigration();

  const rawDraft = sessionStorage.get(key);
  if (!rawDraft) return null;

  try {
    return JSON.parse(rawDraft);
  } catch (_) {
    sessionStorage.delete(key);
    return null;
  }
};

const readRegistrationDraftRaw = (key) => {
  const sessionStorage = getSessionStorage();
  if (!sessionStorage) return null;

  ensureLegacyDraftMigration();
  return sessionStorage.get(key);
};

const writeRegistrationDraft = (key, value) => {
  const sessionStorage = getSessionStorage();
  if (!sessionStorage) return;

  ensureLegacyDraftMigration();
  sessionStorage.set(key, JSON.stringify(value));
};

const removeRegistrationDraft = (key) => {
  const sessionStorage = getSessionStorage();
  if (!sessionStorage) return;

  ensureLegacyDraftMigration();
  sessionStorage.delete(key);
};

export const getRegistrationDraft = (key) => readRegistrationDraft(key);
export const getRegistrationDraftRaw = (key) => readRegistrationDraftRaw(key);

export const setRegistrationDraft = (key, value) => {
  writeRegistrationDraft(key, value);
};

export const clearRegistrationDraft = (key) => {
  removeRegistrationDraft(key);
};

export const clearAllRegistrationDrafts = () => {
  Object.values(REGISTRATION_DRAFT_KEYS).forEach(removeRegistrationDraft);
};

export const getRegistrationDraftSnapshot = () => ({
  organisation: readRegistrationDraft(REGISTRATION_DRAFT_KEYS.organisation),
  admin: readRegistrationDraft(REGISTRATION_DRAFT_KEYS.admin),
  selectedPlan: readRegistrationDraft(REGISTRATION_DRAFT_KEYS.selectedPlan),
});

export { REGISTRATION_DRAFT_KEYS };
