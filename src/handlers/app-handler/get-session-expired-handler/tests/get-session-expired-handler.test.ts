import { expect, it, vi } from "vitest";
import { handler } from "../get-session-expired-handler.js";
import { createExpressRequest } from "../../tests/test-utilities.js";
import translations from "../../../../../locales/en/translation.json" with { type: "json" };
import { ContentIds } from "../../analytics.js";

const INDEX_PATH_REGEX = /get-session-expired-page.njk$/;
const BASE_PATH_REGEX = /base.njk$/;

it("should render the session expired screen", async () => {
  const { request, response, next } = createExpressRequest({
    body: {},
    cookies: {},
  });

  vi.stubEnv("GOOGLE_ANALYTICS_4_GTM_CONTAINER_ID", "1234");

  handler(request, response, next);

  expect(response.header).toHaveBeenCalledWith("content-type", "text/html");
  expect(response.status).toHaveBeenCalledWith(401);
  expect(response.render).toHaveBeenCalledWith(expect.stringMatching(INDEX_PATH_REGEX), {
    basePageTemplate: expect.stringMatching(BASE_PATH_REGEX),
    contentId: ContentIds.ErrorSessionExpired,
    ga4ContainerId: "1234",
    translations,
  });
});
