Feature: UserIdentity Fraud Check Expiry

  Scenario: Record is not expired when fraud check is within validity period
    Given the user has a fraud check credential with nbf 5 months ago
    And the user has a stored identity, with VOT "P2"
    When I make a request for the users identity with a VTR "P2"
    Then the status code should be 200
    And the stored identity should be returned
    And the stored identity expired field is false
    And the stored identity isValid field is true

  Scenario: Record is expired when fraud check is at validity threshold
    Given the user has a fraud check credential with nbf 6 months ago
    And the user has a stored identity, with VOT "P2"
    When I make a request for the users identity with a VTR "P2"
    Then the status code should be 200
    And the stored identity should be returned
    And the stored identity expired field is true
    And the stored identity isValid field is true

  Scenario: Record is expired when fraud check is beyond validity period
    Given the user has a fraud check credential with nbf 7 months ago
    And the user has a stored identity, with VOT "P2"
    When I make a request for the users identity with a VTR "P2"
    Then the status code should be 200
    And the stored identity should be returned
    And the stored identity expired field is true
    And the stored identity isValid field is true

  Scenario: Fraud check for international address is not expired regardless of age
    Given the user has a fraud check credential with nbf 12 months ago and failed fraudCheck "applicable_authoritative_source"
    And the user has a stored identity, with VOT "P2"
    When I make a request for the users identity with a VTR "P2"
    Then the status code should be 200
    And the stored identity should be returned
    And the stored identity expired field is true
    And the stored identity isValid field is true

  Scenario: Fraud check from Fraud Resilience forces stored identity to be expired
    Given the user has a fraud check credential with nbf 1 months ago and failed fraudCheck "available_authoritative_source"
    And the user has a stored identity, with VOT "P2"
    When I make a request for the users identity with a VTR "P2"
    Then the status code should be 200
    And the stored identity should be returned
    And the stored identity expired field is true
    And the stored identity isValid field is true

  Scenario: Record is expired when no fraud check credential exists
    Given a user has 1 CURRENT credentials stored
    And the user has a stored identity, with VOT "P2"
    When I make a request for the users identity with a VTR "P2"
    Then the status code should be 200
    And the stored identity should be returned
    And the stored identity expired field is true
    And the stored identity isValid field is true
