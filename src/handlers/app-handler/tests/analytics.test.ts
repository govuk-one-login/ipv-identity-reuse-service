import { expect, it } from "vitest";
import { ContentIds } from "../analytics.js";

it("should have unique values", () => {
  const keys = Object.keys(ContentIds);
  const values = new Set(Object.values(ContentIds));

  expect(keys).toHaveLength(values.size);
});
