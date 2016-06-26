"use strict";
// import http = require("http");
var ws = require("ws");
var Chatty;
(function (Chatty) {
    var Guid = (function () {
        function Guid() {
        }
        Guid.newGuid = function () {
            return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c === "x" ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };
        return Guid;
    }());
    var ChatServer = (function () {
        function ChatServer(port, msgParser) {
            this.chatPort = port;
            if (isNaN(this.chatPort)) {
                this.chatPort = 9991;
            }
            if (msgParser) {
                this.msgParser = msgParser;
            }
            else {
                this.msgParser = this.internalMessage;
            }
            this.clients = [];
        }
        ChatServer.prototype.Connect = function (callback) {
            var _this = this;
            this.server = ws.createServer({ port: this.chatPort });
            this.server.on("connection", function (socket) {
                _this.addClient(socket);
            });
            callback();
        };
        ChatServer.prototype.addClient = function (socket) {
            var _this = this;
            var client = new ChatClient(socket);
            console.log("INFO", new Date(), "connection of client", client.UID);
            this.clients.push(client);
            client.onMessage(function (message) {
                console.log("INFO", new Date(), "new message from client", client.UID);
                _this.msgParser(message);
            });
            client.onClose(function () {
                console.log("INFO", new Date(), "disconnection of client", client.UID);
                _this.removeClient(client);
            });
        };
        ChatServer.prototype.removeClient = function (client) {
            var index = this.clients.indexOf(client);
            this.clients.splice(index, 1);
        };
        ChatServer.prototype.internalMessage = function (message) {
            if (message) {
                console.log("DEBUG", new Date(), message);
                try {
                    var parsed = JSON.parse(message);
                    var type = Number(parsed.type);
                    if (!isNaN(type)) {
                        switch (type) {
                            case 0:
                                console.log("DEBUG", new Date(), "client request auth");
                                /**
                                 * Bubble up the authentication request
                                 * to ensure external authentication
                                 */
                                break;
                            case 1:
                                console.log("DEBUG", new Date(), "client request broadcast");
                                /**
                                 * internal
                                 */
                                break;
                            case 2:
                                console.log("DEBUG", new Date(), "client request listing");
                                /**
                                 * internal
                                 */
                                break;
                            case 3:
                                console.log("DEBUG", new Date(), "client request exchange");
                                break;
                            case 4:
                                console.log("DEBUG", new Date(), "client request status change");
                                /**
                                 * internal & external
                                 */
                                break;
                        }
                    }
                    else {
                        console.error("ERROR", new Date(), "message doesn't have any type to act, it will be ignored");
                    }
                }
                catch (JSONException) {
                    console.error("ERROR", new Date(), JSONException);
                }
            }
        };
        return ChatServer;
    }());
    Chatty.ChatServer = ChatServer;
    var ChatClient = (function () {
        function ChatClient(connection) {
            this.socket = connection;
            this.uid = Guid.newGuid();
        }
        ChatClient.prototype.send = function (message) {
            var t = typeof message;
            var msg;
            switch (t) {
                case "string":
                    msg = message;
                    break;
                default:
                    msg = JSON.stringify(message);
                    break;
            }
            console.log("INFO", new Date(), "sending message to:", this.uid);
            this.socket.send(msg);
        };
        Object.defineProperty(ChatClient.prototype, "Socket", {
            get: function () {
                return this.socket;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ChatClient.prototype, "UID", {
            get: function () {
                return this.uid;
            },
            enumerable: true,
            configurable: true
        });
        ChatClient.prototype.addEventListener = function (name, callback) {
            var t = this;
            this.socket.addEventListener(name, function () {
                callback.call(t);
            });
        };
        ChatClient.prototype.onMessage = function (callback) {
            var t = this;
            this.socket.on("message", function (message) {
                callback.call(t, message);
            });
        };
        ChatClient.prototype.onClose = function (callback) {
            var t = this;
            this.socket.on("close", function () {
                callback.call(t);
            });
        };
        return ChatClient;
    }());
    Chatty.ChatClient = ChatClient;
})(Chatty = exports.Chatty || (exports.Chatty = {}));
