(function () {
    'use strict';

    angular.module("ChattyClient")
        .factory('SocketFactory', SocketFactory);
    SocketFactory.$inject = [];
    function SocketFactory() {
        return {
            state: {
                isOpen: false,
                hasError: false,
                isLog: false
            },
            socket: null,
            send: SendMessage,
            connect: ConnectSocket,
            authenticate: Authenticate,
            getContacts: getContacts
        };
    }

    function SendMessage(message) {
        var s = this;
        if (s.socket != null && s.state.isOpen) {
            var t = (typeof message).toLowerCase();
            var msg = message;
            switch (t) {
                case "string":
                case "number":
                case "function":
                    msg = "" + message;
                    break;
                case "object":
                    msg = JSON.stringify(message);
                    break;
            }
            s.socket.send(msg);
        }
    }

    function ConnectSocket(callback) {
        var s = this;
        s.socket = new WebSocket("ws://127.0.0.1:9991");
        s.socket.onopen = function () {
            s.state.isOpen = true;
            console.log("chatty-client", "connecting");
            if (callback) {
                callback();
            }
        };
        s.socket.onmessage = function (e) {
            console.log("chatty-client", "incoming data", e.data);
            var msg = null;
            try {
                msg = JSON.parse(e.data);
            } catch (exception) {
                console.error("chatty-client", "error on JSON parse msg", JSON.stringify(exception));
            }
            switch (msg.type) {
                case 0:
                    if (msg.data.result === "ok") {
                        console.log("chatty-client", "authentication success", msg.data.userId);
                        s.map['auth.success'].dispatch(msg);
                    } else {
                        console.error("chatty-client", "authentication failed");
                        s.map['auth.fail'].dispatch(msg);
                    }
                    break;
                case 1:
                    break;
                case 2:
                    break;
                case 3:
                    break;
                case 4:
                    break;
                case 5:
                    if (msg.data.result === "ok") {
                        console.log("chatty-client", "registration success", msg.data.userId);
                    } else {
                        console.error("chatty-client", "registration failed");
                    }
                    break;
            }
        };
        s.socket.onerror = function (error) {
            s.state.hasError = true;
            console.error("chatty-client", "error", JSON.stringify(error));
        };
        s.socket.onclose = function () {
            s.state.isOpen = false;
            console.log("chatty-client", "disconnected");
        };
    }

    function Authenticate(login, password, callback) {
        var s = this;
        if (s.state.isOpen) {
            var msg = {type: 0, credential: {login: login, password: password}};
            WaitForMessage.call(s, 'auth.success', function (message) {
                if (callback) {
                    callback(message && message.data ? message.data.userId : null);
                }
            });
            WaitForMessage.call(s, 'auth.fail', function (message) {
                if (callback) {
                    callback(null);
                }
            });
            s.send(msg);
        }
    }

    function WaitForMessage(messageName, callback) {
        var s = this;
        if (!s.map) {
            s.map = {};
        }
        if (!s.map[messageName]) {
            s.map[messageName] = {
                listeners: [],
                dispatch: function () {
                    for (var i = 0; i < this.listeners.length; i++) {
                        this.listeners[i](arguments);
                    }
                }
            }
        }
        s.map[messageName].listeners.push(callback);
    }

    function getContacts(callback) {
        var s = this;
        if (s.state.isOpen) {
            var msg = {type: 2, time: new Date().getTime()};
        }
    }
})();