import { AttributeValue } from "aws-lambda";
import request from "supertest";
import type { Response } from "superagent";
import type { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials.js";
import { getAppConfig } from "@aws-lambda-powertools/parameters/appconfig";
import { getString } from "../../../../src/commons/string-utilities.js";
import { Configuration } from "../../../../src/commons/configuration.js";
import { CloudFormationOutputs, getCloudFormationOutput } from "./cloudformation.js";
import { getEvcsApiKey } from "./ssm-utilities.js";

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

export interface UpdateStoredCredentialObjectDetails {
  signature: string;
  state: string;
}

export interface PersistUserVCs {
  userId: string;
  govuk_signin_journey_id?: string;
  vcs: Array<StoredCredentialObjectDetails>;
}

export interface UpdateUserVCs {
  userId: string;
  govuk_signin_journey_id?: string;
  vcs: Array<UpdateStoredCredentialObjectDetails>;
}

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
  userId: string,
  storedIdentity: StoredIdentityObjectDetails
): Promise<Response> => {
  const apiEndpoint = await getEvcsApiEndpoint();
  const apiKey = await getEvcsApiKey();

  const requestObject: PersistStoredIdentity = {
    userId,
    si: storedIdentity,
  };

  return request(apiEndpoint)
    .post(EvcsEndpoints.IdentityEndpoint)
    .send(requestObject)
    .set("x-api-key", apiKey)
    .set("Accept", "*/*")
    .set("Content-Type", "application/json");
};

export const evcsPostCredentials = async (
  userId: string,
  credentials: StoredCredentialObjectDetails[],
  govukSigninJourneyId?: string
): Promise<Response> => {
  const apiEndpoint = await getEvcsApiEndpoint();
  const apiKey = await getEvcsApiKey();

  const requestObject: PersistUserVCs = {
    userId,
    vcs: credentials,
    govuk_signin_journey_id: govukSigninJourneyId || userId,
  };

  return request(apiEndpoint)
    .post(EvcsEndpoints.VcsEndpoint)
    .send(requestObject)
    .set("x-api-key", apiKey)
    .set("Accept", "*/*")
    .set("Content-Type", "application/json");
};

export const evcsPatchCredentials = async (
  userId: string,
  credentials: UpdateStoredCredentialObjectDetails[],
  govukSigninJourneyId?: string
): Promise<Response> => {
  const apiEndpoint = await getEvcsApiEndpoint();
  const apiKey = await getEvcsApiKey();

  const requestObject: UpdateUserVCs = {
    userId,
    vcs: credentials,
    govuk_signin_journey_id: govukSigninJourneyId || userId,
  };

  return request(apiEndpoint)
    .patch(EvcsEndpoints.VcsEndpoint)
    .send(requestObject)
    .set("x-api-key", apiKey)
    .set("Accept", "*/*")
    .set("Content-Type", "application/json");
};
