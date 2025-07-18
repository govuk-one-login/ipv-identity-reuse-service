export const MetricEnum = {
  /**
   * The count of messages received by the service
   */
  MessagesReceived: "MessagesReceived",
  /**
   * The count of identities invalidated
   */
  IdentityInvalidatedOnIntervention: "IdentityInvalidatedOnIntervention",
} as const;

export const MetricDimension = {
  /**
   * The intervention code
   */
  InterventionCode: "InterventionCode",
} as const;
