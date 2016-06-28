import http = require("http");
import ws = require("ws");
import lazyUac = require("lazy-uac");
import {Chatty} from "./chatty";
import User = lazyUac.DataModel.User;
import Role = lazyUac.DataModel.Role;
import MessageType = Chatty.ChatMessageType;

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
        } else {
            userManager.GetUserByUserName(admin.Email, user => {
                admin = user;
                console.log("admin user retrieved", admin.Id);
            });
        }
        startChattyServer();
    });
});

function startChattyServer(): void {

    let server = new Chatty.ChatServer(9991, null, AuthenticateUser);

    server.Connect(()=> {
        console.log("INFO", new Date(), "ChatServer connected");
    });
}

function AuthenticateUser(client: Chatty.ChatClient, login: string, password: string, callback: (success: boolean) =>void): void {
    console.log("AuthenticateUser request", login, client.UID);
    userManager.Authenticate(login, password, (match: boolean, user: User): void => {
        if (match) {
            client.isAuthenticated = true;
            client.UserId = user.Id;
        }
        callback(match);
    });
}
