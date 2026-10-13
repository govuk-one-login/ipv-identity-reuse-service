import { createHash } from "node:crypto";

export const sha256Hash = (value: string): string => {
  return createHash("sha256").update(value).digest("hex");
};
