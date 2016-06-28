"use strict";
var lazyUac = require("lazy-uac");
var chatty_1 = require("./chatty");
var User = lazyUac.DataModel.User;
var Role = lazyUac.DataModel.Role;
var lazyFormatLogger = require("lazy-format-logger");
var Logger = lazyFormatLogger.Logger;
var LogLevel = lazyFormatLogger.LogLevel;
var UserManager = lazyUac.LazyUAC.UserManager;
var logLevel = LogLevel.VERBOSE;
var Log;
var userManager;
function setLogLevel() {
    Log = new Logger(logLevel);
    lazyUac.LazyUAC.UserManager.setLevel(logLevel);
    chatty_1.Chatty.ChatServer.setLevel(logLevel);
}
function startUserManager() {
    setLogLevel();
    userManager = new UserManager();
    userManager.StartManager(function (error, report) {
        if (error) {
            Log.c("Chatty", "UserManager", "StartManager", error);
            throw error;
        }
        Log.d("Chatty", "UserManager", "StartManager", report);
        var admin = new User("admin", "admin", "admin@teyssedre.ca", "12345");
        admin.Roles |= Role.ADMIN | Role.SUPER_ADMIN | Role.USER | Role.VIEWER;
        userManager.AddUser(admin, function (user) {
            if (user) {
                Log.d("Chatty", "UserManager", "AddUser", "Admin user added");
            }
            else {
                userManager.GetUserByUserName(admin.Email, function (user) {
                    admin = user;
                    Log.d("Chatty", "UserManager", "AddUser", "admin user retrieved " + admin.Id);
                });
            }
            startChattyServer();
        });
    });
}
function startChattyServer() {
    var server = new chatty_1.Chatty.ChatServer(9991, null, AuthenticateUser);
    server.Connect(function () {
        Log.d("Chatty", "ChatServer", "Connect", "ChatServer connected");
    });
}
function AuthenticateUser(client, login, password, callback) {
    Log.d("Chatty", "ChatServer", "AuthenticateUser", "AuthenticateUser request " + login + " by " + client.UID);
    userManager.Authenticate(login, password, function (match, user) {
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
