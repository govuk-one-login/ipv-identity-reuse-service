Feature: UserIdentity Post

     Scenario: Happy Path - POST Request to UserIdentity endpoint returns a Success Response
          Given a valid bearer token
          When I send a POST request
          Then the status code should be 200
          Then The stored identity should be returned

    Scenario: Malformed bearer token yields 401 response
          Given a bad bearer token
          When I send a POST request
          Then the status code should be 401

    Scenario: Absent bearer token yields 401 response
          When I send a POST request
          Then the status code should be 401

    Scenario: Non present user data yields 404 response
          Given a absentee bearer token
          When I send a POST request
          Then the status code should be 404