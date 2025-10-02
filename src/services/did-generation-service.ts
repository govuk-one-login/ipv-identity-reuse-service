import * as AWS from "@aws-sdk/client-kms";
import { GetPublicKeyCommand } from "@aws-sdk/client-kms";

export const getKmsPublicKey = async (keyArn: string): Promise<{ keyId: string; publicKey: Uint8Array }> => {
  const getPublicKeyCommand = new GetPublicKeyCommand({
    KeyId: keyArn,
  });
  const kmsClient = new AWS.KMS({ region: process.env.AWS_REGION });
  const keyResult = await kmsClient.send(getPublicKeyCommand);
  if (!keyResult.KeyId || !keyResult.PublicKey) {
    throw new Error("Retrieved key either had KeyId or PublicKey not set");
  }
  return {
    keyId: extractKeyIdFromKMSArn(keyResult.KeyId),
    publicKey: keyResult.PublicKey,
  };
};

const extractKeyIdFromKMSArn = (kmsArn: string) => {
  if (!kmsArn?.includes("/")) {
    return kmsArn;
  }

  return kmsArn.split("/")[1];
};
