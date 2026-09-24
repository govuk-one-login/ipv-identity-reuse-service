import { describe, expect, it } from "vitest";
import type { EVCSIdentityResponse } from "../../../api/evcs-api.js";
import { createStoredIdentityHash } from "../stored-identity-hashing.js";

const BASE_TEST_RESPONSE: EVCSIdentityResponse = Object.freeze({
  si: Object.freeze({
    vc: "si-header.si-body.si-signature",
    unsignedVot: "P3",
  }),
  vcs: [
    Object.freeze({
      state: "CURRENT",
      vc: "vc1-header.vc1-body.vc1-signature",
    }),
  ],
});

describe("createStoredIdentityHash", () => {
  it("should hash the stored identity object, vcs and vot", () => {
    const response: EVCSIdentityResponse = { ...BASE_TEST_RESPONSE };
    expect(createStoredIdentityHash(response)).toEqual(
      "883342abfe62a0ddfddc267cdcfcc0dd2834dd7c11c0b6721ecaab5b590da4d8"
    );
  });

  it("should produce a different hash when different stored identity", () => {
    const response: EVCSIdentityResponse = {
      ...BASE_TEST_RESPONSE,
      si: {
        ...BASE_TEST_RESPONSE.si,
        vc: "si1-header.si1-body.si1-signature",
      },
    };
    expect(createStoredIdentityHash(response)).toEqual(
      "c57cfacf324c408f2e8188f68c44b1e2799847149156383be0cd2d5d2ce4c206"
    );
  });

  it("should produce a different hash when different vot", () => {
    const response: EVCSIdentityResponse = { ...BASE_TEST_RESPONSE, si: {
      ...BASE_TEST_RESPONSE.si, unsignedVot: "P2",
    } };
    expect(createStoredIdentityHash(response)).toEqual(
      "ffe84162fdbabd8c86e49bad2d46beeaa9df75adf7330e7ed7cf6bcecddb5f1d"
    );
  });

  it("should produce a different hash when no vcs", () => {
    const response: EVCSIdentityResponse = { ...BASE_TEST_RESPONSE, vcs: [] };
    expect(createStoredIdentityHash(response)).toEqual(
      "63d05aefe5c26b56b715bf88c9ad2e9ce2765c94a1332a35a2215b8641624a8b"
    );
  });

  it("should produce a different hash when more vcs", () => {
    const response: EVCSIdentityResponse = {
      ...BASE_TEST_RESPONSE,
      vcs: [
        ...BASE_TEST_RESPONSE.vcs,
        {
          state: "CURRENT",
          vc: "vc2-header.vc2-body.vc2-signature",
        },
      ],
    };
    expect(createStoredIdentityHash(response)).toEqual(
      "cb6794ed4b7a5b90360a81102d5af05f400fc77bdabe2da72fb4010ad02173a3"
    );
  });
});
