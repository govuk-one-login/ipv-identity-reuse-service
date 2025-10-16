Feature: UserIdentity Post - Happy Path

  Scenario: A stored identity is not found for a user
    Given I have a user without a stored identity
    When I make a request for the users identity with a VTR "P2"
    Then the status code should be 404
    And the error should be "not_found"
    And the error description should be "No Stored Identity exists for this user or Stored Identity has been invalidated"

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

  Scenario: Correctly validates identity and processes VTR when VOT does not match
    Given a user has 4 CURRENT credentials stored
    And the user has a stored identity, with VOT "P2"
    When I make a request for the users identity with a VTR "P3"
    Then the status code should be 200
    And the stored identity should be returned
    And the stored identity content.vot should be "P0"
    And the stored identity VOT should be "P2"

  Scenario: A user does not have any stored credentials
    Given a user has 0 CURRENT credentials stored
    And the user has a stored identity, with VOT "P2"
    When I make a request for the users identity with a VTR "P2"
    Then the status code should be 200
    And the stored identity isValid field is false
    And the stored identity should be returned

  Scenario: A user's stored identity is missing a CURRENT credential
    Given a user has 4 CURRENT credentials stored
    And the user has a stored identity, with VOT "P2"
    And an extra CURRENT credential is stored for the user
    When I make a request for the users identity with a VTR "P2"
    Then the status code should be 200
    And the stored identity should be returned
    And the stored identity isValid field is false

  Scenario: A user's stored identity has additional credential
    Given a user has 4 CURRENT credentials stored
    And the user has a stored identity, with VOT "P2"
    And an existing CURRENT credential is marked as HISTORIC for the user
    When I make a request for the users identity with a VTR "P2"
    Then the status code should be 200
    And the stored identity should be returned
    And the stored identity isValid field is false


  Scenario: A request is made with an invalid kid, and kidValid is false
    Given I have a user with a Stored Identity, with "invalid" kid
    When I make a request for the users identity with a VTR "P2"
    Then the status code should be 200
    And the untrusted stored identity should be returned
    And the stored identity kidValid field is false
    And the stored identity signatureValid field is false

  Scenario: A request is made without a kid, and kidValid is false
    Given I have a user with a Stored Identity, with "no" kid
    When I make a request for the users identity with a VTR "P2"
    Then the status code should be 200
    And the untrusted stored identity should be returned
    And the stored identity kidValid field is false
    And the stored identity signatureValid field is false

  Scenario: A request is made with a forbidden kid, and kidValid is false
    Given I have a user with a Stored Identity, with "forbidden" kid
    When I make a request for the users identity with a VTR "P2"
    Then the status code should be 200
    And the untrusted stored identity should be returned
    And the stored identity kidValid field is false
    And the stored identity signatureValid field is false

  Scenario: A stored identity is returned for the user, and signatureValid is false
    Given I have a user with a Stored Identity, and an invalid signature
    When I make a request for the users identity with a VTR "P2"
    Then the status code should be 200
    And the untrusted stored identity should be returned
    And the stored identity kidValid field is true
    And the stored identity signatureValid field is false
