import mainPageTemplate from "./get-unrecoverable-error-page.njk";
import translations from "../../../../locales/en/translation.json" with { type: "json" };
import basePageTemplate from "../base.njk";

import { RequestHandler } from "express";
import { ContentIds } from "../analytics.js";

type PageInformation = {
  contentId: (typeof ContentIds)[keyof typeof ContentIds];
  status: number;
  translationIndex: keyof typeof translations.pages;
};

const PageInformationMap = new Map<string, PageInformation>([
  ["/error/bad-request", { status: 400, translationIndex: "unrecoverable", contentId: ContentIds.ErrorBadRequest }],
  ["/error/not-found", { status: 404, translationIndex: "notFound", contentId: ContentIds.ErrorNotFound }],
  [
    "/error/session-expired",
    { status: 401, translationIndex: "sessionExpired", contentId: ContentIds.ErrorSessionExpired },
  ],
  [
    "/error/unrecoverable",
    { status: 500, translationIndex: "unrecoverable", contentId: ContentIds.ErrorUnrecoverable },
  ],
]);

export const handler: RequestHandler = (request, response) => {
  const pageInformation = PageInformationMap.get(request.path);
  return response
    .header("content-type", "text/html")
    .status(pageInformation?.status || 500)
    .render(mainPageTemplate, {
      contentId: pageInformation?.contentId ?? ContentIds.ErrorUnrecoverable,
      translations: translations,
      basePageTemplate,
      ga4ContainerId: process.env.GOOGLE_ANALYTICS_4_GTM_CONTAINER_ID ?? "",
      page: pageInformation?.translationIndex ?? "unrecoverable",
    });
};
