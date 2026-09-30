import {
  BirthDateClass,
  DrivingPermitDetailsClass,
  IdentityVectorOfTrust,
  JWTClass,
  NameClass,
  NamePartClass,
  NamePartType,
  PassportDetailsClass,
  PersonWithIdentityClass,
  PostalAddressClass,
  SocialSecurityRecordDetailsClass,
} from "@govuk-one-login/data-vocab/credentials.js";

export interface SignedStoredIdentity {
  signedStoredIdentityRecord: string;
  signedCredentials: string[];
}

export type StoredIdentityValidationResult = {
  kidValid: boolean;
  signatureValid: boolean;
  isValid: boolean;
  storedIdentityRecord: StoredIdentityRecord;
};

export interface StoredIdentityRecord extends JWTClass {
  sub: string;
  vot: IdentityVectorOfTrust;
  max_vot?: IdentityVectorOfTrust;
  credentials: string[];
  claims: StoredIdentityClaims;
}

export interface StoredIdentityClaims {
  "https://vocab.account.gov.uk/v1/coreIdentity": Required<PersonWithIdentityClass>;
  "https://vocab.account.gov.uk/v1/address": PostalAddressClass[];
  "https://vocab.account.gov.uk/v1/passport"?: PassportDetailsClass[];
  "https://vocab.account.gov.uk/v1/drivingPermit"?: DrivingPermitDetailsClass[];
  "https://vocab.account.gov.uk/v1/socialSecurityRecord"?: SocialSecurityRecordDetailsClass[];
}

export type CalculatedVectorOfTrust = IdentityVectorOfTrust | "P0";

export const isStoredIdentityRecord = (value: unknown): value is StoredIdentityRecord => {
  if (typeof value !== "object" || value === null) return false;

  const storedIdentityRecordObject = value as Record<string, unknown>;
  if (
    typeof storedIdentityRecordObject.sub !== "string" ||
    !isArrayOfType(storedIdentityRecordObject.credentials, isString) ||
    !isIdentityVectorOfTrust(storedIdentityRecordObject.vot) ||
    (!!storedIdentityRecordObject.max_vot && !isIdentityVectorOfTrust(storedIdentityRecordObject.max_vot))
  ) {
    return false;
  }

  return !!storedIdentityRecordObject.claims && isStoredIdentityClaims(storedIdentityRecordObject.claims);
};

const isStoredIdentityClaims = (value: unknown): value is StoredIdentityClaims => {
  const valueAs = value as StoredIdentityClaims;

  const coreIdentity = valueAs["https://vocab.account.gov.uk/v1/coreIdentity"];
  if (!coreIdentity || !isPersonWithIdentity(coreIdentity)) return false;

  const address = valueAs["https://vocab.account.gov.uk/v1/address"];
  return !!address && isArrayOfType(address, isPostalAddress);
};

const isPersonWithIdentity = (value: unknown): value is PersonWithIdentityClass => {
  const valueAs = value as PersonWithIdentityClass;
  if (!valueAs.name || !isArrayOfType(valueAs.name, isName)) return false;
  return !!valueAs.birthDate && isArrayOfType(valueAs.birthDate, isBirthDate);
};

const isName = (value: unknown): value is NameClass => {
  const valueAs = value as NameClass;
  return !!valueAs.nameParts && isArrayOfType(valueAs.nameParts, isNamePart);
};

const isNamePart = (value: unknown): value is NamePartClass => {
  const valueAs = value as NamePartClass;
  if (!valueAs.type || !isNamePartType(valueAs.type)) return false;
  return !!valueAs.value && typeof valueAs.value === "string";
};

const isNamePartType = (value: unknown): value is NamePartType => {
  if (typeof value !== "string") return false;
  return value === "GivenName" || value === "FamilyName";
};

const isBirthDate = (value: unknown): value is BirthDateClass => {
  const valueAs = value as BirthDateClass;
  return !!valueAs.value && typeof valueAs.value === "string";
};

const isPostalAddress = (value: unknown): value is PostalAddressClass => {
  const valueAs = value as PostalAddressClass;
  if (!buildingNameIsStringIfExists(valueAs)) return false;
  if (!streetNameIsStringIfExists(valueAs)) return false;
  if (!localityIsStringIfExists(valueAs)) return false;
  if (!!valueAs.addressRegion && !isString(valueAs.addressRegion)) return false;
  return !(!!valueAs.postalCode && !isString(valueAs.postalCode));
};

const buildingNameIsStringIfExists = (value: PostalAddressClass): boolean => {
  if (!!value.departmentName && !isString(value.departmentName)) return false;
  if (!!value.organisationName && !isString(value.organisationName)) return false;
  if (!!value.subBuildingName && !isString(value.subBuildingName)) return false;
  return !(!!value.buildingName && !isString(value.buildingName));
};

const streetNameIsStringIfExists = (value: PostalAddressClass): boolean => {
  if (!!value.buildingNumber && !isString(value.buildingNumber)) return false;
  if (!!value.dependentStreetName && !isString(value.dependentStreetName)) return false;
  return !(!!value.streetName && !isString(value.streetName));
};

const localityIsStringIfExists = (value: PostalAddressClass): boolean => {
  if (!!value.doubleDependentAddressLocality && !isString(value.doubleDependentAddressLocality)) return false;
  if (!!value.dependentAddressLocality && !isString(value.dependentAddressLocality)) return false;
  return !(!!value.addressLocality && !isString(value.addressLocality));
};

const isIdentityVectorOfTrust = (value: unknown): value is IdentityVectorOfTrust => {
  if (!value || typeof value !== "string") return false;
  return ["P1", "P2", "P3", "P4"].includes(value);
};

const isString = (value: unknown): value is string => {
  return !!value && typeof value === "string";
};

function isArrayOfType<T>(value: unknown, typePredicate: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every((item) => typePredicate(item));
}
