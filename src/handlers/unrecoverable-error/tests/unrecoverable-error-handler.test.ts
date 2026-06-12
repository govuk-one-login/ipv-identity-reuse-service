import { afterEach, expect, it, vitest } from "vitest";
import { lambdaHandler } from "../unrecoverable-error-handler";

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
  const result = await lambdaHandler();

  expect(mockRender).toHaveBeenCalledExactlyOnceWith("index.njk", {
    assetPath: "/assets",
    rootPath: "",
  });

  expect(result).toEqual({
    body: "Rendered Unrecoverable Error Screen",
    headers: {
      "content-type": "text/html",
    },
    statusCode: 200,
  });
});

it("should catch unexpected errors and return a 500 status code", async () => {
  mockRender.mockImplementation(() => {
    throw new Error("Forced rendering error");
  });

  const response = await lambdaHandler();

  expect(response.statusCode).toBe(500);
  expect(response.body).toContain("");
  expect(mockRender).toHaveBeenCalled();
});
