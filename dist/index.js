"use strict";
var lazyUac = require("lazy-uac");
var chatty_1 = require("./chatty");
var User = lazyUac.DataModel.User;
var Role = lazyUac.DataModel.Role;
var userManager = new lazyUac.LazyUAC.UserManager();
userManager.StartManager(function (error, report) {
    if (error) {
        console.error("ERROR", new Date(), JSON.stringify(error));
        throw error;
    }
    console.log("INFO", new Date(), JSON.stringify(report));
    var admin = new User("admin", "admin", "admin@teyssedre.ca", "12345");
    admin.Roles |= Role.ADMIN | Role.SUPER_ADMIN | Role.USER | Role.VIEWER;
    userManager.AddUser(admin, function (user) {
        if (user) {
            console.log("INFO", new Date(), "Admin user added");
        }
        else {
            userManager.GetUserByUserName(admin.Email, function (user) {
                admin = user;
                console.log("admin user retrieved", admin.Id);
            });
        }
        startChattyServer();
    });
});
function startChattyServer() {
    var server = new chatty_1.Chatty.ChatServer(9991, null, AuthenticateUser);
    server.Connect(function () {
        console.log("INFO", new Date(), "ChatServer connected");
    });
}
function AuthenticateUser(client, login, password, callback) {
    console.log("AuthenticateUser request", login, client.UID);
    userManager.Authenticate(login, password, function (match, user) {
        if (match) {
            client.isAuthenticated = true;
            client.UserId = user.Id;
        }
        callback(match);
    });
}
