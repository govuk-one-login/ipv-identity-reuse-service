Feature: Logging in

  Scenario: Entering a correct password
    Given I have previously created a password
    When I enter my password correctly
    Then I should be granted access

  Scenario: Entering a incorrect password
    Given I have previously created a password
    When I enter my password incorrectly
    Then I should not be granted access
