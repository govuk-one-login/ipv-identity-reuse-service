import mainPageTemplate from "./get-session-expired-page.njk";
import translations from "../../../../locales/en/translation.json" with { type: "json" };
import basePageTemplate from "../base.njk";

import { RequestHandler } from "express";

export const handler: RequestHandler = (request, response) =>
  response
    .header("content-type", "text/html")
    .status(401)
    .render(mainPageTemplate, {
      translations,
      basePageTemplate,
      ga4ContainerId: process.env.GOOGLE_ANALYTICS_4_GTM_CONTAINER_ID ?? "",
    });
