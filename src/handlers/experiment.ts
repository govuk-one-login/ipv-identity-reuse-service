import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import nunjucks from 'nunjucks';

nunjucks.configure([ 
    "/opt/govuk-frontend/dist" 
]);

const sampleTemplate = `
    {% extends "govuk/template.njk" %}
    {% block head %}
      <link rel="stylesheet" href="{{ rootPath | default("", true) }}/govuk-frontend-5.9.0.min.css">
      <base href="./v1" />
    {% endblock %}
    {% block content %}
    <h1 class="govuk-heading-xl">Hello world</h1>
    {% endblock %}

    {% block bodyEnd %}
    {# Run JavaScript at end of the <body>, to avoid blocking the initial render. #}
    <script type="module" src="{{ rootPath | default("", true) }}/govuk-frontend-5.9.0.min.js"></script>
    <script type="module">
        import { initAll } from '{{ rootPath | default("", true) }}/govuk-frontend-5.9.0.min.js'
        initAll()
    </script>
    {% endblock %}
    `;

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        return {
            statusCode: 200,
            body: nunjucks.renderString(sampleTemplate, { 
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
