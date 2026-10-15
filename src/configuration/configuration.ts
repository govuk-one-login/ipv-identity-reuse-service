import { getAppConfig } from "@aws-lambda-powertools/parameters/appconfig";
import { getSecret } from "@aws-lambda-powertools/parameters/secrets";
import { getString } from "../utilities/string-utilities.js";
import logger from "../utilities/logger.js";
import { getRequiredEnvironment } from "./get-required-environment.js";
import { parseJsonWithTypeValidation } from "../utilities/type-utilities.js";
import { ConfigurationError } from "../utilities/errors.js";
import { isValidConfiguration } from "./configuration-validator.js";

export interface Configuration {
  evcsApiUrl: string;
  interventionCodesToInvalidate: string[];
  fraudIssuer: string[];
  fraudValidityPeriod: number;
  controllerAllowList: string[];
  drivingLicenceValidityPeriod?: number;
  dcmawIssuer?: string[];
  securityCheckIssuer: string;
  ciReturnCodes: ReturnCodeMapping[];
}

export interface ReturnCodeMapping {
  ci: string;
  returnCode: string;
}

export const getConfiguration = async (): Promise<Configuration> => {
  logger.info("Retrieving configuration");
  try {
    const result: Uint8Array<ArrayBufferLike> = await getAppConfig(process.env.APP_CONFIG_NAME, {
      environment: process.env.ENVIRONMENT,
      application: process.env.APP_CONFIG_APPLICATION,
      throwOnMissing: true,
    });

    const stringResult = getString(result);
    return parseJsonWithTypeValidation(stringResult, isValidConfiguration);
  } catch (error) {
    logger.error("Error reading config from AppConfig", { error });
    throw new ConfigurationError("Error reading config from AppConfig", { cause: error });
  }
};

export const getServiceApiKey = async (): Promise<string> => {
  logger.info("Retrieving Service API Key");
  try {
    return getString(await getSecret(getRequiredEnvironment("EVCS_API_KEY_SECRET_ARN"), { throwOnMissing: true }));
  } catch (error) {
    logger.error("Error reading EVCS API key from Secrets Manager");
    throw new ConfigurationError("Error reading EVCS API key from Secrets Manager", { cause: error });
  }
};

export const getOauthInternalApiUrl = (): string => {
  return getRequiredEnvironment("OAUTH_INTERNAL_API_URL");
};

export const getSessionTimeout = (): string => {
  return getRequiredEnvironment("SESSION_TIMEOUT_MS");
};
