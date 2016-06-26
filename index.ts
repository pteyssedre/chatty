import http = require("http");
import ws = require("ws");
import lazyUac = require("lazy-uac");
import {Chatty} from "./chatty";

let User = lazyUac.DataModel.User;
let Role = lazyUac.DataModel.Role;
let userManager = new lazyUac.LazyUAC.UserManager();

userManager.StartManager((error: Error, report: any): void => {
    if (error) {
        console.error("ERROR", new Date(), JSON.stringify(error));
        throw error;
    }
    console.log("INFO", new Date(), JSON.stringify(report));
    let admin = new User("admin", "admin", "admin@teyssedre.ca", "12345");
    admin.Roles |= Role.ADMIN | Role.SUPER_ADMIN | Role.USER | Role.VIEWER;

    userManager.AddUser(admin, user => {
        if (user) {
            console.log("INFO", new Date(), "Admin user added");
        }
        let server = new Chatty.ChatServer();
        server.Connect(()=> {
            console.log("INFO", new Date(), "ChatServer connected");
        });
    });
});

