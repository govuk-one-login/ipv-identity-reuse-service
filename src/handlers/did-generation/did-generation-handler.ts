import { DIDDocument } from "did-resolver";
import { getKmsPublicKey } from "../../services/did-generation-service";
import { APIGatewayProxyResult } from "aws-lambda";
import { binaryPkToJwk, updateJwk } from "../../utils/helper";
import logger from "../../commons/logger";

export const handler = async (): Promise<APIGatewayProxyResult> => {
  const alg = "ES256";
  const publicKeyData = await getKmsPublicKey(process.env.DID_SIGNING_KEY_ARN);
  try {
    let jwk = await binaryPkToJwk(publicKeyData.publicKey, alg);
    jwk = updateJwk(jwk, { alg });
    const didDocument: DIDDocument = {
      "@context": ["https://www.w3.org/ns/did/v1", "https://w3id.org/security/jwk/v1"],
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
  } catch (error) {
    logger.error("Error whilst decoding Bearer token body");
    return {
      statusCode: 500,
      body: JSON.stringify(error),
    };
  }
};
