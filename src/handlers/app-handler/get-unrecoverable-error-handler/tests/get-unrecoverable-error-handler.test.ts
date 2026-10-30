import { expect, it } from "vitest";
import { handler } from "../get-unrecoverable-error-handler.js";
import { createExpressRequest } from "../../tests/test-utilities.js";
import translations from "../../../../../locales/en/translation.json" with { type: "json" };

const INDEX_PATH_REGEX = /index.njk$/;

it.each(["/error/bad-request", "/error/unrecoverable"])("should render the error screen %s", async (url) => {
  const { request, response, next } = createExpressRequest({
    path: url,
    body: {},
    cookies: {},
  });

  handler(request, response, next);

  expect(response.header).toHaveBeenCalledWith("content-type", "text/html");
  expect(response.status).toHaveBeenCalledWith(500);
  expect(response.render).toHaveBeenCalledWith(expect.stringMatching(INDEX_PATH_REGEX), {
    assetPath: "./assets",
    baseUrl: "/",
    rootPath: "",
    govukRebrand: true,
    translations,
  });
});
