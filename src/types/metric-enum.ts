export enum MetricName {
  AccessTokenValidationFailure = "AccessTokenValidationFailure",
  AccessTokenValidationSuccessful = "AccessTokenValidationSuccessful",
  MessagesReceived = "MessagesReceived",
  IdentityInvalidatedOnIntervention = "IdentityInvalidatedOnIntervention",
  IdentityDoesNotExist = "IdentityDoesNotExist",
}

export enum MetricDimension {
  InterventionCode = "InterventionCode",
  Reason = "Reason",
}
