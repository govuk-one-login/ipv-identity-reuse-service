import { isArrayOfType, isNonNullObject, isNumber, isString, isTypeWhenDefined } from "../utilities/type-utilities.js";
import { Configuration, ReturnCodeMapping } from "./configuration.js";

export const isValidConfiguration = (value: unknown): value is Configuration => {
  if (!isNonNullObject(value)) return false;
  const object = value as Record<string, unknown>;

  return (
    isString(object.evcsApiUrl) &&
    isArrayOfType(object.interventionCodesToInvalidate, isString) &&
    isArrayOfType(object.fraudIssuer, isString) &&
    isNumber(object.fraudValidityPeriod) &&
    isArrayOfType(object.controllerAllowList, isString) &&
    isArrayOfType(object.ciReturnCodes, isReturnCodeMapping) &&
    isString(object.securityCheckIssuer) &&
    isTypeWhenDefined(object.drivingLicenceValidityPeriod, isNumber) &&
    isTypeWhenDefined(object.dcmawIssuer, (value: unknown) => isArrayOfType(value, isString))
  );
};

const isReturnCodeMapping = (value: unknown): value is ReturnCodeMapping => {
  if (!isNonNullObject(value)) return false;
  const object = value as Record<string, unknown>;
  return isString(object.ci) && isString(object.returnCode);
};
