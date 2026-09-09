import { IdentityCheckSubjectClass, PostalAddressClass } from "@govuk-one-login/data-vocab/credentials";
import { CredentialStoreIdentityResponse } from "../credential-store/credential-store-identity-response";
import { VerifiableCredentialJWT, isIdentityCheckCredential } from "../identity-reuse/verifiable-credential-jwt";
import { getJwtBody } from "./jwt-utilities";

export interface UserDetails {
  name: string;
  dateOfBirth: string;
  addresses: {
    label: string;
    addressDetailHtml: string;
  }[];
}

export const extractUserDetails = (identityResponse: CredentialStoreIdentityResponse): UserDetails => {
  const currentVcs: VerifiableCredentialJWT[] = identityResponse.vcs
    .filter((vcWithState) => vcWithState.state === "CURRENT")
    .map((vcWithState) => getJwtBody<VerifiableCredentialJWT>(vcWithState.vc));

  const identityVc = currentVcs.find((vc) => isIdentityCheckCredential(vc) && vc.vc?.credentialSubject);

  if (!identityVc) {
    throw new Error("No IdentityCheckCredential found in VCs");
  }

  const credentialSubject = identityVc.vc?.credentialSubject as IdentityCheckSubjectClass | undefined;

  if (!credentialSubject) {
    throw new Error("IdentityCheckCredential has no credentialSubject");
  }

  const name = buildFullName(credentialSubject.name);
  const dateOfBirth = credentialSubject.birthDate?.[0]?.value ?? "";
  const addresses = (credentialSubject.address ?? []).map((address, index) => ({
    label: index === 0 ? "Current home address" : "Previous home address",
    addressDetailHtml: formatAddress(address),
  }));

  return { name, dateOfBirth, addresses };
};

const buildFullName = (names?: { nameParts: { type: string; value: string }[] }[]): string => {
  if (!names || names.length === 0) {
    return "";
  }

  return names[0].nameParts.map((part) => part.value).join(" ");
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
