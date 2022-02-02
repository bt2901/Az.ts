/**
 * Тег. Содержит в себе информацию о конкретной форме слова, но при этом
 * к конкретному слову не привязан. Всевозможные значения тегов переиспользуются
 * для всех разборов слов.
 *
 * Все граммемы навешаны на тег как поля. Если какая-то граммема содержит в себе
 * дочерние граммемы, то значением поля является именно название дочерней
 * граммемы (например, tag.GNdr == 'masc'). В то же время для дочерних граммем
 * значением является просто true (т.е. условие можно писать и просто как
 * if (tag.masc) ...).
 *
 * @property {string[]} stat Полный список неизменяемых граммем.
 * @property {string[]} flex Полный список изменяемых граммем.
 * @property {Tag} ext Копия тега с русскими обозначениями (по версии OpenCorpora).
 */
export const Tag = function (grammemes, str) {
    var par, pair = str.split(' ');
    this.stat = pair[0].split(',');
    this.flex = pair[1] ? pair[1].split(',') : [];
    for (var j = 0; j < 2; j++) {
        var grams = this[['stat', 'flex'][j]];
        for (var i = 0; i < grams.length; i++) {
            var gram = grams[i];
            this[gram] = true;
            // loc2 -> loct -> CAse
            while (grammemes[gram] && (par = grammemes[gram].parent)) {
                this[par] = gram;
                gram = par;
            }
        }
    }
    if ('POST' in this) {
        this.POS = this.POST;
    }
}

/**
 * Возвращает текстовое представление тега.
 *
 * @returns {string} Список неизменяемых граммем через запятую, пробел,
 *  и список изменяемых граммем через запятую.
 */
Tag.prototype.toString = function () {
    return (this.stat.join(',') + ' ' + this.flex.join(',')).trim();
}

/**
 * Проверяет согласованность с конкретными значениями граммем либо со списком
 * граммем из другого тега (или слова).
 *
 * @param {Tag|Parse} [tag] Тег или разбор слова, с которым следует
 *  проверить согласованность.
 * @param {Array|Object} grammemes Граммемы, по которым нужно проверить
 *  согласованность.
 *
 *  Если указан тег (или разбор), то grammemes должен быть массивом тех
 *  граммем, которые у обоих тегов должны совпадать. Например:
 *  tag.matches(otherTag, ['POS', 'GNdr'])
 *
 *  Если тег не указан, а указан массив граммем, то проверяется просто их
 *  наличие. Например, аналог выражения (tag.NOUN && tag.masc):
 *  tag.matches([ 'NOUN', 'masc' ])
 *
 *  Если тег не указан, а указан объект, то ключи в нем — названия граммем,
 *  значения — дочерние граммемы, массивы граммем, либо true/false:
 *  tag.matches({ 'POS' : 'NOUN', 'GNdr': ['masc', 'neut'] })
 * @returns {boolean} Является ли текущий тег согласованным с указанным.
 */
// TODO: научиться понимать, что некоторые граммемы можно считать эквивалентными при сравнении двух тегов (вариации падежей и т.п.)
Tag.prototype.matches = function (tag: any, grammemes) {
    if (!grammemes) {
        if (Array.isArray(tag)) {
            for (var i = 0; i < tag.length; i++) {
                if (!this[tag[i]]) {
                    return false;
                }
            }
            return true;
        } else
            // Match to map
            for (var k in tag) {
                if (Array.isArray(tag[k])) {
                    if (!tag[k].indexOf(this[k])) {
                        return false;
                    }
                } else {
                    if (tag[k] != this[k]) {
                        return false;
                    }
                }
            }
        return true;
    }

    // Match to another tag
    for (var i = 0; i < grammemes.length; i++) {
        if (tag[grammemes[i]] != this[grammemes[i]]) {
            // Special case: tag.CAse
            return false;
        }
    }
    return true;
}

Tag.prototype.isProductive = function () {
    return !(this.NUMR || this.NPRO || this.PRED || this.PREP ||
        this.CONJ || this.PRCL || this.INTJ || this.Apro ||
        this.NUMB || this.ROMN || this.LATN || this.PNCT ||
        this.UNKN);
}

Tag.prototype.isCapitalized = function () {
    return this.Name || this.Surn || this.Patr || this.Geox || this.Init;
}
