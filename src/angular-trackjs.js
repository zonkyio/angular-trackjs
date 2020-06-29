(function (angular) {

    'use strict';

    angular.module('trackJs', []);

    var configure = function (windowObj) {
        return function (options) {

            if (options && windowObj.trackJs) {
                windowObj.trackJs.configure(options);
            }
        };
    };

    angular.module('trackJs').config(function ($provide) {
        $provide.decorator("$exceptionHandler", function ($delegate, exceptionHandlerDecorator) {
            return exceptionHandlerDecorator.decorate($delegate);
        });
    });

    angular.module('trackJs').factory('exceptionHandlerDecorator', function ($window) {
        var decorate = function ($delegate) {
            return function (exception, cause) {
                if ($window.trackJs) {
                    $window.trackJs.track(exception);
                }

                $delegate(exception, cause);
            };
        };

        return {
            decorate: decorate
        };
    });

    angular.module('trackJs').factory('trackJs', function ($window) {

        var ignoreErrorList = [];

        var track = function (message) {
            $window.trackJs.track(message);
        };

        var onError = function (payload) {

            var test = function (what, where) {
                return (what instanceof RegExp) ? what.test(where) : what === where;
            };

            var checkNetwork = function (expectedValue, networkProperty) {
                return payload.network
                    .map(function (request) {
                        return test(expectedValue, request[networkProperty]);
                    })
                    .some(function (error) {
                        return test(error, true);
                    });
            };

            var validateError = function (errorCheck) {

                var errorMatch = [];

                for (var property in errorCheck) {
                    var expectedValue = errorCheck[property];

                    if (property === 'pageUrl') {
                        errorMatch.push(test(expectedValue, payload.url));
                    } else if (property === 'message') {
                        errorMatch.push(test(errorCheck.message, payload.message));
                    } else {
                        errorMatch.push(checkNetwork(expectedValue, property));
                    }
                }

                errorMatch = errorMatch.every(function (error) {
                    return test(error, true);
                });

                return errorMatch;
            };

            return !ignoreErrorList.map(validateError).some(function (error) {
                return test(error, true);
            });
        };

        var ignore = function (list) {
            ignoreErrorList = ignoreErrorList.concat(list);

            this.configure({
                onError: onError
            });
        };

        return {
            track: track,
            ignore: ignore,
            configure: configure($window),
            onError: onError
        };
    });

    angular.module('trackJs').provider('TrackJs', function () {
        this.configure = configure(window);
        this.$get = angular.noop;
    });

})
(angular);
