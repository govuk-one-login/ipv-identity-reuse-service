import { SecretsProvider } from "@aws-lambda-powertools/parameters/secrets";
import EndPoints from "./endpoints";
const secretsProvider = new SecretsProvider({ clientConfig: { region: "eu-west-2" } });

export enum APIKeyType {
  IPV_CORE_KEY = "IPVCore",
  EMPTY_KEY = "",
  INVALID_KEY = "invalidAPiKey",
}

async function getApiKeyValueFromSecretsManager(apiKeyType: string): Promise<string> {
  const secretName = EndPoints.BASE_SECRET_NAME + apiKeyType;
  const apiKey = await secretsProvider.get(secretName, { maxAge: 60 });
  if (!apiKey) {
    throw new Error(`failed to get api key: ${secretName}`);
  }
  return apiKey as string;
}

export function getApiKey(keyIdentifier: string = "IPV_CORE_KEY") {
  const key = (APIKeyType as never)[keyIdentifier];
  if (key === undefined) throw new Error(`invalid key identifier ${keyIdentifier}`);
  return key === APIKeyType.EMPTY_KEY || key === APIKeyType.INVALID_KEY ? key : getApiKeyValueFromSecretsManager(key);
}
