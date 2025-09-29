import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials";

export type UserIdentityRequest = {
  vtr: IdentityVectorOfTrust;
  govukSigninJourneyId: string;
};
