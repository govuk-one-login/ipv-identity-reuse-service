import { describe, it, expect } from "vitest";
import { extractUserDetails, formatAddress } from "../user-details";
import { CredentialStoreIdentityResponse } from "../../credential-store/credential-store-identity-response";
import { sign, getDefaultJwtHeader } from "../../../shared-test/jwt-utilities";
import { IdentityCheckCredentialJWTClass } from "@govuk-one-login/data-vocab/credentials";

const createIdentityCheckVcJwt = async (
  credentialSubject: IdentityCheckCredentialJWTClass["vc"]["credentialSubject"]
): Promise<string> => {
  const payload: IdentityCheckCredentialJWTClass = {
    sub: "user-sub",
    iss: "https://issuer.example.com",
    nbf: Math.floor(Date.now() / 1000),
    vc: {
      type: ["VerifiableCredential", "IdentityCheckCredential"],
      evidence: [],
      credentialSubject,
    },
  };
  return sign(getDefaultJwtHeader(), payload);
};

const createRiskAssessmentVcJwt = async (): Promise<string> => {
  const payload = {
    sub: "user-sub",
    iss: "https://fraud-issuer.example.com",
    nbf: Math.floor(Date.now() / 1000),
    vc: {
      type: ["VerifiableCredential", "RiskAssessmentCredential"],
      evidence: [],
    },
  };
  return sign(getDefaultJwtHeader(), payload);
};

const buildIdentityResponse = async (vcJwts: string[]): Promise<CredentialStoreIdentityResponse> => {
  const siPayload = { sub: "user-sub", vot: "P2", vtm: "https://oidc.account.gov.uk/trustmark", credentials: [] };
  const siJwt = await sign(getDefaultJwtHeader(), siPayload);
  return {
    si: { vc: siJwt, metadata: undefined, unsignedVot: "P2" },
    vcs: vcJwts.map((jwt) => ({ state: "CURRENT", vc: jwt, metadata: undefined })),
  };
};

