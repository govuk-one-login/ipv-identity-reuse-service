import { HttpCodesEnum } from "../../../commons/constants";
import { DIDDocument } from "did-resolver";
import { handler } from "../did-generation-handler";
import { mockClient } from "aws-sdk-client-mock";
import { GetPublicKeyCommand, KMSClient } from "@aws-sdk/client-kms";
import { mockPkUnit8Array, TEST_SET_SIGNING_KMS_KEY_ARN } from "../../../commons/test-constants";

describe("did-generation-handler tests", () => {
  const mockKMSClient = mockClient(KMSClient);
  mockKMSClient.on(GetPublicKeyCommand).resolves({
    PublicKey: mockPkUnit8Array,
    KeyId: TEST_SET_SIGNING_KMS_KEY_ARN,
  });
  it("should return 200 when did signing Key is returned", async () => {
    const result = await handler();
    expect(result.statusCode).toBe(HttpCodesEnum.OK);
    const didDoc = JSON.parse(result.body) as DIDDocument;
    expect(didDoc.id).toBe("3a502a70-6b3b-4b65-bf74-23da88cc9a6");
  });

  it("should return 400 bad request when incorrect config data is passed", async () => {
    const mockPkUnit8ArrayWithInvalidData = new Uint8Array([1]);
    mockKMSClient.on(GetPublicKeyCommand).resolves({
      PublicKey: mockPkUnit8ArrayWithInvalidData,
      KeyId: "testPublicKeyId",
    });
    const result = await handler();
    expect(result.statusCode).toBe(HttpCodesEnum.INTERNAL_SERVER_ERROR);
  });
});
