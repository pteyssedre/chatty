"use strict";
var lazyUac = require("lazy-uac");
var lazyFormatLogger = require("lazy-format-logger");
var chatty_1 = require("./chatty");
var logLevel = lazyFormatLogger.LogLevel.VERBOSE;
var Log;
var userManager;
function setLogLevel() {
    Log = new lazyFormatLogger.Logger(logLevel);
    lazyUac.LazyUAC.UserManager.setLevel(logLevel);
    chatty_1.Chatty.ChatServer.setLevel(logLevel);
}
function startUserManager() {
    setLogLevel();
    userManager = new lazyUac.LazyUAC.UserManager();
    userManager.StartManager(function (error, report) {
        if (error) {
            Log.c("Chatty", "UserManager", "StartManager", error);
            throw error;
        }
        Log.d("Chatty", "UserManager", "StartManager", report);
        var admin = new lazyUac.DataModel.User("admin", "admin", "admin@teyssedre.ca", "12345");
        admin.Roles |= lazyUac.DataModel.Role.ADMIN
            | lazyUac.DataModel.Role.SUPER_ADMIN
            | lazyUac.DataModel.Role.USER
            | lazyUac.DataModel.Role.VIEWER;
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
    var options = { port: 9991, authenticator: AuthenticateUser, registration: RegisterUser };
    var server = new chatty_1.Chatty.ChatServer(options);
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
function RegisterUser(client, message, callback) {
    Log.d("Chatty", "ChatServer", "RegisterUser", "New request of registration by " + client.UID);
    var u = new lazyUac.DataModel.User(message.data.Firstname, message.data.LastName, message.data.UserName, message.data.password, lazyUac.DataModel.Role.USER);
    userManager.AddUser(u, function (user) {
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
