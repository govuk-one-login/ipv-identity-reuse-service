/**
 * Message from TXMA service
 */
export type TxmaMessage = {
  /**
   * This is the CommonSubjectID (i.e. the internal version of the pairwiseid)
   * of the user in the relevant part of the system.
   */
  user_id: string;
  /**
   * Records the time and date of when the event occurred.
   */
  timestamp: number;
  /**
   * The code of the type of intervention that was applied to the account
   */
  intervention_code: string;
};

/**
 * Test whether the value is a string and has length. If both conditions are
 * satisfied casts value to a string.
 * @param value The value to test
 * @returns true if value is a string
 */
const isStringWithLength = (value: unknown): value is string => typeof value === "string" && value.length > 0;

/**
 * Tests whether the message is a valid TXMA message where it contains each of the required fields
 * @param request - The TXMA message
 * @returns true if this is a TXMA message and casts it to a TxmaMessage object
 */
export const isTxmaMessage = (request: Record<string, string | number>): request is TxmaMessage =>
  request &&
  isStringWithLength(request.user_id) &&
  typeof request.timestamp === "number" &&
  isStringWithLength(request.intervention_code);
