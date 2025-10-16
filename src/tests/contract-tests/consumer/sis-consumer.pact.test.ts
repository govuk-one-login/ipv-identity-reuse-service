import path from "path";
import { PactV4, SpecificationVersion, MatchersV3 } from "@pact-foundation/pact";
import type { UserIdentityResponseMetadata } from "../../../handlers/user-identity/user-identity-response-metadata";

const { like } = MatchersV3;

const USER_IDENTITY_ENDPOINT = "/user-identity";

const provider = new PactV4({
  consumer: "SisConsumerTests",
  provider: "StoredIdentityService",
  logLevel: "warn",
  dir: path.resolve(process.cwd(), "pacts"),
  spec: SpecificationVersion.SPECIFICATION_VERSION_V4,
  host: "127.0.0.1",
});

describe("SIS Consumer", () => {
  it("should return 200 if the stored identity exists", async () => {
    const govukSigninJourneyId = "Test-" + Date.now();

    await provider
      .addInteraction()
      .given("stored identity exists")
      .uponReceiving("A userId for a stored identity that does not exist")
      .withRequest("POST", USER_IDENTITY_ENDPOINT, (builder) => {
        builder.headers({
          Authorization: like(`Bearer test-access-token`),
        });
        builder.jsonBody({
          vtr: ["P2"],
          govukSigninJourneyId,
        });
      })
      .willRespondWith(200, (builder) => {
        builder.jsonBody(
          like({
            content: {
              sub: "user-sub",
              vot: "P2",
              iss: "http://api.example.com",
              vtm: ["https://oidc.account.gov.uk/trustmark"],
              credentials: [],
            },
            vot: "P2",
            isValid: false,
            expired: false,
            kidValid: true,
            signatureValid: true,
          })
        );
      })
      .executeTest(async (mockServer) => {
        const result = await fetch(`${mockServer.url}${USER_IDENTITY_ENDPOINT}`, {
          method: "POST",
          body: JSON.stringify({
            vtr: ["P2"],
            govukSigninJourneyId,
          }),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer test-access-token`,
          },
        });
        await expect(result.json()).resolves.toMatchObject<UserIdentityResponseMetadata>({
          content: {
            sub: "user-sub",
            vot: "P2",
            iss: "http://api.example.com",
            vtm: ["https://oidc.account.gov.uk/trustmark"],
            credentials: [],
          },
          vot: "P2",
          isValid: false,
          expired: false,
          kidValid: true,
          signatureValid: true,
        });
      });
  });
});
