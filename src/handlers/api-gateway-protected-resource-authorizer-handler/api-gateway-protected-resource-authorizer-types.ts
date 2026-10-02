import { APIGatewayAuthorizerResultContext } from "aws-lambda/common/api-gateway.js";

export interface AuthorizerContext extends APIGatewayAuthorizerResultContext {
  sessionId: string;
  subjectId?: string;
  storageToken?: string;
}
