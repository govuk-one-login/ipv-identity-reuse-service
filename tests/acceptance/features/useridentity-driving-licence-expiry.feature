Feature: UserIdentity Driving Licence Expiry Check

  Scenario: Record is not expired when DCMAW VC has driving permit with future expiry date
    Given the user has a DCMAW driving permit credential with licence expiry in the future and VC nbf 3 months ago
    And the user has a fraud check credential with nbf 3 months ago
    And the user has a stored identity, with VOT "P2"
    When I make a request for the users identity with a VTR "P2"
    Then the status code should be 200
    And the stored identity should be returned
    And the stored identity expired field is false
    And the stored identity isValid field is true

  Scenario: Record is not expired when DCMAW VC uses passport instead of driving permit
    Given the user has a DCMAW passport credential with VC nbf 3 months ago
    And the user has a fraud check credential with nbf 3 months ago
    And the user has a stored identity, with VOT "P2"
    When I make a request for the users identity with a VTR "P2"
    Then the status code should be 200
    And the stored identity should be returned
    And the stored identity expired field is false
    And the stored identity isValid field is true

  Scenario: Record is not expired when driving licence was expired at issuance but VC is within 180 days
    Given the user has a DCMAW driving permit credential with licence expired before VC issuance and VC nbf 3 months ago
    And the user has a fraud check credential with nbf 3 months ago
    And the user has a stored identity, with VOT "P2"
    When I make a request for the users identity with a VTR "P2"
    Then the status code should be 200
    And the stored identity should be returned
    And the stored identity expired field is false
    And the stored identity isValid field is true

  Scenario: Record is expired when driving licence was expired at issuance and VC is older than 180 days
    Given the user has a DCMAW driving permit credential with licence expired before VC issuance and VC nbf 7 months ago
    And the user has a fraud check credential with nbf 3 months ago
    And the user has a stored identity, with VOT "P2"
    When I make a request for the users identity with a VTR "P2"
    Then the status code should be 200
    And the stored identity should be returned
    And the stored identity expired field is true
    And the stored identity isValid field is true
