(function () {
    'use strict';

    angular.module('ChattyClient')
        .service('UserService', UserService);

    UserService.$inject = [];
    function UserService() {
        return {
            profile: {}
        };
    }
})();