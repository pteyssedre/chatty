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

    export interface MessageParser {
        (message: string): void;
    }

    export class ChatServer {
        private server: Server;
        private chatPort: number;
        private clients: ChatClient[];
        private msgParser: MessageParser;

        constructor(port?: number, msgParser?: MessageParser) {
            this.chatPort = port;
            if (isNaN(this.chatPort)) {
                this.chatPort = 9991;
            }
            if (msgParser) {
                this.msgParser = msgParser;
            } else {
                this.msgParser = this.internalMessage;
            }
            this.clients = [];
        }

        public Connect(callback: () => void): void {
            this.server = ws.createServer({port: this.chatPort});
            this.server.on("connection", socket => {
                this.addClient(socket);
            });
            callback();
        }

        private addClient(socket: any): void {
            let client = new ChatClient(socket);
            console.log("INFO", new Date(), "connection of client", client.UID);
            this.clients.push(client);
            client.onMessage(message => {
                console.log("INFO", new Date(), "new message from client", client.UID);
                this.msgParser(message);
            });
            client.onClose(() => {
                console.log("INFO", new Date(), "disconnection of client", client.UID);
                this.removeClient(client);
            });
        }

        private removeClient(client: ChatClient): void {
            let index = this.clients.indexOf(client);
            this.clients.splice(index, 1);
        }

        private internalMessage(message: string): void {
            if (message) {
                console.log("DEBUG", new Date(), message);
                try {
                    let parsed = JSON.parse(message);
                    let type = Number(parsed.type);
                    if (!isNaN(type)) {
                        switch (type) {
                            case 0: //USER AUTH
                                console.log("DEBUG", new Date(), "client request auth");
                                /**
                                 * Bubble up the authentication request
                                 * to ensure external authentication
                                 */
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
    }

    export class ChatClient {
        private socket: any;
        private uid: string;

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

        get Socket() {
            return this.socket;
        }

        get UID() {
            return this.uid;
        }

        addEventListener(name: string, callback: (e) => any): void {
            let t = this;
            this.socket.addEventListener(name, function () {
                callback.call(t);
            });
        }

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
}