import { getAppConfig } from "@aws-lambda-powertools/parameters/appconfig";
import { getString } from "./stringutils";

export type Configuration = {
  evcsApiUrl: string;
  interventionCodesToInvalidate: string[];
  fraudIssuer: string;
  fraudValidityPeriod: {levelOfConfidence:string, value:number}[];
};

export const getConfiguration = async (): Promise<Configuration> => {
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

export const getFraudValidityPeriod = (config :Configuration, levelOfConfidence:string):number | undefined  => {
  return config.fraudValidityPeriod.filter(fraudConfig => fraudConfig.levelOfConfidence === levelOfConfidence).map(validityPeriod => validityPeriod.value).pop();
}