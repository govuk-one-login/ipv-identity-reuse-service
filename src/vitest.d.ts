import "vitest";
import { CustomMatcher } from "aws-sdk-client-mock-vitest";

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Matchers<T = any> extends CustomMatcher<T> {
    toHaveEmittedEMFWith: (obj: unknown) => R;
    toHaveEmittedMetricWith: (obj: unknown) => R;
  }
}