describe("extractUserDetails", () => {
  it("should extract name, dateOfBirth, and address from an IdentityCheckCredential VC", async () => {
    const vcJwt = await createIdentityCheckVcJwt({
      name: [
        {
          nameParts: [
            { type: "GivenName", value: "Jane" },
            { type: "FamilyName", value: "Doe" },
          ],
        },
      ],
      birthDate: [{ value: "1990-01-15" }],
      address: [
        {
          buildingNumber: "10",
          streetName: "Downing Street",
          addressLocality: "London",
          postalCode: "SW1A 2AA",
        },
      ],
    });

    const identityResponse = await buildIdentityResponse([vcJwt]);
    const result = extractUserDetails(identityResponse);

    expect(result).toEqual({
      name: "Jane Doe",
      dateOfBirth: "1990-01-15",
      addresses: [
        {
          label: "Current home address",
          addressDetailHtml: "10, Downing Street<br>London<br>SW1A 2AA",
        },
      ],
    });
  });

  it("should join multiple given names with spaces", async () => {
    const vcJwt = await createIdentityCheckVcJwt({
      name: [
        {
          nameParts: [
            { type: "GivenName", value: "Mary" },
            { type: "GivenName", value: "Jane" },
            { type: "FamilyName", value: "Watson" },
          ],
        },
      ],
      birthDate: [{ value: "1985-03-20" }],
      address: [],
    });

    const identityResponse = await buildIdentityResponse([vcJwt]);
    const result = extractUserDetails(identityResponse);

    expect(result.name).toBe("Mary Jane Watson");
  });

  it("should return empty name when no name is present", async () => {
    const vcJwt = await createIdentityCheckVcJwt({
      birthDate: [{ value: "2000-06-01" }],
      address: [],
    });

    const identityResponse = await buildIdentityResponse([vcJwt]);
    const result = extractUserDetails(identityResponse);

    expect(result.name).toBe("");
  });

  it("should return empty dateOfBirth when no birthDate is present", async () => {
    const vcJwt = await createIdentityCheckVcJwt({
      name: [{ nameParts: [{ type: "GivenName", value: "Test" }] }],
      address: [],
    });

    const identityResponse = await buildIdentityResponse([vcJwt]);
    const result = extractUserDetails(identityResponse);

    expect(result.dateOfBirth).toBe("");
  });

  it("should find IdentityCheckCredential among other VC types", async () => {
    const riskVcJwt = await createRiskAssessmentVcJwt();
    const identityVcJwt = await createIdentityCheckVcJwt({
      name: [
        {
          nameParts: [
            { type: "GivenName", value: "John" },
            { type: "FamilyName", value: "Smith" },
          ],
        },
      ],
      birthDate: [{ value: "1975-12-25" }],
      address: [],
    });

    const identityResponse = await buildIdentityResponse([riskVcJwt, identityVcJwt]);
    const result = extractUserDetails(identityResponse);

    expect(result.name).toBe("John Smith");
    expect(result.dateOfBirth).toBe("1975-12-25");
  });

  it("should throw when no IdentityCheckCredential is found", async () => {
    const riskVcJwt = await createRiskAssessmentVcJwt();
    const identityResponse = await buildIdentityResponse([riskVcJwt]);

    expect(() => extractUserDetails(identityResponse)).toThrow("No IdentityCheckCredential found in VCs");
  });

  it("should throw when credentialSubject is missing", async () => {
    const payload: IdentityCheckCredentialJWTClass = {
      sub: "user-sub",
      iss: "https://issuer.example.com",
      nbf: Math.floor(Date.now() / 1000),
      vc: {
        type: ["VerifiableCredential", "IdentityCheckCredential"],
        evidence: [],
      },
    };
    const vcJwt = await sign(getDefaultJwtHeader(), payload);
    const identityResponse = await buildIdentityResponse([vcJwt]);

    expect(() => extractUserDetails(identityResponse)).toThrow("No IdentityCheckCredential found in VCs");
  });

  it("should only include CURRENT VCs", async () => {
    const identityVcJwt = await createIdentityCheckVcJwt({
      name: [
        {
          nameParts: [
            { type: "GivenName", value: "Current" },
            { type: "FamilyName", value: "User" },
          ],
        },
      ],
      birthDate: [{ value: "1990-01-01" }],
      address: [],
    });

    const historicVcJwt = await createIdentityCheckVcJwt({
      name: [
        {
          nameParts: [
            { type: "GivenName", value: "Historic" },
            { type: "FamilyName", value: "User" },
          ],
        },
      ],
      birthDate: [{ value: "1990-01-01" }],
      address: [],
    });

    const siPayload = { sub: "user-sub", vot: "P2", vtm: "https://oidc.account.gov.uk/trustmark", credentials: [] };
    const siJwt = await sign(getDefaultJwtHeader(), siPayload);
    const identityResponse: CredentialStoreIdentityResponse = {
      si: { vc: siJwt, metadata: undefined, unsignedVot: "P2" },
      vcs: [
        { state: "CURRENT", vc: identityVcJwt, metadata: undefined },
        { state: "HISTORIC", vc: historicVcJwt, metadata: undefined },
      ],
    };

    const result = extractUserDetails(identityResponse);
    expect(result.name).toBe("Current User");
  });

  it("should label first address as current and subsequent as previous", async () => {
    const vcJwt = await createIdentityCheckVcJwt({
      name: [{ nameParts: [{ type: "GivenName", value: "Jane" }] }],
      birthDate: [{ value: "1990-01-01" }],
      address: [
        { buildingNumber: "1", streetName: "New Street", postalCode: "AB1 2CD" },
        { buildingNumber: "2", streetName: "Old Street", postalCode: "EF3 4GH" },
      ],
    });

    const identityResponse = await buildIdentityResponse([vcJwt]);
    const result = extractUserDetails(identityResponse);

    expect(result.addresses).toHaveLength(2);
    expect(result.addresses[0].label).toBe("Current home address");
    expect(result.addresses[1].label).toBe("Previous home address");
  });
});

describe("formatAddress", () => {
  it("should format an address with all fields", () => {
    const result = formatAddress({
      departmentName: "My department",
      organisationName: "My company",
      subBuildingName: "Room 5",
      buildingName: "my building",
      buildingNumber: "1",
      dependentStreetName: "My outer street",
      streetName: "my inner street",
      doubleDependentAddressLocality: "My double dependant town",
      dependentAddressLocality: "my dependant town",
      addressLocality: "my town",
      postalCode: "myCode",
      addressRegion: "myRegion",
    });

    expect(result).toBe(
      "My department, My company, Room 5, my building<br>1, My outer street, my inner street<br>My double dependant town, my dependant town, my town<br>myRegion<br>myCode"
    );
  });

  it("should format an address without street name fields", () => {
    const result = formatAddress({
      departmentName: "My department",
      organisationName: "My company",
      subBuildingName: "Room 5",
      buildingName: "my building",
      doubleDependentAddressLocality: "My double dependant town",
      dependentAddressLocality: "my dependant town",
      addressLocality: "my town",
      postalCode: "myCode",
      addressRegion: "myRegion",
    });

    expect(result).toBe(
      "My department, My company, Room 5, my building<br>My double dependant town, my dependant town, my town<br>myRegion<br>myCode"
    );
  });
});
