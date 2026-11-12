import { getHelmetConfig } from "@govuk-one-login/frontend-ui";

export const helmetConfiguration = getHelmetConfig({
  contentSecurityPolicy: {
    directives: {
      styleSrc: ["'self'", (_request, response) => `'nonce-${response.locals.cspNonce}'`],
    },
  },
});
