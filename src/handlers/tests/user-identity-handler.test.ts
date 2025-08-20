import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../user-identity-handler";
import { UserIdentityInput } from "../../types/interfaces";

describe("user-identity-handler tests", () => {
  it("should return am empty message", async () => {
    const testObject: UserIdentityInput = {
      govukSigninJourneyId: "j8mMnXW_rP6JqNXBKKf8xsGXttk121",
      vtr: ["P1", "P3"],
    };

    const result = handler({ body: JSON.stringify(testObject) } as APIGatewayProxyEvent);

    await expect(result).resolves.toEqual({ statusCode: 200, body: "" });
  });
});
