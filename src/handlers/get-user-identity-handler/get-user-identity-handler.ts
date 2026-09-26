import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import logger from "../../commons/logger.js";
import { GetUserIdentityResponse } from "./get-user-identity-types.js";

const VTM = "https://oidc.account.gov.uk/trustmark";

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  logger.addContext(context);

  const responseBody: GetUserIdentityResponse = {
    sub: "urn:fdc:gov.uk:2022:TEST_USER-7B96ScRg2a-k7fN-u-sZbEjbB3hQ6gf6SM0x",
    vot: "P2",
    vtm: VTM,
    "https://vocab.account.gov.uk/v1/credentialJWT": ["sample-credential-id"],
    "https://vocab.account.gov.uk/v1/returnCode": [],
    "https://vocab.account.gov.uk/v1/coreIdentity": { name: [], birthDate: [] },
    "https://vocab.account.gov.uk/v1/address": [],
  };

  return {
    statusCode: 200,
    body: JSON.stringify(responseBody),
  };
};
