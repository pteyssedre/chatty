(function () {
    'use strict';

    angular.module("ChattyClient")
        .controller("ToolbarController", ToolbarController);

    ToolbarController.$inject = [];
    function ToolbarController() {
        var vm = this;
    }
})();