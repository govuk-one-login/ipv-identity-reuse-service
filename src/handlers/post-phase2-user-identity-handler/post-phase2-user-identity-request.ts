import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials.js";

export type UserIdentityRequest = {
  vtr: IdentityVectorOfTrust[];
  govukSigninJourneyId: string;
};
