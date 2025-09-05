import { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "../user-identity-handler";
import { UserIdentityInput } from "../../types/interfaces";
import { HttpCodesEnum } from "../../types/constants";

describe("user-identity-handler tests", () => {
  const event = () => {
    return {
      headers: {
        accept: "*/*",
        Host: "stack-name.credential-store.dev.account.gov.uk",
        "X-Amzn-Trace-Id": "Root=1-666bf197-43c06e88748f092a5cc812a9",
        "x-api-key": "a-pretend-api-key-value",
        "X-Forwarded-For": "123.123.123.123",
        "X-Forwarded-Port": "443",
        "X-Forwarded-Proto": "https",
      },
      body: {},
    } as unknown as APIGatewayProxyEvent;
  };
  const testObject: UserIdentityInput = {
    govukSigninJourneyId: "j8mMnXW_rP6JqNXBKKf8xsGXttk121",
    vtr: ["P1", "P2"],
  };
  const newEvent: any = event();
  it("should return Success", async () => {
    newEvent.headers["Authorization"] = "Bearer 123";
    newEvent.body = testObject;
    const result = handler(newEvent as APIGatewayProxyEvent);
    await expect(result).resolves.toEqual({
      statusCode: HttpCodesEnum.OK,
      body: JSON.stringify({ message: "Request Success" }),
    });
  });

  it("should return bad Request", async () => {
    newEvent.body = "";
    const result = handler(newEvent as APIGatewayProxyEvent);
    await expect(result).resolves.toEqual({
      statusCode: HttpCodesEnum.BAD_REQUEST,
      body: JSON.stringify({ message: "Invalid Request" }),
    });
  });

  it("should return Unauthorised", async () => {
    newEvent.headers["Authorization"] = "";
    newEvent.body = testObject;
    const result = handler(newEvent as APIGatewayProxyEvent);
    await expect(result).resolves.toEqual({
      statusCode: HttpCodesEnum.UNAUTHORIZED,
      body: JSON.stringify({ message: "Request Unauthorized" }),
    });
  });
});
