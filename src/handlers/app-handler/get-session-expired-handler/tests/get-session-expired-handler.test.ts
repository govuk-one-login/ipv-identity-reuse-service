import { expect, it } from "vitest";
import { handler } from "../get-session-expired-handler.js";
import { createExpressRequest } from "../../tests/test-utilities.js";
import translations from "../../../../../locales/en/translation.json" with { type: "json" };

const INDEX_PATH_REGEX = /index.njk$/;

it("should render the session expired screen", async () => {
  const { request, response, next } = createExpressRequest({
    body: {},
    cookies: {},
  });

  handler(request, response, next);

  expect(response.header).toHaveBeenCalledWith("content-type", "text/html");
  expect(response.status).toHaveBeenCalledWith(500);
  expect(response.render).toHaveBeenCalledWith(expect.stringMatching(INDEX_PATH_REGEX), {
    assetPath: "./assets",
    rootPath: "",
    govukRebrand: true,
    translations,
  });
});
