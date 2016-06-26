export declare module Chatty {
    interface MessageParser {
        (message: string): void;
    }
    class ChatServer {
        private server;
        private chatPort;
        private clients;
        private msgParser;
        constructor(port?: number, msgParser?: MessageParser);
        Connect(callback: () => void): void;
        private addClient(socket);
        private removeClient(client);
        private internalMessage(message);
    }
    class ChatClient {
        private socket;
        private uid;
        constructor(connection: any);
        send(message: any): void;
        Socket: any;
        UID: string;
        addEventListener(name: string, callback: (e) => any): void;
        onMessage(callback: (message?: string) => any): void;
        onClose(callback: () => void): void;
    }
}
