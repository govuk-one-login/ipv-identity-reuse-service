"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fastify_1 = require("fastify");
var app = (0, fastify_1.default)();
app.get('/', function (request, reply) {
    reply.send({ hello: 'world' });
});
exports.default = app; // Default export at the top level
// Conditional logic for starting the server ONLY when called directly
if (import.meta.url === "file://".concat(process.argv[1])) {
    app.listen({ port: 3000 }, function (err) {
        if (err)
            console.error(err);
        console.log('server listening on 3000');
    });
}
