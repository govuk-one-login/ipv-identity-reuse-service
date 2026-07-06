Feature: authorization-workflow.feature

  Scenario: I should be able to complete an authorization flow and request my user-identity
    Given a user has a profile
    When the client calls the authorize endpoint, with the redirect URI "https://api.example.com" and state "sample-state"
    Then the user will be redirected to the confirm details page
    When the user clicks Continue
    Then the user will be redirected to the client's redirect URI with an authorization code
    When the client calls the token endpoint with the authorization code
    Then the client will be issued with an authorization token
    When the client calls the user-identity endpoint with the authorization token
    Then the user-identity will be returned to the client
