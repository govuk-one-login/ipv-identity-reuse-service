import fastify, { FastifyInstance } from 'fastify';
import { Logger } from '@aws-lambda-powertools/logger';
import { FastifyRequest, FastifyReply } from 'fastify';
import path from 'node:path';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'url';
import * as fs from "node:fs";


let dirname: string;
try {
  dirname = __dirname;
} catch {
  const filePath = fileURLToPath(import.meta.url);
  dirname = path.dirname(filePath);
}

const logger = new Logger();
const app: FastifyInstance = fastify();

app.register(fastifyStatic, {
  root: path.join(dirname, '/assets'),
  prefix: '/assets/',
});

app.get('/assets/:name', (req, res) => {
  // @ts-ignore
  const { name } = req.params;
  const stream = fs.createReadStream(dirname + '/assets/' + name);
  let type = 'text'
  if (name.endsWith('.css')) {
    type = 'text/css';
  } else if (name.endsWith('.js')) {
    type = 'text/javascript';
  }
  res.type(type).send(stream)
});

app.get('/favicon.ico', (req, res) => {
  // @ts-ignore
  const { name } = req.params;
  const stream = fs.createReadStream(dirname + '/assets/images/favicon.ico');
  res.send(stream)
});

app.get('/', (request, reply) => {
  reply.type('text/html').send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>GOV.UK Frontend Example</title>
      <link href="/assets/govuk-frontend.min.css" rel="stylesheet">
    </head>
    <body class="govuk-template__body">
    <div class="max-w-7xl mx-auto "><div class="relative flex items-center justify-between h-16"><div class="flex-1 flex items-center justify-center sm:items-stretch sm:justify-start"><div class="flex-shrink-0 flex items-center text-white font-bold"><a class="flex items-center" href="/"><img alt="logo" class="text-white w-8 inline-block mr-3" src="/logo.svg"><span class="text-xl">A Pretend Frontend</span></a></div></div><div class="hidden sm:block sm:ml-6"><div class="flex space-x-4"><a class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium" href="/events/">Events</a><a class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium" href="/services/">Services</a></div></div></div></div>
    <script>document.body.className += ' js-enabled' + ('noModule' in HTMLScriptElement.prototype ? ' govuk-frontend-supported' : '');</script>
    <script type="module" src="/assets/govuk-frontend.min.js"></script>
    <script type="module">
      import { initAll } from '/assets/govuk-frontend.min.js'
      initAll()
    </script>
    <h1>hello</h1>
    <div
  data-module="govuk-character-count"
  data-maxlength="500"
  data-i18n.characters-at-limit="No characters left"
  data-i18n.characters-under-limit.other="%{count} characters to go"
  data-i18n.characters-under-limit.one="%{count} character to go"
>more content</div>

</body>

    `);
});

export default app;

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen({ port: 3000 }, (err) => {
    if (err) logger.error("App listen error", { err });
    logger.info('server listening on 3000');
  });
}
