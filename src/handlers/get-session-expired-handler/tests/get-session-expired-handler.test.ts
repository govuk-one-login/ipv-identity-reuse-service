import { afterEach, expect, it, vitest } from "vitest";
import { lambdaHandler } from "../get-session-expired-handler.js";
import translations from "../../../../locales/en/translation.json" with { type: "json" };

const { mockRender } = vitest.hoisted(() => {
  return {
    mockRender: vitest.fn().mockReturnValue("Rendered Session Expired Screen"),
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

it("should render the session expired screen", async () => {
  const result = await lambdaHandler();

  expect(mockRender).toHaveBeenCalledExactlyOnceWith(
    expect.toSatisfy((filename) => filename.endsWith("index.njk")),
    {
      assetPath: "/assets",
      rootPath: "",
      govukRebrand: true,
      translations,
    }
  );

  expect(result).toEqual({
    body: "Rendered Session Expired Screen",
    headers: {
      "content-type": "text/html",
    },
    statusCode: 401,
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
