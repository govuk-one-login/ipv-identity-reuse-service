import { getAppConfig } from "@aws-lambda-powertools/parameters/appconfig";
import { getSecret } from "@aws-lambda-powertools/parameters/secrets";
import { getString } from "./string-utils";
import logger from "./logger";

export type Configuration = {
  evcsApiUrl: string;
  interventionCodesToInvalidate: string[];
  fraudIssuer: string[];
  fraudValidityPeriod: number;
  controllerAllowList: string[];
  enableDrivingLicenceExpiryCheck?: boolean;
  drivingLicenceValidityPeriod?: number;
  dcmawIssuer?: string[];
};

export const getConfiguration = async (): Promise<Configuration> => {
  logger.info("Retrieving configuration");

  const result = await getAppConfig(process.env.APP_CONFIG_NAME, {
    environment: process.env.ENVIRONMENT,
    application: process.env.APP_CONFIG_APPLICATION,
  });

  const stringResult = getString(result);
  if (!stringResult) {
    throw new Error("No configuration");
  }

  return JSON.parse(stringResult);
};

export const getServiceApiKey = async (): Promise<string | undefined> => {
  logger.info("Retrieving Service API Key");

  return getString(await getSecret(process.env.EVCS_API_KEY_SECRET_ARN));
};
