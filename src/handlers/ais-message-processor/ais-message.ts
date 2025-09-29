import { isStringWithLength } from "../../commons/string-utils";

export type AisMessage = {
  user_id: string;
  timestamp: number;
  intervention_code?: string;
};

export const isAisMessage = (request: Record<string, string | number>): request is AisMessage =>
  request && isStringWithLength(request.user_id) && typeof request.timestamp === "number";
