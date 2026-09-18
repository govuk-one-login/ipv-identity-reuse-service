export enum MetricName {
  AccessTokenValidationFailure = "AccessTokenValidationFailure",
  AccessTokenValidationSuccessful = "AccessTokenValidationSuccessful",
  MessagesReceived = "MessagesReceived",
  IdentityInvalidatedOnIntervention = "IdentityInvalidatedOnIntervention",
  IdentityDoesNotExist = "IdentityDoesNotExist",
  IdentityReuseValidation = "IdentityReuseValidation",
}

export enum MetricDimension {
  InterventionCode = "InterventionCode",
  Reason = "Reason",
  FraudCheckExpired = "FraudCheckExpired",
  DrivingLicenceExpired = "DrivingLicenceExpired",
  VotSufficient = "VotSufficient",
}
