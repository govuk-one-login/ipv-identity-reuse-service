import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import logger from "../../commons/logger";

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  logger.addContext(context);

  return {
    statusCode: 200,
    body: JSON.stringify({
      sub: "urn:fdc:gov.uk:2022:TEST_USER-7B96ScRg2a-k7fN-u-sZbEjbB3hQ6gf6SM0x",
      iss: "http://api.example.com",
      credentials: ["sample-credential-id"],
      vot: "P2",
      vtm: "https://oidc.account.gov.uk/trustmark",
    }),
  };
};
