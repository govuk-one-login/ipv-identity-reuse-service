export enum MetricName {
  AccessTokenValidationFailure = "AccessTokenValidationFailure",
  AccessTokenValidationSuccessful = "AccessTokenValidationSuccessful",
  MessagesReceived = "MessagesReceived",
  IdentityInvalidatedOnIntervention = "IdentityInvalidatedOnIntervention",
  IdentityDoesNotExist = "IdentityDoesNotExist",
  IdentityReuseValidation = "IdentityReuseValidation",
}

export enum MetricDimension {
  DrivingLicenceExpired = "DrivingLicenceExpired",
  FraudCheckExpired = "FraudCheckExpired",
  InterventionCode = "InterventionCode",
  Reason = "Reason",
  SecurityCheckPresent = "SecurityCheckPresent",
  VotSufficient = "VotSufficient",
}
