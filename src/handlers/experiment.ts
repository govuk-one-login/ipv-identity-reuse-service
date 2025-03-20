import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import nunjucks from 'nunjucks';
import sampleTemplate from './index.njk';
import fs from 'fs';

nunjucks.configure([ 
    "/opt/govuk-frontend/dist" 
]);

const sampleTemplateContents = fs.readFileSync(sampleTemplate, 'utf8');

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        return {
            statusCode: 200,
            body: nunjucks.renderString(sampleTemplateContents, { 
                assetPath: "v1/assets",
                rootPath: "v1",
            }),
            headers: {
                "content-type": "text/html"
            }
        };
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: err,
            }),
        };
    }
};
