import { getAppConfig } from "@aws-lambda-powertools/parameters/appconfig";
import { getString } from "./stringutils";

/**
 * Service configuration
 */
export type Configuration = {
  /**
   * The URL of the identity service
   */
  evcsApiUrl: string;
  /**
   * The intervention codes required to be invalidated
   */
  interventionCodesToInvalidate: string[];
};

/**
 * Get the configuration from AppConfig. This will cache the result for
 * the default period. If the AppConfig is undefined an Error is thrown.
 * @returns The service configuration
 */
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
