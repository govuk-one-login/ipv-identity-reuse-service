declare module "@govuk-one-login/frontend-ui" {
  import type { HelmetOptions } from "helmet";
  export function getHelmetConfig(additions?: HelmetOptions): HelmetOptions;
}
