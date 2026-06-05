import "vitest";
import { CustomMatcher } from "aws-sdk-client-mock-vitest";

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Matchers<T = any> extends CustomMatcher<T> {
    toHaveEmittedEMFWith: (object: unknown) => R;
    toHaveEmittedMetricWith: (object: unknown) => R;
  }
}
