// import http = require("http");
import ws = require("ws");
import lazyUac = require("lazy-uac");
import {Server} from "ws";
import lazyFL = require("lazy-format-logger");

export module Chatty {

    let Log: lazyFL.Logger = new lazyFL.Logger();

    class Guid {

        public static newGuid(): string {
            return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
                let r = Math.random() * 16 | 0, v = c === "x" ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    }

    export interface Authenticator {
        (client: ChatClient, login: string, password: string, callback: (success: boolean) =>void): void;
    }

    export interface Registrator {
        (client: ChatClient, message: ChatMessage, callback: (success: boolean, userId: string) => void): void;
    }

    export interface MessageParser {
        (message: string, client: ChatClient): void;
    }

    export interface ChattyOptions {
        onMessage?: MessageParser,
        onAuthentication?: Authenticator,
        onRegistration?: Registrator,
        port?: number
    }

    export enum ChatMessageType{
        AUTHENTICATION_MESSAGE = 0,
        BROADCAST_MESSAGE = 1,
        LISTING_USERS_MESSAGE = 2,
        EXCHANGE_MESSAGE = 3,
        USER_STATUS_MESSAGE = 4,
        USER_REGISTRATION = 5
    }

    export enum UserStatus {
        OFFLINE = 0,
        ONLINE = 1,
        AWAY = 2,
        BUSY = 3,
        DND = 4
    }

    export class ChatServer {
        private server: Server;
        private chatPort: number;
        private clients: ChatClient[];
        private msgParser: MessageParser;
        private authenticator: Authenticator;
        private registration: Registrator;

        public static setLevel(level: lazyFL.LogLevel): void {
            Log = new lazyFL.Logger(level);
        }

        constructor(options?: ChattyOptions) {
            if (!options) {
                options = {};
            }
            this.chatPort = isNaN(options.port) ? 9991 : options.port;
            this.msgParser = options.onMessage ? options.onMessage : this._onMessage;
            this.authenticator = options.onAuthentication ? options.onAuthentication : this._onAuthentication;
            this.registration = options.onRegistration ? options.onRegistration : this._onRegistration;
            this.clients = [];
        }

        public Connect(callback: () => void): void {
            this.server = ws.createServer({port: this.chatPort});
            this.server.on("connection", socket => {
                this._addClient(socket);
            });
            callback();
        }

        private _addClient(socket: any): void {
            let client = new ChatClient(socket);
            Log.i("ChatServer", "server", "addClient", "new client connected " + client.UID);
            this.clients.push(client);
            client.onMessage(message => {
                Log.i("ChatServer", "client", "onMessage", "new message form " + client.UID);
                this.msgParser(message, client);
            });
            client.onClose(() => {
                Log.i("ChatServer", "client", "onClose", "connection close by " + client.UID);
                this._removeClient(client);
            });
        }

        private _removeClient(client: ChatClient): void {
            let index = this.clients.indexOf(client);
            Log.i("ChatServer", "server", "removeClient", "removing client " + client.UID);
            this.clients.splice(index, 1);
            client = null;
        }

        private _onMessage(message: string, client: ChatClient): void {
            if (message) {
                try {
                    let parsed = JSON.parse(message);
                    let type = Number(parsed.type);
                    if (!isNaN(type)) {
                        switch (type) {
                            case ChatMessageType.AUTHENTICATION_MESSAGE: //USER AUTH
                                if (!parsed.credential || client.isAuthenticated) {
                                    // error to client  ? "invalid request" ?
                                    return; //for now ignore the message
                                }
                                Log.d("ChatServer", "server", "onMessage", "client request auth by " + client.UID);
                                /**
                                 * Bubble up the authentication request
                                 * to ensure external authentication
                                 */
                                this.authenticator(client, parsed.credential.login, parsed.credential.password,
                                    success => {
                                        let msg = new ChatMessage({
                                            result: success ? "ok" : "nok",
                                            time: new Date().getTime(),
                                            userId: success ? client.UserId : null,
                                        }, ChatMessageType.AUTHENTICATION_MESSAGE, success ? client.UserId : client.UID);
                                        client.send(msg);
                                    });
                                break;
                            case ChatMessageType.BROADCAST_MESSAGE: //USER BROADCAST
                                Log.d("ChatServer", "server", "onMessage", "client request broadcast by " + client.UID);
                                if (!parsed.senderId) {
                                    Log.e("ChatServer", "server", "BROADCAST_MESSAGE", "no senderId set. It will be ignored, origin " + client.UID);
                                    return;
                                }
                                this._broadcastMessage(client, parsed);
                                break;
                            case ChatMessageType.LISTING_USERS_MESSAGE: //USER LISTING
                                Log.d("ChatServer", "server", "onMessage", "client request listing by " + client.UID);
                                /**
                                 * internal
                                 */
                                break;
                            case ChatMessageType.EXCHANGE_MESSAGE: //USER ExCHANGE
                                Log.d("ChatServer", "server", "onMessage", "client request exchange by " + client.UID);
                                if (!parsed.destination) {
                                    Log.e("ChatServer", "server", "EXCHANGE_MESSAGE", "no destination set. It will be ignored, origin " + client.UID);
                                    return;
                                }
                                this._exchangeMessage(client, parsed);
                                break;
                            case ChatMessageType.USER_STATUS_MESSAGE: //USER STATUS
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
                                this.registration(client, parsed, (success: boolean, userId: string): void => {
                                    if (success) {
                                        client.isAuthenticated = true;
                                        client.UserId = userId;
                                    }
                                    let msg = new ChatMessage({
                                        result: success ? "ok" : "nok",
                                        time: new Date().getTime(),
                                        userId: success ? client.UserId : null,
                                    }, ChatMessageType.USER_REGISTRATION, client.UID);
                                    client.send(msg);
                                });
                                break;
                        }
                    } else {
                        Log.c("ChatServer", "server", "onMessage", "message doesn't have any type to act, it will be ignored. Client:" + client.UID);
                    }
                } catch (JSONException) {
                    Log.c("ChatServer", "server", "onMessage", "message can't be parse Client:" + client.UID, JSONException);
                }
            }
        }

