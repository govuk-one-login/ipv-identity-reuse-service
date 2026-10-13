import { describe, expect, it } from "vitest";
import { Configuration } from "../configuration.js";
import { isValidConfiguration } from "../configuration-validator.js";

describe("isValidConfiguration", () => {
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

  it("should return true for valid configuration object", () => {
    expect(isValidConfiguration(baseConfig)).toEqual(true);
  });

  it("should return false for missing evcsApiUrl", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { evcsApiUrl, ...testObject } = baseConfig;
    expect(isValidConfiguration(testObject)).toEqual(false);
  });

  it("should return false if evcsApiUrl not a string", () => {
    expect(isValidConfiguration({ ...baseConfig, evcsApiUrl: 100 })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, evcsApiUrl: {} })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, evcsApiUrl: [] })).toEqual(false);
  });

  it("should return false for missing interventionCodesToInvalidate", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { interventionCodesToInvalidate, ...testObject } = baseConfig;
    expect(isValidConfiguration(testObject)).toEqual(false);
  });

  it("should return true for empty interventionCodesToInvalidate", () => {
    expect(isValidConfiguration({ ...baseConfig, interventionCodesToInvalidate: [] })).toEqual(true);
  });

  it("should return false if interventionCodesToInvalidate not an array of strings", () => {
    expect(isValidConfiguration({ ...baseConfig, interventionCodesToInvalidate: 100 })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, interventionCodesToInvalidate: {} })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, interventionCodesToInvalidate: [100] })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, interventionCodesToInvalidate: [{}] })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, interventionCodesToInvalidate: ["a-string", 100] })).toEqual(false);
  });

  it("should return false for missing fraudIssuer", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fraudIssuer, ...testObject } = baseConfig;
    expect(isValidConfiguration(testObject)).toEqual(false);
  });

  it("should return true for empty fraudIssuer", () => {
    expect(isValidConfiguration({ ...baseConfig, fraudIssuer: [] })).toEqual(true);
  });

  it("should return false if fraudIssuer not an array of strings", () => {
    expect(isValidConfiguration({ ...baseConfig, fraudIssuer: 100 })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, fraudIssuer: {} })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, fraudIssuer: [100] })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, fraudIssuer: [{}] })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, fraudIssuer: ["a-string", 100] })).toEqual(false);
  });

  it("should return false for missing fraudValidityPeriod", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fraudValidityPeriod, ...testObject } = baseConfig;
    expect(isValidConfiguration(testObject)).toEqual(false);
  });

  it("should return false if fraudValidityPeriod not a number", () => {
    expect(isValidConfiguration({ ...baseConfig, fraudValidityPeriod: "a-string" })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, fraudValidityPeriod: {} })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, fraudValidityPeriod: [] })).toEqual(false);
  });

  it("should return false for missing controllerAllowList", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { controllerAllowList, ...testObject } = baseConfig;
    expect(isValidConfiguration(testObject)).toEqual(false);
  });

  it("should return true for empty controllerAllowList", () => {
    expect(isValidConfiguration({ ...baseConfig, controllerAllowList: [] })).toEqual(true);
  });

  it("should return false if controllerAllowList not an array of strings", () => {
    expect(isValidConfiguration({ ...baseConfig, controllerAllowList: 100 })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, controllerAllowList: {} })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, controllerAllowList: [100] })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, controllerAllowList: [{}] })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, controllerAllowList: ["a-string", 100] })).toEqual(false);
  });

  it("should return false for missing securityCheckIssuer", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { securityCheckIssuer, ...testObject } = baseConfig;
    expect(isValidConfiguration(testObject)).toEqual(false);
  });

  it("should return false if securityCheckIssuer not a string", () => {
    expect(isValidConfiguration({ ...baseConfig, securityCheckIssuer: 100 })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, securityCheckIssuer: {} })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, securityCheckIssuer: [] })).toEqual(false);
  });

  it("should return false for missing ciReturnCodes", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ciReturnCodes, ...testObject } = baseConfig;
    expect(isValidConfiguration(testObject)).toEqual(false);
  });

  it("should return true for empty ciReturnCodes", () => {
    expect(isValidConfiguration({ ...baseConfig, ciReturnCodes: [] })).toEqual(true);
  });

  it("should return false if ciReturnCodes not an array of ReturnCodeMapping", () => {
    expect(isValidConfiguration({ ...baseConfig, ciReturnCodes: "a-return-code" })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, ciReturnCodes: {} })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, ciReturnCodes: ["a-return-code"] })).toEqual(false);
    expect(
      isValidConfiguration({ ...baseConfig, ciReturnCodes: [{ ci: "G97", returnCode: "L" }, { ci: "G97" }] })
    ).toEqual(false);
    expect(
      isValidConfiguration({ ...baseConfig, ciReturnCodes: [{ ci: "G97", returnCode: "L" }, { returnCode: "L" }] })
    ).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, ciReturnCodes: [{ ci: 97, returnCode: "L" }] })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, ciReturnCodes: [{ ci: "G97", returnCode: 10 }] })).toEqual(false);
  });

  it("should return true for missing dcmawIssuer", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { dcmawIssuer, ...testObject } = baseConfig;
    expect(isValidConfiguration(testObject)).toEqual(true);
  });

  it("should return true for empty dcmawIssuer", () => {
    expect(isValidConfiguration({ ...baseConfig, dcmawIssuer: [] })).toEqual(true);
  });

  it("should return false if dcmawIssuer not an array of strings", () => {
    expect(isValidConfiguration({ ...baseConfig, dcmawIssuer: 100 })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, dcmawIssuer: {} })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, dcmawIssuer: [100] })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, dcmawIssuer: [{}] })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, dcmawIssuer: ["a-string", 100] })).toEqual(false);
  });

  it("should return true for missing drivingLicenceValidityPeriod", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { drivingLicenceValidityPeriod, ...testObject } = baseConfig;
    expect(isValidConfiguration(testObject)).toEqual(true);
  });

  it("should return false if drivingLicenceValidityPeriod not a number", () => {
    expect(isValidConfiguration({ ...baseConfig, drivingLicenceValidityPeriod: "a-string" })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, drivingLicenceValidityPeriod: {} })).toEqual(false);
    expect(isValidConfiguration({ ...baseConfig, drivingLicenceValidityPeriod: [] })).toEqual(false);
  });
});
