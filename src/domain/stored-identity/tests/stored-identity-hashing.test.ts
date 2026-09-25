import { describe, expect, it } from "vitest";
import { createStoredIdentityHash } from "../stored-identity-hashing.js";

const STORED_IDENTITY_JWT = "si-header.si-body.si-signature";
const STORED_IDENTITY_VOT = "P3";
const STORED_IDENTITY_VC_1 = "vc1-header.vc1-body.vc1-signature";
const STORED_IDENTITY_VC_2 = "vc2-header.vc2-body.vc2-signature";

describe("createStoredIdentityHash", () => {
  it("should hash the stored identity object, vcs and vot", () => {
    expect(createStoredIdentityHash(STORED_IDENTITY_JWT, STORED_IDENTITY_VOT, [STORED_IDENTITY_VC_1])).toEqual(
      "883342abfe62a0ddfddc267cdcfcc0dd2834dd7c11c0b6721ecaab5b590da4d8"
    );
  });

  it("should produce a different hash when different stored identity", () => {
    expect(
      createStoredIdentityHash("si-other-header.si-other-body.si-other-signature", STORED_IDENTITY_VOT, [
        STORED_IDENTITY_VC_1,
      ])
    ).toEqual("e932fe846ec9cce35f83a1aaff57c47ac535c87f8f0b1c359483446b5e7feb5e");
  });

  it("should produce a different hash when different vot", () => {
    expect(createStoredIdentityHash(STORED_IDENTITY_JWT, "P2", [STORED_IDENTITY_VC_1])).toEqual(
      "ffe84162fdbabd8c86e49bad2d46beeaa9df75adf7330e7ed7cf6bcecddb5f1d"
    );
  });

  it("should produce a different hash when no vcs", () => {
    expect(createStoredIdentityHash(STORED_IDENTITY_JWT, STORED_IDENTITY_VOT, [])).toEqual(
      "63d05aefe5c26b56b715bf88c9ad2e9ce2765c94a1332a35a2215b8641624a8b"
    );
  });

  it("should produce a different hash when more vcs", () => {
    expect(
      createStoredIdentityHash(STORED_IDENTITY_JWT, STORED_IDENTITY_VOT, [STORED_IDENTITY_VC_1, STORED_IDENTITY_VC_2])
    ).toEqual("cb6794ed4b7a5b90360a81102d5af05f400fc77bdabe2da72fb4010ad02173a3");
  });

  it("should produce same result if vcs in different order", () => {
    expect(
      createStoredIdentityHash(STORED_IDENTITY_JWT, STORED_IDENTITY_VOT, [STORED_IDENTITY_VC_2, STORED_IDENTITY_VC_1])
    ).toEqual("cb6794ed4b7a5b90360a81102d5af05f400fc77bdabe2da72fb4010ad02173a3");
  });
});
