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
    (function (ChatMessageType) {
        ChatMessageType[ChatMessageType["AUTHENTICATION_MESSAGE"] = 0] = "AUTHENTICATION_MESSAGE";
        ChatMessageType[ChatMessageType["BROADCAST_MESSAGE"] = 1] = "BROADCAST_MESSAGE";
        ChatMessageType[ChatMessageType["LISTING_USERS_MESSAGE"] = 2] = "LISTING_USERS_MESSAGE";
        ChatMessageType[ChatMessageType["EXCHANGE_MESSAGE"] = 3] = "EXCHANGE_MESSAGE";
        ChatMessageType[ChatMessageType["USER_STATUS_MESSAGE"] = 4] = "USER_STATUS_MESSAGE";
    })(Chatty.ChatMessageType || (Chatty.ChatMessageType = {}));
    var ChatMessageType = Chatty.ChatMessageType;
    (function (UserStatus) {
        UserStatus[UserStatus["OFFLINE"] = 0] = "OFFLINE";
        UserStatus[UserStatus["ONLINE"] = 1] = "ONLINE";
        UserStatus[UserStatus["AWAY"] = 2] = "AWAY";
        UserStatus[UserStatus["BUSY"] = 3] = "BUSY";
        UserStatus[UserStatus["DND"] = 4] = "DND";
    })(Chatty.UserStatus || (Chatty.UserStatus = {}));
    var UserStatus = Chatty.UserStatus;
    var ChatServer = (function () {
        function ChatServer(port, msgParser, authenticator) {
            this.chatPort = port;
            if (isNaN(this.chatPort)) {
                this.chatPort = 9991;
            }
            if (msgParser) {
                this.msgParser = msgParser;
            }
            else {
                this.msgParser = this._onMessage;
            }
            if (authenticator) {
                this.authenticator = authenticator;
            }
            else {
                this.authenticator = this._onAuthentication;
            }
            this.clients = [];
        }
        ChatServer.prototype.Connect = function (callback) {
            var _this = this;
            this.server = ws.createServer({ port: this.chatPort });
            this.server.on("connection", function (socket) {
                _this._addClient(socket);
            });
            callback();
        };
        ChatServer.prototype._addClient = function (socket) {
            var _this = this;
            var client = new ChatClient(socket);
            console.log("INFO", new Date(), "connection of client", client.UID);
            this.clients.push(client);
            client.onMessage(function (message) {
                console.log("INFO", new Date(), "new message from client", client.UID);
                _this.msgParser(message, client);
            });
            client.onClose(function () {
                console.log("INFO", new Date(), "disconnection of client", client.UID);
                _this._removeClient(client);
            });
        };
        ChatServer.prototype._removeClient = function (client) {
            var index = this.clients.indexOf(client);
            this.clients.splice(index, 1);
        };
        ChatServer.prototype._onMessage = function (message, client) {
            if (message) {
                console.log("DEBUG", new Date(), message);
                try {
                    var parsed = JSON.parse(message);
                    var type = Number(parsed.type);
                    if (!isNaN(type)) {
                        switch (type) {
                            case 0:
                                if (!parsed.credential || client.isAuthenticated) {
                                }
                                console.log("DEBUG", new Date(), "client request auth", client.isAuthenticated);
                                /**
                                 * Bubble up the authentication request
                                 * to ensure external authentication
                                 */
                                this.authenticator(client, parsed.credential.login, parsed.credential.password, function (success) {
                                    var msg = new ChatMessage({
                                        result: success ? "ok" : "nok",
                                        time: new Date().getTime(),
                                        userId: success ? client.UserId : null,
                                    }, ChatMessageType.AUTHENTICATION_MESSAGE, success ? client.UserId : client.UID);
                                    client.send(msg);
                                });
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
        ChatServer.prototype._onAuthentication = function (client, login, password, callback) {
            console.log("INFO", login, password);
            var ti = this.clients.indexOf(client);
            console.log("INFO", "client", ti);
            client.isAuthenticated = true;
            client.UserId = Guid.newGuid();
            callback(true);
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
        Object.defineProperty(ChatClient.prototype, "UID", {
            // get Socket() {
            //     return this.socket;
            // }
            get: function () {
                return this.uid;
            },
            enumerable: true,
            configurable: true
        });
        // addEventListener(name: string, callback: (e) => any): void {
        //     let t = this;
        //     this.socket.addEventListener(name, function () {
        //         callback.call(t);
        //     });
        // }
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
    var ChatMessage = (function () {
        function ChatMessage(data, type, destination, senderId) {
            this.data = data;
            this.type = type;
            this.destination = destination;
            this.senderId = senderId;
        }
        ChatMessage.prototype.Sign = function () {
            this.signature = "";
            return this;
        };
        return ChatMessage;
    }());
    Chatty.ChatMessage = ChatMessage;
})(Chatty = exports.Chatty || (exports.Chatty = {}));
