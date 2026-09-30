import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import * as configuration from "../../../commons/configuration.js";
import * as DidResolutionService from "../../../api/did-resolution-api.js";
import * as JwtUtilities from "../../../commons/jwt-utilities.js";
import * as StoredIdentityTypes from "../stored-identity-types.js";
import { publicKeyJwk, getDefaultJwtHeader } from "../../../../shared-test/jwt-utilities.js";
import {
  createCredentialStoreIdentityResponse,
  createInvalidIdentityCheckCredentialJWT,
  createSignedIdentityCheckCredentialJWT,
} from "../../../../shared-test/evcs-api-utilities.js";
import {
  getIdentityFromCredentialStore,
  getSignedStoredIdentity,
  getStoredIdentityRecordBody,
  validateCryptography,
  validateStoredIdentity,
} from "../stored-identity-validator.js";
import { getJwtSignature } from "../../../commons/jwt-utilities.js";
import { EVCSIdentityResponse } from "../../../api/evcs-api.js";
import { Configuration } from "../../../commons/configuration.js";
import { EVCSError, StoredIdentityValidationError } from "../../../commons/errors.js";
import { SignedStoredIdentity, StoredIdentityRecord } from "../stored-identity-types.js";
import { KENNETH_DECERQUEIRA } from "@govuk-one-login/ipv-trust-and-reuse-test-credentials/names";
import { KENNETH_DECERQUEIRA_BIRTH_DATE } from "@govuk-one-login/ipv-trust-and-reuse-test-credentials/birthdates";
import { KENNETH_DECERQUERIA_ADDRESS } from "@govuk-one-login/ipv-trust-and-reuse-test-credentials/addresses";
import { JWTInvalid } from "jose/errors";
import logger from "../../../commons/logger.js";

const mockEVCSResponse = (response: EVCSIdentityResponse) => {
  (globalThis.fetch as Mock) = vi.fn().mockResolvedValue(
    Response.json(response, {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  );
};

vi.mock("../../../commons/logger.js");

const ALLOWED_CONTROLLER = "api.identity.dev.account.gov.uk";
const FRAUD_ISSUER = "fraudCRI";
const PASSPORT_ISSUER = "passportCRI";

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(configuration, "getConfiguration").mockResolvedValue({
    controllerAllowList: [ALLOWED_CONTROLLER],
    evcsApiUrl: "https://evcs.account.gov.uk",
  } as Configuration);
  vi.spyOn(configuration, "getServiceApiKey").mockResolvedValue("apiKey");
  vi.spyOn(DidResolutionService, "getPublicKeyJwkForKid").mockResolvedValue(publicKeyJwk);
  vi.spyOn(DidResolutionService, "isValidDidWeb").mockReturnValue(true);
  vi.spyOn(DidResolutionService, "getDidWebController").mockReturnValue(ALLOWED_CONTROLLER);
});

