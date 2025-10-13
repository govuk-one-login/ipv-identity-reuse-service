import { getSecret } from "@aws-lambda-powertools/parameters/secrets";
import { getParameter } from "@aws-lambda-powertools/parameters/ssm";
import { getString } from "../../../../src/commons/string-utils";

const getTestParameter = async (parameterName: string): Promise<string> => {
  const stackName = process.env.SHARED_STACK_NAME || "reuse-identity-shared";
  const parameterValue = await getParameter(`/acceptance-tests/${stackName}/${parameterName}`);

  if (!parameterValue) {
    throw new Error(`Unable to get ${parameterName} secret`);
  }

  return parameterValue;
};

export const getEvcsApiKey = async (): Promise<string> => {
  const apiKey = getString(await getSecret(await getTestParameter("APIKeySecretARN")));
  if (!apiKey) {
    throw new Error("Could not fetch EVCS api key secret.");
  }
  return apiKey;
};

export const getDidSigningKeyAlias = async (): Promise<string> => {
  return await getTestParameter("DidStubSigningKeyAlias");
};

export const getDidControllerName = async (): Promise<string> => {
  return await getTestParameter("DidControllerName");
};

export const getSigningKeyId = async (): Promise<string> => {
  const keyArn = await getTestParameter("DidStubSigningKeyArn");
  return keyArn.split("/")[1];
};
