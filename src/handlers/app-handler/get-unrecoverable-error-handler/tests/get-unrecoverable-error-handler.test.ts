import { beforeEach, expect, it, vi } from "vitest";
import { handler } from "../get-unrecoverable-error-handler.js";
import { createExpressRequest } from "../../tests/test-utilities.js";
import translations from "../../../../../locales/en/translation.json" with { type: "json" };
import { ContentIds } from "../../analytics.js";

const INDEX_PATH_REGEX = /get-unrecoverable-error-page.njk$/;
const BASE_PATH_REGEX = /base.njk$/;

beforeEach(() => {
  vi.stubEnv("GOOGLE_ANALYTICS_4_GTM_CONTAINER_ID", "1234");
});

it.each([
  ["/error/bad-request", ContentIds.ErrorBadRequest, 400, "unrecoverable"],
  ["/error/not-found", ContentIds.ErrorNotFound, 404, "notFound"],
  ["/error/session-expired", ContentIds.ErrorSessionExpired, 401, "sessionExpired"],
  ["/error/unrecoverable", ContentIds.ErrorUnrecoverable, 500, "unrecoverable"],
])("should render the error screen %s", async (url, contentId, status, page) => {
  const { request, response, next } = createExpressRequest({
    path: url,
    body: {},
    cookies: {},
  });

  handler(request, response, next);

  expect(response.header).toHaveBeenCalledWith("content-type", "text/html");
  expect(response.status).toHaveBeenCalledWith(status);
  expect(response.render).toHaveBeenCalledWith(expect.stringMatching(INDEX_PATH_REGEX), {
    basePageTemplate: expect.stringMatching(BASE_PATH_REGEX),
    contentId,
    ga4ContainerId: "1234",
    page,
    translations,
  });
});

it("should default to unrecoverable if the path is not recognised", () => {
  const { request, response, next } = createExpressRequest({
    path: "/error/foobar",
    body: {},
    cookies: {},
  });

  handler(request, response, next);

  expect(response.header).toHaveBeenCalledWith("content-type", "text/html");
  expect(response.status).toHaveBeenCalledWith(500);
  expect(response.render).toHaveBeenCalledWith(expect.stringMatching(INDEX_PATH_REGEX), {
    basePageTemplate: expect.stringMatching(BASE_PATH_REGEX),
    contentId: ContentIds.ErrorUnrecoverable,
    ga4ContainerId: "1234",
    page: "unrecoverable",
    translations,
  });
});
