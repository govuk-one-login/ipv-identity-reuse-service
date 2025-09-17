Feature: UserIdentity Post - Happy Path

  Scenario: A stored identity is not found for a user
    Given I have a user without a stored identity
    When I make a request for the users identity
    Then the status code should be 404
    And the error should be "not_found"
    And the error description should be "No Stored identity exists for this user"

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