        private _onAuthentication(client: ChatClient, login: string, password: string, callback: (success: boolean)=>void) {
            let ti = this.clients.indexOf(client);
            if (ti > -1 && login.length > 0 && password.length > 0) {
                Log.d("ChatServer", "server", "onAuthentication", "valid stub login by" + client.UID);
                client.isAuthenticated = true;
                client.UserId = Guid.newGuid();
                callback(true);
            } else {
                Log.e("ChatServer", "server", "onAuthentication", "invalid stub login by" + client.UID);
                callback(false);
            }
        }

        private _onRegistration(client: ChatClient, message: ChatMessage, callback: (success: boolean, userId: string) => void): void {
            let index = this.clients.indexOf(client);
            if (message) {
                Log.d("ChatServer", "server", "_onRegistration", "new registration for " + client.UID, index);
                callback(true, Guid.newGuid());
            } else {
                Log.d("ChatServer", "server", "_onRegistration", "registration is invalid for " + client.UID, index);
                callback(false, null);
            }
        }

        private _broadcastMessage(client: Chatty.ChatClient, message: ChatMessage) {
            let cci = this.clients.indexOf(client);
            for (var i = 0; i < this.clients.length; i++) {
                if (i != cci) {
                    let c = this.clients[i];
                    message.destination = c.isAuthenticated ? c.UserId : c.UID;
                    message.senderId = client.isAuthenticated ? client.UserId : client.UID;
                    c.send(message)
                }
            }
        }

        private _exchangeMessage(client: Chatty.ChatClient, message: ChatMessage) {
            let cci = client.isAuthenticated ? client.UserId : client.UID;
            let dcs = this.clients.filter(function (c) {
                return c.UID === message.destination || c.UserId === message.destination;
            });
            if (dcs && dcs.length > 0) {
                for (var i = 0; i < dcs.length; i++) {
                    let c = dcs[i];
                    if ((c.isAuthenticated && c.UserId === cci) || c.UID === cci) {
                        Log.e("ChatServer", "server", "_exchangeMessage", "trying to exchange with sender from " + client.UID);
                        continue;
                    }
                    Log.d("ChatServer", "server", "_exchangeMessage", "Exchange done for client " + client.UID);
                    c.send(message);
                }
            }
        }
    }

    export class ChatClient {
        private socket: any;
        private uid: string;
        public UserId: string;
        public isAuthenticated: boolean;

        constructor(connection: any) {
            this.socket = connection;
            this.uid = Guid.newGuid();
        }

        public send(message: any) {
            let t = typeof message;
            let msg: string;
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
        }

        // get Socket() {
        //     return this.socket;
        // }

        get UID() {
            return this.uid;
        }

        // addEventListener(name: string, callback: (e) => any): void {
        //     let t = this;
        //     this.socket.addEventListener(name, function () {
        //         callback.call(t);
        //     });
        // }

        onMessage(callback: (message?: string) => any): void {
            let t = this;
            this.socket.on("message", message => {
                callback.call(t, message);
            });
        }

        onClose(callback: () => void): void {
            let t = this;
            this.socket.on("close", () => {
                callback.call(t);
            });
        }
    }

    export class ChatMessage {
        public type: ChatMessageType;
        public senderId: string;
        public destination: string;
        public signature: string;
        public data: any;

        constructor(data: any, type: ChatMessageType, destination?: string, senderId?: string) {
            this.data = data;
            this.type = type;
            this.destination = destination;
            this.senderId = senderId;
        }

        public Sign(): this {
            this.signature = "";
            return this;
        }
    }
}