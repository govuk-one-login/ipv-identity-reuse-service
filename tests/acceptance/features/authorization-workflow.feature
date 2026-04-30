Feature: authorization-workflow.feature

  Scenario: I should be able to complete an authorization flow and request my user-identity
    Given I have a user profile
    When I call the authorize endpoint, with the redirect URI "https://api.example.com"
    Then I will be issued with an authorization code and redirected to the confirm details page
    When I call the token endpoint with the authorization code
    Then I will be issued with an authorization token
    When I call the user-identity endpoint
    Then I will be issued with my user-identity
