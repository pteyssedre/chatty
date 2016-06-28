// import http = require("http");
import ws = require("ws");
import lazyUac = require("lazy-uac");
import {Server} from "ws";

export module Chatty {

    class Guid {

        public static newGuid(): string {
            return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
                let r = Math.random() * 16 | 0, v = c === "x" ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    }

    export interface Authenticator {
        (client: ChatClient, login: string, password: string, callback: (success: boolean) =>void);
    }

    export interface MessageParser {
        (message: string, client: ChatClient): void;
    }

    export enum ChatMessageType{
        AUTHENTICATION_MESSAGE = 0,
        BROADCAST_MESSAGE = 1,
        LISTING_USERS_MESSAGE = 2,
        EXCHANGE_MESSAGE = 3,
        USER_STATUS_MESSAGE = 4
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

        constructor(port?: number, msgParser?: MessageParser, authenticator?: Authenticator) {
            this.chatPort = port;
            if (isNaN(this.chatPort)) {
                this.chatPort = 9991;
            }
            if (msgParser) {
                this.msgParser = msgParser;
            } else {
                this.msgParser = this._onMessage;
            }
            if (authenticator) {
                this.authenticator = authenticator;
            } else {
                this.authenticator = this._onAuthentication;
            }
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
            console.log("INFO", new Date(), "connection of client", client.UID);
            this.clients.push(client);
            client.onMessage(message => {
                console.log("INFO", new Date(), "new message from client", client.UID);
                this.msgParser(message, client);
            });
            client.onClose(() => {
                console.log("INFO", new Date(), "disconnection of client", client.UID);
                this._removeClient(client);
            });
        }

        private _removeClient(client: ChatClient): void {
            let index = this.clients.indexOf(client);
            this.clients.splice(index, 1);
        }

        private _onMessage(message: string, client: ChatClient): void {
            if (message) {
                console.log("DEBUG", new Date(), message);
                try {
                    let parsed = JSON.parse(message);
                    let type = Number(parsed.type);
                    if (!isNaN(type)) {
                        switch (type) {
                            case 0: //USER AUTH
                                if (!parsed.credential || client.isAuthenticated) {
                                    // error to client  ? "invalid request" ?
                                }
                                console.log("DEBUG", new Date(), "client request auth", client.isAuthenticated);
                                /**
                                 * Bubble up the authentication request
                                 * to ensure external authentication
                                 */
                                this.authenticator(client,
                                    parsed.credential.login,
                                    parsed.credential.password,
                                    success => {
                                        let msg = new ChatMessage({
                                            result: success ? "ok" : "nok",
                                            time: new Date().getTime(),
                                            userId: success ? client.UserId : null,
                                        }, ChatMessageType.AUTHENTICATION_MESSAGE, success ? client.UserId : client.UID);
                                        client.send(msg);
                                    });
                                break;
                            case 1: //USER BROADCAST
                                console.log("DEBUG", new Date(), "client request broadcast");
                                /**
                                 * internal
                                 */
                                break;
                            case 2: //USER LISTING
                                console.log("DEBUG", new Date(), "client request listing");
                                /**
                                 * internal
                                 */
                                break;
                            case 3: //USER ExCHANGE
                                console.log("DEBUG", new Date(), "client request exchange");
                                break;
                            case 4: //USER STATUS
                                console.log("DEBUG", new Date(), "client request status change");
                                /**
                                 * internal & external
                                 */
                                break;
                        }
                    } else {
                        console.error("ERROR", new Date(),
                            "message doesn't have any type to act, it will be ignored");
                    }
                } catch (JSONException) {
                    console.error("ERROR", new Date(), JSONException);
                }
            }
        }

        private _onAuthentication(client: ChatClient, login: string, password: string, callback: (success: boolean)=>void) {
            console.log("INFO", login, password);
            let ti = this.clients.indexOf(client);
            console.log("INFO", "client", ti);
            client.isAuthenticated = true;
            client.UserId = Guid.newGuid();
            callback(true);
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
            console.log("INFO", new Date(), "sending message to:", this.uid);
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