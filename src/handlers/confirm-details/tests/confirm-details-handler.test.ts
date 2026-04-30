import { afterEach, beforeAll, expect, it, vitest } from "vitest";
import { lambdaHandler } from "../confirm-details-handler";
import { APIGatewayProxyEvent } from "aws-lambda";

const mockRender = vitest.hoisted(() => vitest.fn().mockReturnValue("Rendered Confirm Details Screen"));

vitest.mock("nunjucks", () => ({
  default: {
    configure: vitest.fn(() => ({ render: mockRender })),
  },
}));

beforeAll(() => {
  vitest.stubEnv("DOMAIN_NAME", "https://example.com");
});

afterEach(() => {
  vitest.clearAllMocks();
});

it("should render the confirm details screen when all query string parameters are provided", async () => {
  const result = await lambdaHandler({
    queryStringParameters: {
      redirect_uri: "https://example.com",
      code: "1234",
      state: "state-id",
    },
  } as never as APIGatewayProxyEvent);

  expect(mockRender).toHaveBeenCalledExactlyOnceWith("index.njk", {
    assetPath: "./assets",
    redirect_uri: "https://example.com",
    code: "1234",
    state: "state-id",
    rootPath: ".",
  });

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
