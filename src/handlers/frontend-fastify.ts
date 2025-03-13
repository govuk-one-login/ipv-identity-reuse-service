import awsLambdaFastify from '@fastify/aws-lambda';
import app from '../ui/app'
import {APIGatewayProxyEventV2, Context} from "aws-lambda";

const proxy = awsLambdaFastify(app)
exports.handler = async (event: APIGatewayProxyEventV2, context: Context) => proxy(event, context);
