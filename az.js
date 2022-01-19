import { DAWG } from './az.dawg';
import { Morph } from './az.morph';

export const Az = {
    load: function (url, responseType, callback) {
        fetch(url)
            .then((res) => res[responseType]())
            .then(callback);
    },
    extend: function () {
        const result = {};

        for (let i = 0; i < arguments.length; i++) {
            for (const key in arguments[i]) {
                result[key] = arguments[i][key];
            }
        }

        return result;
    },
    DAWG,
    Morph,
};
