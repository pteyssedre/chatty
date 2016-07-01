import http = require("http");
import ws = require("ws");
import lazyUac = require("lazy-uac");
import lazyFormatLogger = require("lazy-format-logger");

import {Chatty} from "./chatty";

let logLevel = lazyFormatLogger.LogLevel.VERBOSE;
let Log: lazyFormatLogger.Logger;
let userManager: lazyUac.LazyUAC.UserManager;

function setLogLevel() {
    Log = new lazyFormatLogger.Logger(logLevel);
    lazyUac.LazyUAC.UserManager.setLevel(logLevel);
    Chatty.ChatServer.setLevel(logLevel);
}

function startUserManager() {
    setLogLevel();
    userManager = new lazyUac.LazyUAC.UserManager();
    userManager.StartManager((error: Error, report: any): void => {
        if (error) {
            Log.c("Chatty", "UserManager", "StartManager", error);
            throw error;
        }
        Log.d("Chatty", "UserManager", "StartManager", report);
        let admin = new lazyUac.DataModel.User("admin", "admin", "admin@teyssedre.ca", "12345");
        admin.Roles |= lazyUac.DataModel.Role.ADMIN
            | lazyUac.DataModel.Role.SUPER_ADMIN
            | lazyUac.DataModel.Role.USER
            | lazyUac.DataModel.Role.VIEWER;

        userManager.AddUser(admin, user => {
            if (user) {
                Log.d("Chatty", "UserManager", "AddUser", "Admin user added");
            } else {
                userManager.GetUserByUserName(admin.Email, user => {
                    admin = user;
                    Log.d("Chatty", "UserManager", "AddUser", "admin user retrieved " + admin.Id);
                });
            }
            startChattyServer();
        });
    });
}

function startChattyServer(): void {
    let options = {port: 9991, authenticator: AuthenticateUser, registration: RegisterUser};
    let server = new Chatty.ChatServer(options);

    server.Connect(()=> {
        Log.d("Chatty", "ChatServer", "Connect", "ChatServer connected");
    });
}

function AuthenticateUser(client: Chatty.ChatClient, login: string, password: string, callback: (success: boolean) =>void): void {
    Log.d("Chatty", "ChatServer", "AuthenticateUser", "AuthenticateUser request " + login + " by " + client.UID);
    userManager.Authenticate(login, password, (match: boolean, user: lazyUac.DataModel.User): void => {
        if (match) {
            client.isAuthenticated = true;
            client.UserId = user.Id;
        }
        callback(match);
    });
}

function RegisterUser(client: Chatty.ChatClient, message: Chatty.ChatMessage, callback: (success: boolean, userId: string) => void): void {
    Log.d("Chatty", "ChatServer", "RegisterUser", "New request of registration by " + client.UID);
    let u = new lazyUac.DataModel.User(message.data.Firstname,
        message.data.LastName, message.data.UserName,
        message.data.password, lazyUac.DataModel.Role.USER);

    userManager.AddUser(u, (user: lazyUac.DataModel.User): void => {
        if (user) {
            Log.i("Chatty", "ChatServer", "RegisterUser", "New user register " + user.Id);
        }
        callback(user != null, user != null ? user.Id : null);
    });
}

function startChatty() {
    startUserManager();
}

startChatty();