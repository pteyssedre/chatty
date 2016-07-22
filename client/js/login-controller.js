(function () {
    'use strict';
    
    angular.module("ChattyClient")
        .controller("LoginController", LoginController);

    LoginController.$inject = ['SocketFactory', 'UserService', '$location'];
    function LoginController(SocketFactory, UserService, $location) {
        var vm = this;

        vm.loading = false;
        vm.username = null;
        vm.password = null;

        vm.login = function () {
            vm.loading = true;
            SocketFactory.connect(function () {
                vm.loading = false;
                $location.path('call');
                // SocketFactory.authenticate(vm.username, vm.password, function (userId) {
                //     vm.loading = false;
                //     if (userId) {
                //         UserService.profile.userId = userId;
                //         //TODO: move to contact
                //     }
                // });
            });
        }
    }
})();