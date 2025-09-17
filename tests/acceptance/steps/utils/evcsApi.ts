import { AttributeValue } from "aws-lambda";
import request from "supertest";
import type { Response } from "superagent";
import type { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials";
import { CloudFormationClient, DescribeStacksCommand } from "@aws-sdk/client-cloudformation";
import { getSecret } from "@aws-lambda-powertools/parameters/secrets";
import { getAppConfig } from "@aws-lambda-powertools/parameters/appconfig";
import { getString } from "../../../../src/types/stringutils";
import { Configuration } from "../../../../src/types/configuration";
import { WorldDefinition } from "../base-verbs.step";

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

const CloudFormationOutputs = {
  ApiEndpoint: "ApiEndpoint",
  ApiKeyPath: "ApiKeyPath", // pragma: allowlist secret
  AppConfigApplication: "AppConfigApplication",
  AppConfigEnvironment: "AppConfigEnvironment",
  AppConfigName: "AppConfigName",
  EvcsApiKeySecretArn: "EvcsApiKeySecretArn", // pragma: allowlist secret
} as const;

type LogicalResourceType = keyof typeof CloudFormationOutputs;

const cachedCloudFormationResources: Map<LogicalResourceType, string> = new Map();

export const getCloudFormationResource = async (logicalResourceId: LogicalResourceType): Promise<string> => {
  if (cachedCloudFormationResources.has(logicalResourceId)) {
    return cachedCloudFormationResources.get(logicalResourceId) as string;
  }

  const client = new CloudFormationClient();

  const response = await client.send(
    new DescribeStacksCommand({
      StackName: process.env.SAM_STACK_NAME,
    })
  );

  const output = response.Stacks?.flatMap((stack) =>
    stack.Outputs?.filter((output) => output.OutputKey === logicalResourceId)
  ).shift();

  if (output?.OutputValue) {
    cachedCloudFormationResources.set(logicalResourceId, output.OutputValue);
    return output.OutputValue;
  }

  throw new Error(`Output ${logicalResourceId} not found in ${process.env.SAM_STACK_NAME}`);
};

const getCloudFormationResourceSecretValue = async (logicalResourceId: LogicalResourceType) => {
  const secretPath = await getCloudFormationResource(logicalResourceId);

  const secretValue = getString(await getSecret(secretPath));

  if (!secretValue) {
    throw new Error(`${CloudFormationOutputs.EvcsApiKeySecretArn} returned invalid result`);
  }
  return secretValue;
};

export const getEvcsApiKey = async (): Promise<string> =>
  getCloudFormationResourceSecretValue(CloudFormationOutputs.EvcsApiKeySecretArn);

export const getEvcsApiEndpoint = async (): Promise<string> => {
  const environment = await getCloudFormationResource(CloudFormationOutputs.AppConfigEnvironment);

  const result = await getAppConfig(await getCloudFormationResource(CloudFormationOutputs.AppConfigName), {
    environment: environment === "local" ? "dev" : environment,
    application: await getCloudFormationResource(CloudFormationOutputs.AppConfigApplication),
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
