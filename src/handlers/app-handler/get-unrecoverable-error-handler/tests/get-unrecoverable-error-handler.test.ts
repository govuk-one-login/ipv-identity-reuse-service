import { expect, it, vi } from "vitest";
import { handler } from "../get-unrecoverable-error-handler.js";
import { createExpressRequest } from "../../tests/test-utilities.js";
import translations from "../../../../../locales/en/translation.json" with { type: "json" };

const INDEX_PATH_REGEX = /get-unrecoverable-error-page.njk$/;
const BASE_PATH_REGEX = /base.njk$/;

it.each(["/error/bad-request", "/error/unrecoverable"])("should render the error screen %s", async (url) => {
  const { request, response, next } = createExpressRequest({
    path: url,
    body: {},
    cookies: {},
  });

  vi.stubEnv("GOOGLE_ANALYTICS_4_GTM_CONTAINER_ID", "1234");

  handler(request, response, next);

  expect(response.header).toHaveBeenCalledWith("content-type", "text/html");
  expect(response.status).toHaveBeenCalledWith(500);
  expect(response.render).toHaveBeenCalledWith(expect.stringMatching(INDEX_PATH_REGEX), {
    basePageTemplate: expect.stringMatching(BASE_PATH_REGEX),
    ga4ContainerId: "1234",
    translations,
  });
});
