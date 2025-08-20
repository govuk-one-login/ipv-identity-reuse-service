
import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../stored-identity-invalidator-handler";

describe('stored-identity-invalidator-handler', () => {
  it('should return am empty message', async () => {
    const testObject: UserIdentityInput = {
      govukSigninJourneyId: 'j8mMnXW_rP6JqNXBKKf8xsGXttk121',
      vtr: [P1, P3],
    };

    const result = handler({ body: JSON.stringify(testObject) } as APIGatewayProxyEvent);

    await expect(result).resolves.toEqual({ statusCode: 202, body: '' });
  });
});
