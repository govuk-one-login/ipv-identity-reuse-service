import { HttpCodesEnum } from "../../../commons/constants";
import { DIDDocument } from "did-resolver";
import { handler } from "../did-generation-handler";
import { mockClient } from "aws-sdk-client-mock";
import { GetPublicKeyCommand, KMSClient } from "@aws-sdk/client-kms";
import { MOCKPKUNIT8ARRAY, TEST_SET_SIGNING_KMS_KEY_ARN } from "../../../commons/test-constants";

describe("did-generation-handler", () => {
  const mockKMSClient = mockClient(KMSClient);
  mockKMSClient.on(GetPublicKeyCommand).resolves({
    PublicKey: MOCKPKUNIT8ARRAY,
    KeyId: TEST_SET_SIGNING_KMS_KEY_ARN,
  });
  it("should return 200 when did signing Key is returned", async () => {
    const result = await handler();
    expect(result.statusCode).toBe(HttpCodesEnum.OK);
    const didDoc = JSON.parse(result.body) as DIDDocument;
    const expectedDidDoc = {
      "@context": ["https://www.w3.org/ns/did/v1", "https://w3id.org/security/jwk/v1"],
      assertionMethod: [
        {
          controller: "did:web:identity.dev.account.gov.uk",
          id: "did:web:identity.dev.account.gov.uk#3a502a70-6b3b-4b65-bf74-23da88cc9a6",
          publicKeyJwk: {
            alg: "ES256",
            crv: "P-256",
            kty: "EC",
            x: "fcPprXcw221JjYP1DFqdQqBiYehunRH298KVwvGuncM",
            y: "9UfK1ob5KCAilm6MoQ7rk5jG71AxKWF8jEvn3FRCnng",
          },
          type: "JsonWebKey",
        },
      ],
      id: "3a502a70-6b3b-4b65-bf74-23da88cc9a6",
    };
    expect(didDoc).toStrictEqual(expectedDidDoc);
  });

  it("should return 500 Error When exception occurrs in key generation", async () => {
    const mockPkUnit8ArrayWithInvalidData = new Uint8Array([1]);
    mockKMSClient.on(GetPublicKeyCommand).resolves({
      PublicKey: mockPkUnit8ArrayWithInvalidData,
      KeyId: "testPublicKeyId",
    });
    const result = await handler();
    expect(result.statusCode).toBe(HttpCodesEnum.INTERNAL_SERVER_ERROR);
  });
});
