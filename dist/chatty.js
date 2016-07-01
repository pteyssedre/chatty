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
        ChatMessageType[ChatMessageType["USER_REGISTRATION"] = 5] = "USER_REGISTRATION";
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
        function ChatServer(options) {
            if (!options) {
                options = {};
            }
            this.chatPort = isNaN(options.port) ? 9991 : options.port;
            this.msgParser = options.onMessage ? options.onMessage : this._onMessage;
            this.authenticator = options.onAuthentication ? options.onAuthentication : this._onAuthentication;
            this.registration = options.onRegistration ? options.onRegistration : this._onRegistration;
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
            client = null;
        };
        ChatServer.prototype._onMessage = function (message, client) {
            if (message) {
                try {
                    var parsed = JSON.parse(message);
                    var type = Number(parsed.type);
                    if (!isNaN(type)) {
                        switch (type) {
                            case ChatMessageType.AUTHENTICATION_MESSAGE:
                                if (!parsed.credential || client.isAuthenticated) {
                                    // error to client  ? "invalid request" ?
                                    return; //for now ignore the message
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
                            case ChatMessageType.BROADCAST_MESSAGE:
                                Log.d("ChatServer", "server", "onMessage", "client request broadcast by " + client.UID);
                                if (!parsed.senderId) {
                                    Log.e("ChatServer", "server", "BROADCAST_MESSAGE", "no senderId set. It will be ignored, origin " + client.UID);
                                    return;
                                }
                                this._broadcastMessage(client, parsed);
                                break;
                            case ChatMessageType.LISTING_USERS_MESSAGE:
                                Log.d("ChatServer", "server", "onMessage", "client request listing by " + client.UID);
                                /**
                                 * internal
                                 */
                                break;
                            case ChatMessageType.EXCHANGE_MESSAGE:
                                Log.d("ChatServer", "server", "onMessage", "client request exchange by " + client.UID);
                                if (!parsed.destination) {
                                    Log.e("ChatServer", "server", "EXCHANGE_MESSAGE", "no destination set. It will be ignored, origin " + client.UID);
                                    return;
                                }
                                this._exchangeMessage(client, parsed);
                                break;
                            case ChatMessageType.USER_STATUS_MESSAGE:
                                Log.d("ChatServer", "server", "onMessage", "client request status change by " + client.UID);
                                /**
                                 * internal & external
                                 */
                                break;
                            case ChatMessageType.USER_REGISTRATION:
                                if (client.isAuthenticated) {
                                    // error to client  ? "invalid request" ?
                                    return; //for now ignore the message
                                }
                                this.registration(client, parsed, function (success, userId) {
                                    if (success) {
                                        client.isAuthenticated = true;
                                        client.UserId = userId;
                                    }
                                    var msg = new ChatMessage({
                                        result: success ? "ok" : "nok",
                                        time: new Date().getTime(),
                                        userId: success ? client.UserId : null,
                                    }, ChatMessageType.USER_REGISTRATION, client.UID);
                                    client.send(msg);
                                });
                                break;
                        }
                    }
                    else {
                        Log.c("ChatServer", "server", "onMessage", "message doesn't have any type to act, it will be ignored. Client:" + client.UID);
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
        ChatServer.prototype._onRegistration = function (client, message, callback) {
            var index = this.clients.indexOf(client);
            if (message) {
                Log.d("ChatServer", "server", "_onRegistration", "new registration for " + client.UID, index);
                callback(true, Guid.newGuid());
            }
            else {
                Log.d("ChatServer", "server", "_onRegistration", "registration is invalid for " + client.UID, index);
                callback(false, null);
            }
        };
        ChatServer.prototype._broadcastMessage = function (client, message) {
            var cci = this.clients.indexOf(client);
            for (var i = 0; i < this.clients.length; i++) {
                if (i != cci) {
                    var c = this.clients[i];
                    message.destination = c.isAuthenticated ? c.UserId : c.UID;
                    message.senderId = client.isAuthenticated ? client.UserId : client.UID;
                    c.send(message);
                }
            }
        };
        ChatServer.prototype._exchangeMessage = function (client, message) {
            var cci = client.isAuthenticated ? client.UserId : client.UID;
            var dcs = this.clients.filter(function (c) {
                return c.UID === message.destination || c.UserId === message.destination;
            });
            if (dcs && dcs.length > 0) {
                for (var i = 0; i < dcs.length; i++) {
                    var c = dcs[i];
                    if ((c.isAuthenticated && c.UserId === cci) || c.UID === cci) {
                        Log.e("ChatServer", "server", "_exchangeMessage", "trying to exchange with sender from " + client.UID);
                        continue;
                    }
                    Log.d("ChatServer", "server", "_exchangeMessage", "Exchange done for client " + client.UID);
                    c.send(message);
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
