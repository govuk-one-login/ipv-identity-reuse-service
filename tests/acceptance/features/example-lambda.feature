Feature: Example Lambda

    Scenario: Lambda returns "Hello, World!"
        Given I have the Lambda with resource name "ExampleLambda"
        When I call the Lambda
        Then it will return the string "\"Hello, world!\""
