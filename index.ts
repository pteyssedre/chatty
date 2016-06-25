import http = require("http");
import ws = require("ws");
import lazyUac = require("lazy-uac");


let userManager = new lazyUac.LazyUAC.UserManager();
let server = ws.createServer({ port: 9991});
server.on("connection", client => {
    client.on("message", message => {
        console.log(message);
    })
});
http.createServer((request, response) => {
    response.writeHead(200);
    response.end();
}).listen(9999);

