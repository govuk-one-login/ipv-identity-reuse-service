import { AttributeValue } from "aws-lambda";
import request from "supertest";
import type { Response } from "superagent";
import type { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials";
import { getAppConfig } from "@aws-lambda-powertools/parameters/appconfig";
import { getString } from "../../../../src/commons/string-utils";
import { Configuration } from "../../../../src/commons/configuration";
import { WorldDefinition } from "../base-verbs.step";
import { CloudFormationOutputs, getCloudFormationOutput } from "./cloudformation";
import { getSecret } from "@aws-lambda-powertools/parameters/secrets";
import { getParameter } from "@aws-lambda-powertools/parameters/ssm";

export const EvcsEndpoints = {
  BuildStubBaseUrl: "https://evcs.reuse.stubs.account.gov.uk",
  DevStubBaseUrl: "https://evcs.reuse.dev.stubs.account.gov.uk",
  IdentityEndpoint: "/identity",
  VcsEndpoint: "/vcs",
} as const;

export interface PersistStoredIdentity {
  userId: string;
  si: StoredIdentityObjectDetails;
}

export interface StoredIdentityObjectDetails {
  jwt: string;
  vot: IdentityVectorOfTrust;
  metadata?: Record<string, AttributeValue>;
}

export interface StoredCredentialObjectDetails {
  vc: string;
  state: string;
}

export const getEvcsApiKey = async (): Promise<string> => {
  const stackName = process.env.SHARED_STACK_NAME || "reuse-identity-shared";
  const evcsApiKeySecretArn = await getParameter(`/acceptance-tests/${stackName}/APIKeySecretARN`);

  if (!evcsApiKeySecretArn) {
    throw new Error("Unable to get APIKeySecretARN");
  }

  const evcsApiKeySecret = getString(await getSecret(evcsApiKeySecretArn));

  if (!evcsApiKeySecret) {
    throw new Error("Unable to get EVCSApiKeySecret");
  }

  return evcsApiKeySecret;
};

export const getEvcsApiEndpoint = async (): Promise<string> => {
  const environment = await getCloudFormationOutput(CloudFormationOutputs.AppConfigEnvironment);

  if (environment === "build") {
    return EvcsEndpoints.BuildStubBaseUrl;
  }

  const result = await getAppConfig(await getCloudFormationOutput(CloudFormationOutputs.AppConfigName), {
    environment: environment === "local" ? "dev" : environment,
    application: await getCloudFormationOutput(CloudFormationOutputs.AppConfigApplication),
  });

  if (!result) {
    throw new Error("AppConfig returned no data");
  }

  const configuration = JSON.parse(getString(result) || "") as Configuration;

  return configuration.evcsApiUrl || EvcsEndpoints.DevStubBaseUrl;
};

export const evcsPostIdentity = async (
  world: WorldDefinition,
  userId: string,
  storedIdentity: StoredIdentityObjectDetails,
  bearerToken: string
): Promise<Response> => {
  const apiEndpoint = await getEvcsApiEndpoint();
  const apiKey = await getEvcsApiKey();

  return request(apiEndpoint)
    .post(EvcsEndpoints.IdentityEndpoint)
    .send(
      JSON.stringify({
        userId,
        si: storedIdentity,
      } satisfies PersistStoredIdentity)
    )
    .set("x-api-key", apiKey)
    .set("Authorization", bearerToken)
    .set("Accept", "*/*")
    .set("Content-Type", "application/json");
};

export const evcsPostCredentials = async (
  userId: string,
  credentials: StoredCredentialObjectDetails[]
): Promise<Response> => {
  const apiEndpoint = await getEvcsApiEndpoint();
  const apiKey = await getEvcsApiKey();

  return request(apiEndpoint)
    .post(`${EvcsEndpoints.VcsEndpoint}/${userId}`)
    .send(JSON.stringify(credentials))
    .set("x-api-key", apiKey)
    .set("Accept", "*/*")
    .set("Content-Type", "application/json");
};
