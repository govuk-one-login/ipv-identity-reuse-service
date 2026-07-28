Feature: UserIdentity Get - Unhappy path (unauthorized) tests

  Scenario: A user does not include an Authorization header
    Given I make a request for the user identity without Authorization header
    Then the status code should be 401
    And the message should be "Unauthorized"

  Scenario: A user has invalid Authorization header
    Given I make a request for the user identity with Authorization header without a Bearer token
    Then the status code should be 401
    And the message should be "Unauthorized"

  Scenario: A user has invalid Authorization header
    Given I make a request for the user identity with Authorization header with invalid Bearer token
    Then the status code should be 401
    And the message should be "Unauthorized"
