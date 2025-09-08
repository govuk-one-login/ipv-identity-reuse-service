Feature: UserIdentity Post


     Scenario: Happy Path - POST Request to UserIdentity endpoint returns a Success Response
        Given I send a POST request with input value
        Then I should receive a success response    


    Scenario: POST Request to UserIdentity endpoint returns Bad Request
        Given I send a POST request with malformed data
        Then I should receive a Bad Request

   Scenario: POST Request to UserIdentity endpoint returns Unauthorized
        Given I send a POST request without authorization header
        Then I should receive Unauthorized