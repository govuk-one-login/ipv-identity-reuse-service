import { AttributeValue } from "aws-lambda";
import request from "supertest";
import type { Response } from "superagent";
import type { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials";
import { getAppConfig } from "@aws-lambda-powertools/parameters/appconfig";
import { getString } from "../../../../src/commons/string-utils";
import { Configuration } from "../../../../src/commons/configuration";
import { WorldDefinition } from "../base-verbs.step";
import {
  CloudFormationOutputs,
  getCloudFormationExport,
  getCloudFormationOutput,
  getCloudFormationParameter,
} from "./cloudformation";
import { getSecret } from "@aws-lambda-powertools/parameters/secrets";

export const EvcsEndpoints = {
  BaseUrl:
    process.env.TEST_ENVIRONMENT === "dev"
      ? "https://evcs.reuse.dev.stubs.account.gov.uk"
      : "https://evcs.reuse.stubs.account.gov.uk",
  IdentityEndpoint: "/identity",
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

export const getEvcsApiKey = async (): Promise<string> => {
  const sharedStackName = await getCloudFormationParameter("SharedStackName");
  const evcsApiKeySecretArn = await getCloudFormationExport(`${sharedStackName}-EVCSApiKeySecret`);

  const evcsApiKeySecret = getString(await getSecret(evcsApiKeySecretArn));

  if (!evcsApiKeySecret) {
    throw new Error("Unable to get EVCSApiKeySecret");
  }

  return evcsApiKeySecret;
};

export const getEvcsApiEndpoint = async (): Promise<string> => {
  const environment = await getCloudFormationOutput(CloudFormationOutputs.AppConfigEnvironment);

  const result = await getAppConfig(await getCloudFormationOutput(CloudFormationOutputs.AppConfigName), {
    environment: environment === "local" ? "dev" : environment,
    application: await getCloudFormationOutput(CloudFormationOutputs.AppConfigApplication),
  });

  if (!result) {
    throw new Error("AppConfig returned no data");
  }

  const configuration = JSON.parse(getString(result) || "") as Configuration;

  return configuration.evcsApiUrl;
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
