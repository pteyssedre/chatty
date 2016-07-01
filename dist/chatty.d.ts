import lazyFL = require("lazy-format-logger");
export declare module Chatty {
    interface Authenticator {
        (client: ChatClient, login: string, password: string, callback: (success: boolean) => void): void;
    }
    interface Registrator {
        (client: ChatClient, message: ChatMessage, callback: (success: boolean, userId: string) => void): void;
    }
    interface MessageParser {
        (message: string, client: ChatClient): void;
    }
    interface ChattyOptions {
        onMessage?: MessageParser;
        onAuthentication?: Authenticator;
        onRegistration?: Registrator;
        port?: number;
    }
    enum ChatMessageType {
        AUTHENTICATION_MESSAGE = 0,
        BROADCAST_MESSAGE = 1,
        LISTING_USERS_MESSAGE = 2,
        EXCHANGE_MESSAGE = 3,
        USER_STATUS_MESSAGE = 4,
        USER_REGISTRATION = 5,
    }
    enum UserStatus {
        OFFLINE = 0,
        ONLINE = 1,
        AWAY = 2,
        BUSY = 3,
        DND = 4,
    }
    class ChatServer {
        private server;
        private chatPort;
        private clients;
        private msgParser;
        private authenticator;
        private registration;
        static setLevel(level: lazyFL.LogLevel): void;
        constructor(options?: ChattyOptions);
        Connect(callback: () => void): void;
        private _addClient(socket);
        private _removeClient(client);
        private _onMessage(message, client);
        private _onAuthentication(client, login, password, callback);
        private _onRegistration(client, message, callback);
        private _broadcastMessage(client, message);
        private _exchangeMessage(client, message);
    }
    class ChatClient {
        private socket;
        private uid;
        UserId: string;
        isAuthenticated: boolean;
        constructor(connection: any);
        send(message: any): void;
        UID: string;
        onMessage(callback: (message?: string) => any): void;
        onClose(callback: () => void): void;
    }
    class ChatMessage {
        type: ChatMessageType;
        senderId: string;
        destination: string;
        signature: string;
        data: any;
        constructor(data: any, type: ChatMessageType, destination?: string, senderId?: string);
        Sign(): this;
    }
}
