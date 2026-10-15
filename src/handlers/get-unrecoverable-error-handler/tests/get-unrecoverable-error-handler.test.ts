import { afterEach, expect, it, vitest } from "vitest";
import { lambdaHandler } from "../get-unrecoverable-error-handler.js";
import { APIGatewayProxyEvent, Context } from "aws-lambda";

const { mockRender } = vitest.hoisted(() => {
  return {
    mockRender: vitest.fn().mockReturnValue("Rendered Unrecoverable Error Screen"),
  };
});

vitest.mock("nunjucks", () => {
  return {
    default: {
      configure: vitest.fn().mockImplementation(() => ({
        render: mockRender,
      })),
    },
    configure: vitest.fn().mockImplementation(() => ({
      render: mockRender,
    })),
  };
});

afterEach(() => {
  vitest.clearAllMocks();
});

it("should render the error screen", async () => {
  const response = await lambdaHandler(createResourceRequest("/error/unrecoverable"), {} as Context);

  expect(mockRender).toHaveBeenCalledExactlyOnceWith(
    expect.toSatisfy((filename) => filename.endsWith("index.njk")),
    {
      assetPath: "/assets",
      baseUrl: "/error/unrecoverable",
      rootPath: "",
      govukRebrand: true,
    }
  );

  expect(response).toEqual({
    body: "Rendered Unrecoverable Error Screen",
    headers: {
      "content-type": "text/html",
    },
    statusCode: 500,
  });
});

it("should catch unexpected errors and return a 500 status code", async () => {
  mockRender.mockImplementation(() => {
    throw new Error("Forced rendering error");
  });

  const response = await lambdaHandler(createResourceRequest("/error/unrecoverable"), {} as Context);

  expect(response.statusCode).toBe(500);
  expect(response.body).toContain("");
  expect(mockRender).toHaveBeenCalled();
});

const createResourceRequest = (
  resource: "/error/bad-request" | "/error/unrecoverable" | (string & {})
): APIGatewayProxyEvent =>
  ({
    resource,
  }) as never as APIGatewayProxyEvent;
