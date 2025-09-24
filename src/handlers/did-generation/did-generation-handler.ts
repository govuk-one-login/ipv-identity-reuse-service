import logger from "../../commons/logger";
import { DIDDocument } from "did-resolver";
import { getKmsPublicKey } from "../../services/did-generation-service";
import { APIGatewayProxyResult } from "aws-lambda";

import { binaryPkToJwk, updateJwk } from "../../utils/helper";
export const handler = async (): Promise<APIGatewayProxyResult> => {
  logger.debug("Received message");
  const alg = "ES256";
  const publicKeyData = await getKmsPublicKey(process.env.DID_SIGNING_KEY_ARN);
  let jwk = await binaryPkToJwk(publicKeyData.publicKey, alg);
  jwk = updateJwk(jwk, { alg });
  const didDocument: DIDDocument = {
    id: publicKeyData.keyId,
    assertionMethod: [
      {
        type: "JsonWebKey",
        id: "did:web:identity.dev.account.gov.uk#" + publicKeyData.keyId,
        controller: "did:web:identity.dev.account.gov.uk",
        publicKeyJwk: jwk,
      },
    ],
  };
  return { statusCode: 200, body: JSON.stringify(didDocument) };
};
