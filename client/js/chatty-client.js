(function () {
    'use strict';
    angular.module("ChattyClient", ['ngMaterial', 'ui.router'])
        .config(ConfigTheme)
        .config(ConfigRouting);

    ConfigTheme.$inject = ['$mdThemingProvider'];
    function ConfigTheme($mdThemingProvider) {
        $mdThemingProvider.theme('default')
            .primaryPalette('blue')
            .accentPalette('cyan')
            .backgroundPalette('blue');
    }

    ConfigRouting.$inject = ['$stateProvider', '$urlRouterProvider']
    function ConfigRouting($stateProvider, $urlRouterProvider) {
        $urlRouterProvider.otherwise("/login");

        $stateProvider
            .state('login', {
                url: "/login",
                views: {
                    'content': {
                        templateUrl: "views/login.html",
                        controller: 'LoginController',
                        controllerAs: 'vm'
                    }
                }
            })
            .state('register', {
                url: '/register',
                views: {
                    'content': {
                        templateUrl: 'views/register.html',
                        controller: 'RegisterController',
                        controllerAs: 'vm'
                    }
                }
            })
            .state('contact', {
                url: '/contact',
                views: {
                    'content': {
                        templateUrl: 'views/contact.html',
                        controller: 'ContactController',
                        controllerAs: 'vm'
                    },
                    'toolbar': {
                        templateUrl: 'views/toolbar.html',
                        controller: 'ToolbarController',
                        controllerAs: 'vm'
                    }
                }
            });
    }
})();