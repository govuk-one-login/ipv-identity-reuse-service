import { VerifiableCredentialJWT } from "./verifiable-credential-types.js";
import { getJwtBody } from "../../utilities/jwt-utilities.js";

export const parseVerifiableCredentials = (vcJwts: string[]): VerifiableCredentialJWT[] => {
  return vcJwts.map((vcJwt) => getJwtBody<VerifiableCredentialJWT>(vcJwt));
};
