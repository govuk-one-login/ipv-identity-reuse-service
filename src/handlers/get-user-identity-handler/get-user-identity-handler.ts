import { APIGatewayProxyEventBase, APIGatewayProxyResult, Context } from "aws-lambda";
import logger from "../../utilities/logger.js";
import { GetUserIdentityResponse } from "./get-user-identity-types.js";
import {
  getSignedStoredIdentity,
  getStoredIdentityRecordBody,
} from "../../domain/stored-identity/stored-identity-validator.js";
import { getSessionDetails, GetSessionSuccessResponse, deleteSession } from "../../api/oauth-internal-api.js";
import { StoredIdentityRecord } from "../../domain/stored-identity/stored-identity-types.js";
import { validateStoredIdentityAndVotByHash } from "../../domain/stored-identity/stored-identity-hashing.js";
import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials.js";
import { UserIdentityError } from "../../utilities/errors.js";
import { APIGatewayAuthorizerResultContext } from "aws-lambda/common/api-gateway.js";
import { getConfiguration } from "../../configuration/configuration.js";
import { ReturnCode, VerifiableCredentialJWT } from "../../domain/verifiable-credential/verifiable-credential-types.js";
import { getReturnCodes } from "../../domain/verifiable-credential/security-check.js";
import { parseVerifiableCredentials } from "../../domain/verifiable-credential/credential-decoder.js";

export const handler = async (
  event: APIGatewayProxyEventBase<APIGatewayAuthorizerResultContext>,
  context: Context
): Promise<APIGatewayProxyResult> => {
  logger.addContext(context);

  try {
    const sessionId = event.requestContext.authorizer.sessionId;
    if (!sessionId || typeof sessionId !== "string") {
      logger.error("No sessionId found in authorizer context");
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "No sessionId found in authorizer context" }),
      };
    }

    const { storedIdentityRecord, calculatedVot, signedCredentials, unsignedCredentials } =
      await getStoredIdentity(sessionId);
    const configuration = await getConfiguration();
    const returnCodes: ReturnCode[] = getReturnCodes(unsignedCredentials, configuration);

    const responseBody: GetUserIdentityResponse = {
      sub: storedIdentityRecord.sub,
      vot: calculatedVot,
      vtm: configuration.vtm,
      "https://vocab.account.gov.uk/v1/credentialJWT": signedCredentials,
      "https://vocab.account.gov.uk/v1/returnCode": returnCodes,
      ...storedIdentityRecord.claims,
    };

    await deleteSession(sessionId);

    return {
      statusCode: 200,
      body: JSON.stringify(responseBody),
    };
  } catch (error) {
    logger.error("Error met when creating user identity", { cause: error });
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error instanceof Error ? error.message : "Error met when creating user identity",
      }),
    };
  }
};

const getStoredIdentity = async (sessionId: string): Promise<StoredIdentity> => {
  const session: GetSessionSuccessResponse = await getSessionDetails(sessionId);
  const evcsAccessToken = session.storageAccessToken;
  const sessionIdentityHash = session.sessionData?.storedIdentitySha256;
  const sessionVot = session.sessionData?.vot;

  if (!evcsAccessToken) {
    throw new UserIdentityError("Unable to fetch EVCS access token from session");
  } else if (!sessionIdentityHash) {
    throw new UserIdentityError("Unable to fetch storedIdentitySha256 from session");
  } else if (!sessionVot) {
    throw new UserIdentityError("Unable to fetch calculated vot from session");
  }

  const signedStoredIdentity = await getSignedStoredIdentity(`Bearer ${evcsAccessToken}`);

  if (!signedStoredIdentity) {
    throw new UserIdentityError("Stored identity not found in EVCS");
  }

  validateStoredIdentityAndVotByHash(signedStoredIdentity, sessionVot, sessionIdentityHash);

  const storedIdentityRecord: StoredIdentityRecord = getStoredIdentityRecordBody(
    signedStoredIdentity.signedStoredIdentityRecord
  );

  return {
    storedIdentityRecord,
    calculatedVot: sessionVot,
    signedCredentials: signedStoredIdentity.signedCredentials,
    unsignedCredentials: parseVerifiableCredentials(signedStoredIdentity.signedCredentials),
  };
};

interface StoredIdentity {
  storedIdentityRecord: StoredIdentityRecord;
  calculatedVot: IdentityVectorOfTrust;
  signedCredentials: string[];
  unsignedCredentials: VerifiableCredentialJWT[];
}
