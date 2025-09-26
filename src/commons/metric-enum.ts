export const MetricName = {
  MessagesReceived: "MessagesReceived",
  IdentityInvalidatedOnIntervention: "IdentityInvalidatedOnIntervention",
  IdentityDoesNotExist: "IdentityDoesNotExist",
} as const;

export const MetricDimension = {
  InterventionCode: "InterventionCode",
} as const;
