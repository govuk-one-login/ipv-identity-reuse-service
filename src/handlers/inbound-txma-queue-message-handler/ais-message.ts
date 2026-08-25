import { isStringWithLength } from "../../commons/string-utilities";
import { InterventionCodeEnum } from "@govuk-one-login/event-catalogue/SIS_IDENTITY_RECORD_INVALIDATED";

export type AisMessage = {
  user_id: string;
  timestamp: number;
  intervention_code?: InterventionCodeEnum;
};

export const isAisMessage = (request: Record<string, string | number>): request is AisMessage =>
  request && isStringWithLength(request.user_id) && typeof request.timestamp === "number";
