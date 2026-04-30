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

it("should show the confirm details screen", async () => {
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
