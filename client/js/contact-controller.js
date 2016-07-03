(function () {
    'use strict';

    angular.module('ChattyClient')
        .controller('ContactController', ContactController);

    ContactController.$inject = ['SocketFactory', 'UserService'];
    function ContactController(SocketFactory, UserService) {
        var vm = this;

        vm.contacts = [1,2,3,4,5,6,7,8];

        SocketFactory.getContacts(function (list) {
            vm.contacts = list;
        });
    }
})();