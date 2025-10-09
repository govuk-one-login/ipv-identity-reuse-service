Feature: UserIdentity Post - Happy Path

  Scenario: A stored identity is returned for the user
    Given a user has 4 CURRENT credentials stored
    And the user has a stored identity, with VOT "P2"
    When I make a request for the users identity with a VTR "P2"
    Then the status code should be 200
    And the stored identity should be returned
    And the stored identity isValid field is true
    And the stored credentials should be returned

  Scenario Outline: Correctly validates identity and processes vtr
    Given a user has 4 CURRENT credentials stored
    And the user has a stored identity, with VOT "<vot>"
    When I make a request for the users identity with a VTR "<vtr>"
    Then the status code should be 200
    And the stored identity should be returned
    And the stored identity content.vot should be "<expectedVot>"
    And the stored identity VOT should be "<vot>"
    And the stored identity isValid field is true
    And the stored credentials should be returned

    Examples:
      | vot | vtr   | expectedVot |
      | P2  | P1    | P1          |
      | P2  | P1,P2 | P2          |
      | P1  | P1,P2 | P1          |
      | P3  | P2    | P2          |
      | P2  | P2,P3 | P2          |
      | P3  | P2    | P2          |
      | P3  | P2,P3 | P3          |
      | P2  | P2,P3 | P2          |
