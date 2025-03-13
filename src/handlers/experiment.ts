import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import nunjucks from 'nunjucks';

nunjucks.configure([ 
    "/opt/govuk-frontend/dist" 
]);

const sampleTemplate = `
    {% extends "govuk/template.njk" %}
    `;

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        return {
            statusCode: 200,
            body: nunjucks.renderString(sampleTemplate, { assetPath: "https://design-system.service.gov.uk/assets" }),
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
