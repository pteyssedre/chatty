import http = require("http");
import ws = require("ws");
import lazyUac = require("lazy-uac");
import { Chatty } from "./chatty";
import User = lazyUac.DataModel.User;
import Role = lazyUac.DataModel.Role;
import MessageType = Chatty.ChatMessageType;
import lazyFormatLogger = require("lazy-format-logger");
import Logger = lazyFormatLogger.Logger;
import LogLevel = lazyFormatLogger.LogLevel;
import UserManager = lazyUac.LazyUAC.UserManager;

let logLevel = LogLevel.VERBOSE;
let Log: Logger;
let userManager: UserManager;

function setLogLevel() {
    Log = new Logger(logLevel);
    lazyUac.LazyUAC.UserManager.setLevel(logLevel);
    Chatty.ChatServer.setLevel(logLevel);
}

function startUserManager() {
    setLogLevel();
    userManager = new UserManager();
    userManager.StartManager((error: Error, report: any): void => {
        if (error) {
            Log.c("Chatty", "UserManager", "StartManager", error);
            throw error;
        }
        Log.d("Chatty", "UserManager", "StartManager", report);
        let admin = new User("admin", "admin", "admin@teyssedre.ca", "12345");
        admin.Roles |= Role.ADMIN | Role.SUPER_ADMIN | Role.USER | Role.VIEWER;

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

    let server = new Chatty.ChatServer(9991, null, AuthenticateUser);

    server.Connect(()=> {
        Log.d("Chatty", "ChatServer", "Connect", "ChatServer connected");
    });
}

function AuthenticateUser(client: Chatty.ChatClient, login: string, password: string, callback: (success: boolean) =>void): void {
    Log.d("Chatty", "ChatServer", "AuthenticateUser", "AuthenticateUser request " + login + " by " + client.UID);
    userManager.Authenticate(login, password, (match: boolean, user: User): void => {
        if (match) {
            client.isAuthenticated = true;
            client.UserId = user.Id;
        }
        callback(match);
    });
}

function startChatty() {
    startUserManager();
}

startChatty();