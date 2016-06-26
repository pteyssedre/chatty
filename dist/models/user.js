"use strict";
var User = (function () {
    function User(uid, name, publicKey) {
        this.uid = uid;
        this.name = name;
        this.publicKey = publicKey;
    }
    return User;
}());
exports.User = User;
