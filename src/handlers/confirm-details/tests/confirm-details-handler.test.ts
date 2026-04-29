import { afterEach, beforeAll, expect, it, vitest } from "vitest";
import { lambdaHandler } from "../confirm-details-handler";
import { APIGatewayProxyEvent } from "aws-lambda";
import nunjucks from "nunjucks";
import confirmDetailsPageTemplate from "../index.njk";
import fs from "node:fs";

const confirmDetailsPageTemplateContents = fs.readFileSync(confirmDetailsPageTemplate, "utf8");

vitest.mock("nunjucks", () => ({
  default: {
    configure: vitest.fn(),
    renderString: vitest.fn().mockReturnValue("Rendered Confirm Details Screen"),
  },
}));

beforeAll(() => {
  vitest.stubEnv("DOMAIN_NAME", "https://example.com");
});

afterEach(() => {
  vitest.clearAllMocks();
});

it("should show the confirm details screen", async () => {
  const renderString = vitest.spyOn(nunjucks, "renderString");
  const result = await lambdaHandler({
    queryStringParameters: {
      redirect_uri: "https://example.com",
      code: "1234",
      state: "state-id",
    },
  } as never as APIGatewayProxyEvent);

  expect(renderString).toHaveBeenCalledExactlyOnceWith(confirmDetailsPageTemplateContents, {
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
