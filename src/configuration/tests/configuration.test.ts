import { Configuration, getConfiguration, getServiceApiKey } from "../configuration.js";
import { describe, expect, it, vi } from "vitest";
import { AppConfigProvider } from "@aws-lambda-powertools/parameters/appconfig";
import { SecretsProvider } from "@aws-lambda-powertools/parameters/secrets";
import { Uint8ArrayBlobAdapter } from "@smithy/util-stream";
import { ParameterNotFoundError } from "@aws-lambda-powertools/parameters";
import { ConfigurationError, JsonParseError } from "../../utilities/errors.js";
import * as typeUtilities from "../../utilities/type-utilities.js";
import * as stringUtilities from "../../utilities/string-utilities.js";
import * as getRequiredEnvironment from "../get-required-environment.js";

vi.mock("../logger.js");

describe("getConfiguration", () => {
  const appConfigProviderGet = vi.spyOn(AppConfigProvider.prototype, "get");

  const baseConfig: Configuration = Object.freeze({
    evcsApiUrl: "https://api.example.com",
    interventionCodesToInvalidate: ["05", "06"],
    fraudIssuer: ["https://fraud-cri.example.com"],
    fraudValidityPeriod: 180,
    controllerAllowList: ["api.identity.dev.account.gov.uk"],
    drivingLicenceValidityPeriod: 180,
    dcmawIssuer: ["https://dcmaw-cri.example.com"],
    securityCheckIssuer: "https://cimit.example.com",
    ciReturnCodes: [{ ci: "G97", returnCode: "L" }],
  });

  it("should return valid configuration object when powertools returns valid data", async () => {
    appConfigProviderGet.mockResolvedValueOnce(Uint8ArrayBlobAdapter.fromString(JSON.stringify(baseConfig)));
    expect(await getConfiguration()).toEqual(baseConfig);
  });

  it("should throw ConfigurationError when powertools throws ParameterNotFoundError due to missing config", async () => {
    appConfigProviderGet.mockThrow(new ParameterNotFoundError());
    await expect(getConfiguration()).rejects.toThrow(
      new ConfigurationError("Error reading config from AppConfig", { cause: new ParameterNotFoundError() })
    );
  });

  it("should throw ConfigurationError when text decoding throws TypeError", async () => {
    appConfigProviderGet.mockResolvedValueOnce(Uint8ArrayBlobAdapter.fromString(JSON.stringify(baseConfig)));
    vi.spyOn(stringUtilities, "getString").mockThrowOnce(new TypeError("Failed to decode text"));

    await expect(getConfiguration()).rejects.toThrow(
      new ConfigurationError("Error reading config from AppConfig", {
        cause: new TypeError("Failed to decode text"),
      })
    );
  });

  it("should throw ConfigurationError when parseJsonWithTypeValidation throws JsonParseError", async () => {
    appConfigProviderGet.mockResolvedValueOnce(Uint8ArrayBlobAdapter.fromString(JSON.stringify(baseConfig)));
    vi.spyOn(typeUtilities, "parseJsonWithTypeValidation").mockThrowOnce(
      new JsonParseError("JSON object does not match expected type")
    );

    await expect(getConfiguration()).rejects.toThrow(
      new ConfigurationError("Error reading config from AppConfig", {
        cause: new JsonParseError("JSON object does not match expected type"),
      })
    );
  });
});

describe("getServiceApiKey", () => {
  const secretsProviderGet = vi.spyOn(SecretsProvider.prototype, "get");

  it("should return key string when powertools returns valid data", async () => {
    secretsProviderGet.mockResolvedValueOnce(Uint8ArrayBlobAdapter.fromString("an-api-key"));
    expect(await getServiceApiKey()).toEqual("an-api-key");
  });

  it("should throw ConfigurationError when powertools throws ParameterNotFoundError due to missing secret", async () => {
    secretsProviderGet.mockThrow(new ParameterNotFoundError());
    await expect(getServiceApiKey()).rejects.toThrow(
      new ConfigurationError("Error reading EVCS API key from Secrets Manager", { cause: new ParameterNotFoundError() })
    );
  });

  it("should throw ConfigurationError when text decoding throws TypeError", async () => {
    secretsProviderGet.mockResolvedValueOnce(Uint8ArrayBlobAdapter.fromString("an-api-key"));
    vi.spyOn(stringUtilities, "getString").mockThrowOnce(new TypeError("Failed to decode text"));

    await expect(getServiceApiKey()).rejects.toThrow(
      new ConfigurationError("Error reading EVCS API key from Secrets Manager", {
        cause: new TypeError("Failed to decode text"),
      })
    );
  });

  it("should throw ConfigurationError when secret name cannot be fetched from environment", async () => {
    secretsProviderGet.mockResolvedValueOnce(Uint8ArrayBlobAdapter.fromString("an-api-key"));
    vi.spyOn(getRequiredEnvironment, "getRequiredEnvironment").mockThrowOnce(
      new Error("Environment variable EVCS_API_KEY_SECRET_ARN must be defined")
    );

    await expect(getServiceApiKey()).rejects.toThrow(
      new ConfigurationError("Error reading EVCS API key from Secrets Manager", {
        cause: new Error("Environment variable EVCS_API_KEY_SECRET_ARN must be defined"),
      })
    );
  });
});
