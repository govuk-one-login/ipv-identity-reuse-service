Feature: UserIdentity Post - Happy Path

  Scenario: A stored identity is not found for a user
    Given I have a user without a stored identity
    When I make a request for the users identity with a VTR "P2"
    Then the status code should be 404
    And the error should be "not_found"
    And the error description should be "No Stored Identity exists for this user or Stored Identity has been invalidated"

  Scenario: A user does not include an Authorization header
    Given I have a user without a stored identity
    When I make a request for the users identity without Authorization header
    Then the status code should be 401
    And the error should be "invalid_token"
    And the error description should be "Bearer token is missing or invalid"

  Scenario: A user has invalid Authorization header
    Given I have a user without a stored identity
    When I make a request for the users identity with invalid Authorization header
    Then the status code should be 401
    And the error should be "invalid_token"
    And the error description should be "Bearer token is missing or invalid"

  Scenario: Correctly validates identity and processes VTR when VOT does not match
    And I have a user with a Stored Identity, with VOT "P2" and 4 credentials
    When I make a request for the users identity with a VTR "P3"
    Then the status code should be 200
    And the stored identity should be returned
    And the stored identity content.vot should be "P0"
    And the stored identity VOT should be "P2"
    And the stored credentials should be returned

  Scenario: A user does not have any stored credentials
    Given I have a user with a Stored Identity, with VOT "P2" and 0 credentials
    When I make a request for the users identity with a VTR "P2"
    Then the status code should be 200
    And the stored identity isValid field is false
    And the stored identity should be returned
    And the stored credentials should be returned
