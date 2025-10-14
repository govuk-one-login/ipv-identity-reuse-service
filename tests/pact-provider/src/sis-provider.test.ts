import type { Server } from "http";
import { Verifier, type VerifierOptions } from "@pact-foundation/pact";
import { createServer as createProviderServer } from "./provider-app";
import path from "node:path";
import type { Configuration } from "../../../src/commons/configuration";
import type {
  CredentialStoreErrorResponse,
  CredentialStoreIdentityResponse,
} from "../../../src/credential-store/credential-store-identity-response";
import type { VerifiableCredentialJWT } from "../../../src/identity-reuse/verifiable-credential-jwt";
import { sign, getDefaultStoredIdentityHeader } from "../../../tests/acceptance/steps/utils/jwt-utils";

const PORT = 8080;

const validateEnvironment = () => {
  const environmentType = (process.env.PACT_TYPE || "file").toLowerCase();
  switch (environmentType) {
    case "server":
      if (!process.env.PACT_URL) {
        throw new Error("Environment variable PACT_URL must be defined for server");
      }
      if (!process.env.PACT_USER) {
        throw new Error("Environment variable PACT_USER must be defined for server");
      }
      if (!process.env.PACT_PASSWORD) {
        throw new Error("Environment variable PACT_PASSWORD must be defined for server");
      }
      if (!process.env.PACT_BROKER_SOURCE_SECRET) {
        throw new Error("Environment variable PACT_BROKER_SOURCE_SECRET must be defined for server");
      }
      break;
    case "file":
      // Nothing required
      break;
    default:
      throw new Error(`Environment variable PACT_TYPE can only be 'file' or 'server'`);
  }
};

const mockEVCSResponse = (
  response: CredentialStoreIdentityResponse | CredentialStoreErrorResponse,
  status: number = 200
) => {
  (global.fetch as jest.Mock) = jest.fn().mockResolvedValue(
    new Response(JSON.stringify(response), {
      status,
      headers: { "content-type": "application/json" },
    })
  );
};

jest.setTimeout(120000);

jest.mock("../../../src/commons/configuration", () => ({
  getConfiguration: jest.fn(() => Promise.resolve({ evcsApiUrl: "https://evcs.gov.uk" } as Configuration)),
  getServiceApiKey: jest.fn(() => Promise.resolve("an-api-key")),
}));

jest.mock("../../../src/identity-reuse/fraud-check-service", () => ({
  hasFraudCheckExpired: jest.fn(() => Promise.resolve(false)),
  getFraudVc: jest.requireActual("../../../src/identity-reuse/fraud-check-service").getFraudVc,
}));

describe("Sis Pact Verification", () => {
  let server: Server;

  beforeAll(() => {
    validateEnvironment();
    server = createProviderServer(PORT);
  });

  afterAll(() => {
    server?.close();
  });

  it("validates expectations of Stored Identity Service", async () => {
    const environmentType = (process.env.PACT_TYPE || "file").toLowerCase();

    let mockEVCSData: CredentialStoreIdentityResponse;

    const options: VerifierOptions = {
      provider: "SisProvider",
      providerBaseUrl: `http://127.0.0.1:${PORT}`,
      ...(environmentType === "server" && {
        pactBrokerUrl: `${process.env.PACT_URL}?testSource=${process.env.PACT_BROKER_SOURCE_SECRET}`,
        pactBrokerUsername: process.env.PACT_USER,
        pactBrokerPassword: process.env.PACT_PASSWORD,
      }),
      ...(environmentType === "file" && {
        pactUrls: [path.resolve(__dirname, "../../pact-consumer/pacts/SisConsumerTests-StoredIdentityService.json")],
      }),
      consumerVersionSelectors: [{ mainBranch: true }, { deployedOrReleased: true }, { latest: true }], // TODO: Look at this
      publishVerificationResult: process.env["PUBLISH_RESULT"]?.toLowerCase() === "true",
      logLevel: "warn",
      providerVersion: process.env["PROVIDER_APP_VERSION"]! || "1.0.0",
      providerVersionBranch: process.env["GIT_BRANCH"] || "none",
      beforeEach: async (): Promise<unknown> => {
        mockEVCSData = createCredentialStoreIdentityResponse();
        mockEVCSResponse(mockEVCSData);

        return {};
      },
      stateHandlers: {
        "[P1, P2] and test-gov-journey-id are valid but record was not found": async () => {
          mockEVCSResponse({ message: "not found" }, 404);
        },
        "[P1, P2] and test-gov-journey-id are valid": async () => {},
        "A request returns 500": async () => {
          mockEVCSResponse({ message: "internal server error" }, 500);
        },
        "A request returns at least P2 vot": async () => {
          // Do nothing, already returns P2 vot
        },
        "Malformed response is missing vtr": async () => {
          // Do nothing, the response never has vtr
        },
        "Request is missing mandatory field vtr": async () => {
          // Do nothing, schema validator should handle it
        },
        "test-expired-access-token is expired bearer token": async () => {
          mockEVCSResponse({ message: "unauthorized" }, 403);
        },
        "test-invalid-access-token is invalid bearer token": async () => {
          return {
            authorization: "test-invalid-access-token",
          };
        },
      },
    };

    await new Verifier(options).verifyProvider();
  });
});

const createCredentialStoreIdentityResponse = (
  verifiableCredentialStates: { vc: VerifiableCredentialJWT; state: string }[] = []
): CredentialStoreIdentityResponse => {
  const storedIdentity = {
    sub: "user-sub",
    vot: "P2",
    iss: "http://api.example.com",
    vtm: ["https://oidc.account.gov.uk/trustmark"],
  };

  const defaultStoredIdentityHeader = getDefaultStoredIdentityHeader();

  return {
    si: {
      state: "CURRENT",
      vc: sign(defaultStoredIdentityHeader, storedIdentity),
      metadata: null,
    },
    vcs: verifiableCredentialStates.map((vcState) => {
      return { state: vcState.state, vc: sign(defaultStoredIdentityHeader, vcState.vc), metadata: null };
    }),
  };
};
