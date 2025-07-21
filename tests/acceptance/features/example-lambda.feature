Feature: Example Lambda

    Scenario: Lambda returns not data
        Given I have the Lambda with resource name "MessageProcessorLambda"
        When I call the Lambda
        Then it will return null
