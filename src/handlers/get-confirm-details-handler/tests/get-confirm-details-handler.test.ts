import { afterEach, describe, expect, it, Mock, vi } from "vitest";
import { lambdaHandler } from "../get-confirm-details-handler";
import { APIGatewayProxyEvent } from "aws-lambda";
import {
  getUserIdFromJwt,
  handleGetIdentityFromCredentialStore,
  validateIdentityRecords,
} from "../../../commons/validate-records";
import { CredentialStoreError } from "../../../commons/errors";
import { HttpCodesEnum } from "../../../commons/constants";

const mockRender = vi.hoisted(() => vi.fn().mockReturnValue("Rendered Confirm Details Screen"));

vi.mock("nunjucks", () => ({
  default: {
    configure: vi.fn(() => ({ render: mockRender })),
  },
}));

vi.mock("../../../commons/validate-records", () => ({
  getUserIdFromJwt: vi.fn().mockReturnValue("user-sub"),
  handleGetIdentityFromCredentialStore: vi.fn(),
  validateIdentityRecords: vi.fn(),
}));

const validEvent = () =>
  ({
    queryStringParameters: { redirect_uri: "https://example.com", state: "state-id", client_id: "client" },
    headers: { Authorization: "Bearer good.token.sig" },
  }) as never as APIGatewayProxyEvent;

afterEach(() => {
  vi.clearAllMocks();
});

it("should render the confirm details screen when all query string parameters are provided", async () => {
  (validateIdentityRecords as Mock).mockResolvedValue({ kidValid: true, signatureValid: true, isValid: true });
  const result = await lambdaHandler(validEvent());

  expect(mockRender).toHaveBeenCalledExactlyOnceWith(
    expect.toSatisfy((filename) => filename.endsWith("index.njk")),
    {
      assetPath: "./assets",
      redirect_uri: "https://example.com",
      state: "state-id",
      rootPath: ".",
      client_id: "client",
    }
  );

  expect(result).toEqual({
    body: "Rendered Confirm Details Screen",
    headers: {
      "content-type": "text/html",
    },
    statusCode: 200,
  });
});

it("should return an error when some required query string parameters are missing", async () => {
  await expect(
    lambdaHandler({
      queryStringParameters: {
        code: "1234",
        state: "state-id",
      },
    } as never as APIGatewayProxyEvent)
  ).rejects.toMatchObject({
    message: "One or more required query string parameters are undefined or empty",
  });
});

it("should return an error when some required query string parameters are empty", async () => {
  await expect(
    lambdaHandler({
      queryStringParameters: {
        redirect_uri: "",
        code: "2468",
        state: "",
      },
    } as never as APIGatewayProxyEvent)
  ).rejects.toMatchObject({
    message: "One or more required query string parameters are undefined or empty",
  });
});

describe("handler record validation", () => {
  it("renders confirm-details page when all records are valid and validated", async () => {
    (validateIdentityRecords as Mock).mockResolvedValue({ kidValid: true, signatureValid: true, isValid: true });
    const result = await lambdaHandler(validEvent());
    expect(mockRender).toHaveBeenCalledWith(expect.stringContaining("index.njk"), expect.any(Object));
    expect(result.statusCode).toBe(200);
  });

  it.each([
    { kidValid: false, signatureValid: true, isValid: true },
    { kidValid: false, signatureValid: false, isValid: true },
    { kidValid: false, signatureValid: true, isValid: false },
  ])("returns failure response when validation fails (%o)", async (verdict) => {
    (validateIdentityRecords as Mock).mockResolvedValue(verdict);
    const result = await lambdaHandler(validEvent());
    expect(result).toEqual({ statusCode: 500, body: "" });
  });

  it("returns an error when Authorization header missing", async () => {
    const result = await lambdaHandler({
      queryStringParameters: { redirect_uri: "test.com", state: "state", client_id: "client_id" },
      headers: {},
    } as never as APIGatewayProxyEvent);
    expect(getUserIdFromJwt).not.toHaveBeenCalled();
    expect(handleGetIdentityFromCredentialStore).not.toHaveBeenCalled();
    expect(mockRender).not.toHaveBeenCalled();
    expect(result).toEqual({ statusCode: 500, body: "" });
  });

  it("returns a failure response when the EVCS call fails", async () => {
    (handleGetIdentityFromCredentialStore as Mock).mockRejectedValue(
      new CredentialStoreError(HttpCodesEnum.INTERNAL_SERVER_ERROR, "user-id")
    );
    const result = await lambdaHandler(validEvent());
    expect(validateIdentityRecords).not.toHaveBeenCalled();
    expect(mockRender).not.toHaveBeenCalled();
    expect(result).toEqual({ statusCode: 500, body: "" });
  });
});
