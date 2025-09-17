Feature: UserIdentity Post - Happy Path

  Scenario: A stored identity is not found for a user
    Given I have a user without a stored identity
    When I make a request for the users identity
    Then the status code should be 404

  Scenario: A user does not include an Authorization header
    Given I have a user without a stored identity
    When I make a request for the users identity without Authorization header
    Then the status code should be 401

  Scenario: A user has invalid Authorization header
    Given I have a user without a stored identity
    When I make a request for the users identity with invalid Authorization header
    Then the status code should be 401
