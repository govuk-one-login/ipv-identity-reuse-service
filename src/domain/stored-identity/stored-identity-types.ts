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
import { isArrayOfType, isNonNullObject, isString, isTypeWhenDefined } from "../../commons/type-utilities.js";

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
  if (!isNonNullObject(value)) return false;
  const object = value as Record<string, unknown>;
  return (
    isString(object.sub) &&
    isArrayOfType(object.credentials, isString) &&
    isIdentityVectorOfTrust(object.vot) &&
    isTypeWhenDefined(object.max_vot, isIdentityVectorOfTrust) &&
    isStoredIdentityClaims(object.claims)
  );
};

const isStoredIdentityClaims = (value: unknown): value is StoredIdentityClaims => {
  if (!isNonNullObject(value)) return false;
  const object = value as Record<string, unknown>;

  const coreIdentityValue = object["https://vocab.account.gov.uk/v1/coreIdentity"];
  const addressValue = object["https://vocab.account.gov.uk/v1/address"];
  return isPersonWithIdentity(coreIdentityValue) && isArrayOfType(addressValue, isPostalAddress);
};

const isPersonWithIdentity = (value: unknown): value is PersonWithIdentityClass => {
  if (!isNonNullObject(value)) return false;
  const object = value as Record<string, unknown>;
  return isArrayOfType(object.name, isName) && isArrayOfType(object.birthDate, isBirthDate);
};

const isName = (value: unknown): value is NameClass => {
  if (!isNonNullObject(value)) return false;
  const object = value as Record<string, unknown>;
  return isArrayOfType(object.nameParts, isNamePart);
};

const isNamePart = (value: unknown): value is NamePartClass => {
  if (!isNonNullObject(value)) return false;
  const object = value as Record<string, unknown>;
  return (
    isNamePartType(object.type) &&
    isString(object.value) &&
    isTypeWhenDefined(object.validFrom, isString) &&
    isTypeWhenDefined(object.validUntil, isString)
  );
};

const isNamePartType = (value: unknown): value is NamePartType => {
  return isString(value) && ["GivenName", "FamilyName"].includes(value);
};

const isBirthDate = (value: unknown): value is BirthDateClass => {
  if (!isNonNullObject(value)) return false;
  const object = value as Record<string, unknown>;
  return (
    isString(object.value) &&
    isTypeWhenDefined(object.description, isString) &&
    isTypeWhenDefined(object.validFrom, isString) &&
    isTypeWhenDefined(object.validUntil, isString)
  );
};

const isPostalAddress = (value: unknown): value is PostalAddressClass => {
  if (!isNonNullObject(value)) return false;
  const object = value as Record<string, unknown>;
  return (
    buildingNameIsStringWhenDefined(object) &&
    streetNameIsStringWhenDefined(object) &&
    localityIsStringWhenDefined(object) &&
    isTypeWhenDefined(object.addressRegion, isString) &&
    isTypeWhenDefined(object.postalCode, isString)
  );
};

const buildingNameIsStringWhenDefined = (value: Record<string, unknown>): boolean => {
  return (
    isTypeWhenDefined(value.departmentName, isString) &&
    isTypeWhenDefined(value.organisationName, isString) &&
    isTypeWhenDefined(value.subBuildingName, isString) &&
    isTypeWhenDefined(value.buildingName, isString)
  );
};

const streetNameIsStringWhenDefined = (value: Record<string, unknown>): boolean => {
  return (
    isTypeWhenDefined(value.buildingNumber, isString) &&
    isTypeWhenDefined(value.dependentStreetName, isString) &&
    isTypeWhenDefined(value.streetName, isString)
  );
};

const localityIsStringWhenDefined = (value: Record<string, unknown>): boolean => {
  return (
    isTypeWhenDefined(value.doubleDependentAddressLocality, isString) &&
    isTypeWhenDefined(value.dependentAddressLocality, isString) &&
    isTypeWhenDefined(value.addressLocality, isString)
  );
};

const isIdentityVectorOfTrust = (value: unknown): value is IdentityVectorOfTrust => {
  return isString(value) && ["P1", "P2", "P3", "P4"].includes(value);
};
