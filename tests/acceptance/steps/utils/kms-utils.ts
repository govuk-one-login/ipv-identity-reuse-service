import { CompactJWSHeaderParameters } from "jose";
import { KMSClient, SignCommand, SigningAlgorithmSpec } from "@aws-sdk/client-kms";
import { getDidSigningKeyAlias } from "./ssm-utils";

const kmsClient = new KMSClient({ region: process.env.AWS_REGION });

const b64u = (v: Uint8Array | string) =>
  Buffer.from(typeof v === "string" ? v : v)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const derToJose = (der: Uint8Array, size: number) => {
  let o = 0;
  if (der[o++] !== 0x30) throw new Error("bad der");
  o++;
  if (der[o++] !== 0x02) throw new Error("bad der r");
  const rLen = der[o++];
  let r = der.slice(o, o + rLen);
  o += rLen;
  if (der[o++] !== 0x02) throw new Error("bad der s");
  const sLen = der[o++];
  let s = der.slice(o, o + sLen);
  if (r[0] === 0x00 && r.length > 1) r = r.slice(1);
  if (s[0] === 0x00 && s.length > 1) s = s.slice(1);
  if (r.length > size || s.length > size) throw new Error("bad len");
  const out = new Uint8Array(size * 2);
  out.set(r, size - r.length);
  out.set(s, size * 2 - s.length);
  return out;
};

export async function signKms<BodyT extends object>(
  body: BodyT,
  protectedHeader: CompactJWSHeaderParameters
): Promise<string> {
  const alg = protectedHeader.alg;
  if (alg !== "ES256" && alg !== "RS256") {
    throw new Error(`Unsupported alg for KMS: ${alg}`);
  }

  const headerB64 = b64u(JSON.stringify(protectedHeader));
  const payloadB64 = b64u(JSON.stringify(body));
  const signingInput = `${headerB64}.${payloadB64}`;

  const kmsAlg = alg === "ES256" ? "ECDSA_SHA_256" : "RSASSA_PKCS1_V1_5_SHA_256";

  const resp = await kmsClient.send(
    new SignCommand({
      KeyId: await getDidSigningKeyAlias(),
      Message: new TextEncoder().encode(signingInput),
      MessageType: "RAW",
      SigningAlgorithm: kmsAlg as SigningAlgorithmSpec,
    })
  );
  if (!resp.Signature) throw new Error("KMS returned no signature");

  const sigBytes = alg === "ES256" ? derToJose(resp.Signature as Uint8Array, 32) : (resp.Signature as Uint8Array);

  const sigB64 = b64u(sigBytes);
  return `${signingInput}.${sigB64}`;
}
