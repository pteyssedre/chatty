"use strict";
// import http = require("http");
var ws = require("ws");
var lazyFL = require("lazy-format-logger");
var Chatty;
(function (Chatty) {
    var Log = new lazyFL.Logger();
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
        ChatServer.setLevel = function (level) {
            Log = new lazyFL.Logger(level);
        };
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
            Log.i("ChatServer", "server", "addClient", "new client connected " + client.UID);
            this.clients.push(client);
            client.onMessage(function (message) {
                Log.i("ChatServer", "client", "onMessage", "new message form " + client.UID);
                _this.msgParser(message, client);
            });
            client.onClose(function () {
                Log.i("ChatServer", "client", "onClose", "connection close by " + client.UID);
                _this._removeClient(client);
            });
        };
        ChatServer.prototype._removeClient = function (client) {
            var index = this.clients.indexOf(client);
            Log.i("ChatServer", "server", "removeClient", "removing client " + client.UID);
            this.clients.splice(index, 1);
        };
        ChatServer.prototype._onMessage = function (message, client) {
            if (message) {
                try {
                    var parsed = JSON.parse(message);
                    var type = Number(parsed.type);
                    if (!isNaN(type)) {
                        switch (type) {
                            case 0:
                                if (!parsed.credential || client.isAuthenticated) {
                                }
                                Log.d("ChatServer", "server", "onMessage", "client request auth by " + client.UID);
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
                                Log.d("ChatServer", "server", "onMessage", "client request broadcast by " + client.UID);
                                /**
                                 * internal
                                 */
                                break;
                            case 2:
                                Log.d("ChatServer", "server", "onMessage", "client request listing by " + client.UID);
                                /**
                                 * internal
                                 */
                                break;
                            case 3:
                                Log.d("ChatServer", "server", "onMessage", "client request exchange by " + client.UID);
                                break;
                            case 4:
                                Log.d("ChatServer", "server", "onMessage", "client request status change by " + client.UID);
                                /**
                                 * internal & external
                                 */
                                break;
                        }
                    }
                    else {
                        Log.c("ChatServer", "server", "onMessage", "message doesn't have any type to act, it will be ignored. Client:" + client.UID);
                        console.error("ERROR", new Date(), "message doesn't have any type to act, it will be ignored");
                    }
                }
                catch (JSONException) {
                    Log.c("ChatServer", "server", "onMessage", "message can't be parse Client:" + client.UID, JSONException);
                }
            }
        };
        ChatServer.prototype._onAuthentication = function (client, login, password, callback) {
            var ti = this.clients.indexOf(client);
            if (ti > -1 && login.length > 0 && password.length > 0) {
                Log.d("ChatServer", "server", "onAuthentication", "valid stub login by" + client.UID);
                client.isAuthenticated = true;
                client.UserId = Guid.newGuid();
                callback(true);
            }
            else {
                Log.e("ChatServer", "server", "onAuthentication", "invalid stub login by" + client.UID);
                callback(false);
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
            Log.d("ChatClient", "send", "sending message to:", this.uid);
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
