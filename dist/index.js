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
        var server = new chatty_1.Chatty.ChatServer();
        server.Connect(function () {
            console.log("INFO", new Date(), "ChatServer connected");
        });
    });
});
