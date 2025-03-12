import fastify, { FastifyInstance } from 'fastify';

const app: FastifyInstance = fastify();

app.get('/', (request, reply) => {
  reply.type('text/html').send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fastify Lambda</title>
      </head>
      <body>
        <h1>Hello from Fastify Lambda!</h1>
      </body>
      </html>
    `);
});

export default app; // Default export at the top level

// Conditional logic for starting the server ONLY when called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen({ port: 3000 }, (err) => {
    if (err) console.error(err);
    console.log('server listening on 3000');
  });
}
