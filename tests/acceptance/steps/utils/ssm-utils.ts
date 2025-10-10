import { getSecret } from "@aws-lambda-powertools/parameters/secrets";
import { getParameter } from "@aws-lambda-powertools/parameters/ssm";
import { getString } from "../../../../src/commons/string-utils";

const getTestParameter = async (parameterName: string): Promise<string> => {
  const stackName = process.env.SHARED_STACK_NAME || "reuse-identity-shared";
  const parameterArn = await getParameter(`/acceptance-tests/${stackName}/${parameterName}`);

  if (!parameterArn) {
    throw new Error(`Unable to get ${parameterName}`);
  }

  const secretValue = getString(await getSecret(parameterArn));

  if (!secretValue) {
    throw new Error(`Unable to get ${parameterName} secret`);
  }

  return secretValue;
};

export const getEvcsApiKey = async (): Promise<string> => {
  return await getTestParameter("APIKeySecretARN");
};

export const getDidSigningKeyAlias = async (): Promise<string> => {
  return await getTestParameter("DidStubSigningKeyAlias");
};

export const getDidControllerName = async (): Promise<string> => {
  return await getTestParameter("DidControllerName");
};
