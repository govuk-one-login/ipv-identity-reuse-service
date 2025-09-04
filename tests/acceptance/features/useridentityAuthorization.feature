Feature: UserIdentity Post


     Scenario: Happy Path - POST Request to UserIdentity endpoint returns a Success Response
        Given I send a POST request with input value
        Then I should receive a success response    


    Scenario: POST Request to UserIdentity endpoint returns Internal Server error
        Given I send a POST request with malformed data
        Then I should receive a Internal Server error

   