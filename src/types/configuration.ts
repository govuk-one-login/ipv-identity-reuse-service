import { getAppConfig } from "@aws-lambda-powertools/parameters/appconfig";
import { getString } from "./stringutils";

export type Configuration = {
  evcsApiUrl: string;
  interventionCodesToInvalidate: string[];
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
