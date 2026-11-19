import mainPageTemplate from "./get-unrecoverable-error-page.njk";
import translations from "../../../../locales/en/translation.json" with { type: "json" };
import basePageTemplate from "../base.njk";

import { RequestHandler, Request } from "express";
import { ContentIds } from "../analytics.js";

type PageInformation = {
  status: number;
  translationIndex: string;
};

const PageInformationMap = new Map<string, PageInformation>([
  ["/error/bad-request", { status: 500, translationIndex: "badRequest" }],
  ["/error/not-found", { status: 404, translationIndex: "badRequest" }],
  ["/error/session-expired", { status: 500, translationIndex: "badRequest" }],
  ["/error/unrecoverable:", { status: 500, translationIndex: "badRequest" }],
]);

export const handler: RequestHandler = (request, response) => {
  const pageInformation = PageInformationMap.get(request.path);
  return response
    .header("content-type", "text/html")
    .status(pageInformation?.status || 500)
    .render(mainPageTemplate, {
      translations,
      basePageTemplate,
      ga4ContainerId: process.env.GOOGLE_ANALYTICS_4_GTM_CONTAINER_ID ?? "",
      contentId: getContentId(request),
    });
};

const getContentId = (request: Request) => {
  switch (request.path) {
    case "/error/unrecoverable": {
      return ContentIds.ErrorUnrecoverable;
    }
    case "/error/bad-request": {
      return ContentIds.ErrorBadRequest;
    }
  }
  return "";
};
