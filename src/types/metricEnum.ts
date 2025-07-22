export const MetricName = {
  /**
   * The count of messages received by the service
   */
  MessagesReceived: "MessagesReceived",
  /**
   * The count of identities invalidated
   */
  IdentityInvalidatedOnIntervention: "IdentityInvalidatedOnIntervention",
  /**
   * The requested identity does not exist
   */
  IdentityDoesNotExist: "IdentityDoesNotExist",
} as const;

export const MetricDimension = {
  /**
   * The intervention code
   */
  InterventionCode: "InterventionCode",
} as const;
