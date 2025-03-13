import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import nunjucks from 'nunjucks';

nunjucks.configure([ 
    "/opt/govuk-frontend/dist" 
]);

const sampleTemplate = `
    {% extends "govuk/template.njk" %}
    {% block head %}
      <link rel="stylesheet" href="{{ assetPath | default("/assets", true) }}/../stylesheets/govuk-frontend-5.9.0.min.css">
    {% endblock %}
    {% block content %}
    <h1 class="govuk-heading-xl">Hello world</h1>
    {% endblock %}

    {% block bodyEnd %}
    {# Run JavaScript at end of the <body>, to avoid blocking the initial render. #}
    <script type="module" src="{{ assetPath | default("/assets", true) }}/javascripts/govuk-frontend-5.9.0.min.js"></script>
    <script type="module">
        import { initAll } from '{{ assetPath | default("/assets", true) }}/javascripts/govuk-frontend-5.9.0.min.js'
        initAll()
    </script>
    {% endblock %}
    `;

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        return {
            statusCode: 200,
            body: nunjucks.renderString(sampleTemplate, { assetPath: "Stage/assets" }),
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
