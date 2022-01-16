import { DAWG } from './az.dawg';
import { Morph } from './az.morph';

export const Az = {
    load: function (url, responseType, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = responseType;

        xhr.onload = function (e) {
            if (xhr.response) {
                callback && callback(null, xhr.response);
            }
        };

        xhr.send(null);
    },
    extend: function () {
        var result = {};
        for (var i = 0; i < arguments.length; i++) {
            for (var key in arguments[i]) {
                result[key] = arguments[i][key];
            }
        }
        return result;
    },
    DAWG,
    Morph,
};
