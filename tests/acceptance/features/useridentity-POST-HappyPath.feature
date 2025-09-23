Feature: UserIdentity Post - Happy Path

  Scenario: A stored identity is returned for the user
    Given I have a user with a Stored Identity and 0 credentials
    When I make a request for the users identity
    Then the status code should be 200
    And the stored identity should be returned
    And the stored credentials should be returned

  Scenario: A stored identity is returned for the user
    Given I have a user with a Stored Identity and 4 credentials
    When I make a request for the users identity
    Then the status code should be 200
    And the stored identity should be returned
    And the stored credentials should be returned
