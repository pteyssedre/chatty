(function () {
    'use strict';
    
    angular.module("ChattyClient")
        .controller("LoginController", LoginController);

    LoginController.$inject = ['SocketFactory', 'UserService'];
    function LoginController(SocketFactory, UserService) {
        var vm = this;

        vm.loading = false;
        vm.username = null;
        vm.password = null;

        vm.login = function () {
            vm.loading = true;
            SocketFactory.connect(function () {
                SocketFactory.authenticate(vm.username, vm.password, function (userId) {
                    vm.loading = false;
                    if (userId) {
                        UserService.profile.userId = userId;
                        //TODO: move to contact
                    }
                });
            });
        }
    }
})();