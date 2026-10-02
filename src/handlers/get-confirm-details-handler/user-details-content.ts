import { BirthDateClass, NameClass, PostalAddressClass } from "@govuk-one-login/data-vocab/credentials.js";
import { StoredIdentityRecord } from "../../domain/stored-identity/stored-identity-types.js";
import { StoredIdentityValidationError } from "../../commons/errors.js";
import logger from "../../commons/logger.js";

export interface UserDetailsContent {
  name: string;
  dateOfBirth: string;
  addressDetailHtml: string;
}

export const extractUserDetails = (storedIdentityRecord: StoredIdentityRecord): UserDetailsContent => {
  const coreIdentity = storedIdentityRecord.claims["https://vocab.account.gov.uk/v1/coreIdentity"];
  const addressClaim = storedIdentityRecord.claims["https://vocab.account.gov.uk/v1/address"] ?? [];

  const name = getFullName(coreIdentity.name);
  const dateOfBirth = getDateOfBirth(coreIdentity.birthDate);
  const currentAddress = getCurrentAddress(addressClaim);
  const addressDetailHtml = formatAddress(currentAddress);

  return { name, dateOfBirth, addressDetailHtml };
};

const getFullName = (names: NameClass[]): string => {
  if (names.length === 0 || names[0].nameParts.length === 0) {
    logger.error("No names or nameParts found in stored identity");
    throw new StoredIdentityValidationError("No names or nameParts found in stored identity");
  }
  return names[0].nameParts.map((part) => part.value).join(" ");
};

const getDateOfBirth = (birthDates: BirthDateClass[]): string => {
  if (birthDates.length === 0) {
    logger.error("No birthDates found in stored identity");
    throw new StoredIdentityValidationError("No birthDates found in stored identity");
  }
  return birthDates[0].value;
};

const getCurrentAddress = (addresses: PostalAddressClass[]): PostalAddressClass => {
  if (addresses.length === 0) {
    logger.error("No addresses found in stored identity");
    throw new StoredIdentityValidationError("No addresses found in stored identity");
  }

  let latest = addresses[0];
  for (const address of addresses) {
    if ((address.validFrom ?? "") > (latest.validFrom ?? "")) {
      latest = address;
    }
  }
  return latest;
};

export const formatAddress = (address: PostalAddressClass): string => {
  const joinAddressValues = (...values: (string | undefined)[]) => values.filter(Boolean).join(", ");

  const buildingName = joinAddressValues(
    address.departmentName,
    address.organisationName,
    address.subBuildingName,
    address.buildingName
  );
  const streetName = joinAddressValues(address.buildingNumber, address.dependentStreetName, address.streetName);
  const locality = joinAddressValues(
    address.doubleDependentAddressLocality,
    address.dependentAddressLocality,
    address.addressLocality
  );

  return [buildingName, streetName, locality, address.addressRegion, address.postalCode].filter(Boolean).join("<br>");
};