describe("getIdentityFromCredentialStore", () => {
  it("returns data for 200 response from EVCS", async () => {
    (globalThis.fetch as Mock) = vi.fn().mockResolvedValue({ status: 404 });
    expect(await getIdentityFromCredentialStore("token")).toBe(undefined);
  });

  it("returns responseBody for 200 response from EVCS", async () => {
    const responseBody = { key: "value" };
    (globalThis.fetch as Mock) = vi.fn().mockResolvedValue(
      Response.json(responseBody, {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    expect(await getIdentityFromCredentialStore("token")).toEqual(responseBody);
  });

  it("returns EVCSError for 500 response from EVCS", async () => {
    (globalThis.fetch as Mock) = vi.fn().mockResolvedValue({ status: 500 });
    await expect(getIdentityFromCredentialStore("token")).rejects.toThrow(new EVCSError(500));
  });
});

describe("validateCryptography", () => {
  it("returns kidValid & signatureValid true for a valid SI VC", async () => {
    const { mockEVCSData } = await createCredentialStoreIdentityResponse([]);
    const result = await validateCryptography(getDefaultJwtHeader().kid!, mockEVCSData);
    expect(result).toEqual({ kidValid: true, signatureValid: true });
  });

  it("kidValid false when DID is not valid did:web", async () => {
    vi.spyOn(DidResolutionService, "isValidDidWeb").mockReturnValue(false);
    const { mockEVCSData } = await createCredentialStoreIdentityResponse(
      [],
      getDefaultJwtHeader("ES256", "did:invalid-did")
    );
    mockEVCSResponse(mockEVCSData);

    const result = await validateCryptography(getDefaultJwtHeader("ES256", "did:invalid-did").kid!, mockEVCSData);

    expect(result).toEqual({ kidValid: false, signatureValid: false });
  });

  it("kidValid false when controller is not allow-listed", async () => {
    vi.spyOn(DidResolutionService, "isValidDidWeb").mockReturnValue(true);
    vi.spyOn(DidResolutionService, "getDidWebController").mockReturnValue("DISALLOWED.CONTROLLER");

    const header = getDefaultJwtHeader("ES256", "did:web:DISALLOWED.CONTROLLER#f5fe5d2a-9eb6-4819-8c46-723e3a21565a");
    const { mockEVCSData } = await createCredentialStoreIdentityResponse([], header);

    const result = await validateCryptography(header.kid!, mockEVCSData);
    expect(result).toEqual({ kidValid: false, signatureValid: false });
  });

  it("signatureValid false when the SI VC signature does not verify", async () => {
    const incorrectlySignedIdentity = createInvalidIdentityCheckCredentialJWT(PASSPORT_ISSUER);
    const { mockEVCSData } = await createCredentialStoreIdentityResponse([], getDefaultJwtHeader());
    mockEVCSData.si.vc = incorrectlySignedIdentity;
    mockEVCSResponse(mockEVCSData);

    const result = await validateCryptography(getDefaultJwtHeader().kid!, mockEVCSData);
    expect(result).toEqual({ kidValid: true, signatureValid: false });
  });
});

describe("validateStoredIdentity", () => {
  it("isValid set to true when SI credentials match returned VC signatures", async () => {
    const { mockEVCSData } = await createCredentialStoreIdentityResponse([
      await createSignedIdentityCheckCredentialJWT(PASSPORT_ISSUER),
      await createSignedIdentityCheckCredentialJWT(FRAUD_ISSUER),
    ]);

    const result = await validateStoredIdentity(mockEVCSData);
    expect(result).toMatchObject({ kidValid: true, signatureValid: true, isValid: true });
    expect(result.storedIdentityRecord).toBeDefined();
  });

  it("isValid is false when a stored identity record is missing a signature", async () => {
    const passportCredential = await createSignedIdentityCheckCredentialJWT(PASSPORT_ISSUER);
    const fraudCredential = await createSignedIdentityCheckCredentialJWT(FRAUD_ISSUER);
    const fraudCredentialSignature = getJwtSignature(fraudCredential)!;

    const credentials = [passportCredential, fraudCredential];
    const credentialSignaturesMissingOne = [fraudCredentialSignature];

    const { mockEVCSData } = await createCredentialStoreIdentityResponse(
      credentials,
      getDefaultJwtHeader(),
      credentialSignaturesMissingOne
    );
    const result = await validateStoredIdentity(mockEVCSData);

    expect(result).toMatchObject({ kidValid: true, signatureValid: true, isValid: false });
  });

  it("isValid is false when a stored identity record contains an extra signature", async () => {
    const passportCredential = await createSignedIdentityCheckCredentialJWT(PASSPORT_ISSUER);
    const fraudCredential = await createSignedIdentityCheckCredentialJWT(FRAUD_ISSUER);
    const passportCredentialSignature = getJwtSignature(passportCredential)!;
    const fraudCredentialSignature = getJwtSignature(fraudCredential)!;

    const credentials = [passportCredential];
    const credentialSignaturesExtraOne = [passportCredentialSignature, fraudCredentialSignature];

    const { mockEVCSData } = await createCredentialStoreIdentityResponse(
      credentials,
      getDefaultJwtHeader(),
      credentialSignaturesExtraOne
    );

    const result = await validateStoredIdentity(mockEVCSData);

    expect(result).toMatchObject({ kidValid: true, signatureValid: true, isValid: false });
  });
});

describe("getSignedStoredIdentity", () => {
  it("should create signed stored identity object from EVCS data", async () => {
    const responseBody = {
      si: {
        vc: "header1.payload1.signature1",
        unsignedVot: "P2",
      },
      vcs: [
        { vc: "header2.payload2.signature2", state: "CURRENT" },
        { vc: "header3.payload3.signature3", state: "CURRENT" },
      ],
    };

    (globalThis.fetch as Mock) = vi.fn().mockResolvedValue(
      Response.json(responseBody, {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    const expectedSignedStoredIdentity: SignedStoredIdentity = {
      signedStoredIdentityRecord: "header1.payload1.signature1",
      signedCredentials: ["header2.payload2.signature2", "header3.payload3.signature3"],
    };

    expect(await getSignedStoredIdentity("authToken")).toStrictEqual(expectedSignedStoredIdentity);
  });

  it("should return undefined if no signed stored identity object present in EVCS", async () => {
    (globalThis.fetch as Mock) = vi.fn().mockResolvedValue({ status: 404 });
    expect(await getSignedStoredIdentity("authToken")).toBe(undefined);
  });
});

describe("getStoredIdentityRecordBody", () => {
  it("should return decoded stored identity record", () => {
    const storedIdentityRecord: StoredIdentityRecord = {
      sub: "sub123",
      vot: "P1",
      credentials: ["signature1", "signature2"],
      claims: {
        "https://vocab.account.gov.uk/v1/coreIdentity": {
          name: [KENNETH_DECERQUEIRA],
          birthDate: [KENNETH_DECERQUEIRA_BIRTH_DATE],
        },
        "https://vocab.account.gov.uk/v1/address": [KENNETH_DECERQUERIA_ADDRESS],
      },
    };
    const getJwtBody = vi.spyOn(JwtUtilities, "getJwtBody").mockReturnValue(storedIdentityRecord);

    expect(getStoredIdentityRecordBody("header.payload.signature3")).toStrictEqual(storedIdentityRecord);
    expect(getJwtBody).toHaveBeenCalledWith("header.payload.signature3");
  });

  it("should throw a StoredIdentityValidationError if JWT cannot be decoded", () => {
    const error = new JWTInvalid("I am an error");
    vi.spyOn(JwtUtilities, "getJwtBody").mockThrow(error);
    expect(() => getStoredIdentityRecordBody("header.payload.signature3")).toThrow(
      new StoredIdentityValidationError("Cannot decode stored identity JWT", { cause: error })
    );
    expect(logger.error).toHaveBeenCalledWith("Cannot decode stored identity JWT", { cause: error });
  });

  it("should throw a StoredIdentityValidationError if JWT is not a valid stored identity record object", () => {
    const storedIdentityRecord: StoredIdentityRecord = {
      sub: "sub123",
      vot: "P1",
      credentials: ["signature1", "signature2"],
      claims: {
        "https://vocab.account.gov.uk/v1/coreIdentity": {
          name: [KENNETH_DECERQUEIRA],
          birthDate: [KENNETH_DECERQUEIRA_BIRTH_DATE],
        },
        "https://vocab.account.gov.uk/v1/address": [KENNETH_DECERQUERIA_ADDRESS],
      },
    };
    vi.spyOn(JwtUtilities, "getJwtBody").mockReturnValue(storedIdentityRecord);

    vi.spyOn(StoredIdentityTypes, "isStoredIdentityRecord").mockReturnValue(false);
    expect(() => getStoredIdentityRecordBody("header.payload.signature3")).toThrow(
      new StoredIdentityValidationError("JWT is not a valid stored identity record")
    );
    expect(logger.error).toHaveBeenCalledWith("JWT is not a valid stored identity record");
  });
});
