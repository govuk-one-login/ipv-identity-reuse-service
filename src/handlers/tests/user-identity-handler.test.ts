import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../user-identity-handler";
import { UserIdentityInput } from "../../types/interfaces";
import { HttpCodesEnum } from "../../types/constants";

describe("user-identity-handler tests", () => {
  it("should return Success", async () => {
    const testObject: UserIdentityInput = {
      govukSigninJourneyId: "j8mMnXW_rP6JqNXBKKf8xsGXttk121",
      vtr: ["P1", "P2"],
    };
    const result = handler({ body: JSON.stringify(testObject) } as APIGatewayProxyEvent);
    await expect(result).resolves.toEqual({
      statusCode: HttpCodesEnum.OK,
      body: JSON.stringify({ message: "Request Success" }),
    });
  });

  it("should return bad Request", async () => {
    const result = handler({ body: "dummy data" } as APIGatewayProxyEvent);
    await expect(result).resolves.toEqual({
      statusCode: HttpCodesEnum.BAD_REQUEST,
      body: JSON.stringify({ message: "Event body is not valid JSON" }),
    });
  });
});
