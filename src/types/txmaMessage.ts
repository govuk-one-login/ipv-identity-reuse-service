import { isStringWithLength } from "./stringutils";

export type TxmaMessage = {
  user_id: string;
  timestamp: number;
  intervention_code?: string;
};

export const isTxmaMessage = (request: Record<string, string | number>): request is TxmaMessage =>
  request && isStringWithLength(request.user_id) && typeof request.timestamp === "number";
