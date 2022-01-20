
/**
 * Один из возможных вариантов морфологического разбора.
 *
 * @property {string} word Слово в текущей форме (с исправленными ошибками,
 *  если они были)
 * @property {Tag} tag Тег, описывающий текущую форму слова.
 * @property {number} score Число от 0 до 1, соответствующее «уверенности»
 *  в данном разборе (чем оно выше, тем вероятнее данный вариант).
 * @property {number} stutterCnt Число «заиканий», исправленных в слове.
 * @property {number} typosCnt Число опечаток, исправленных в слове.
 */
export const Parse = function (word, tag, score, stutterCnt, typosCnt) {
    this.word = word;
    this.tag = tag;
    this.stutterCnt = stutterCnt || 0;
    this.typosCnt = typosCnt || 0;
    this.score = score || 0;
}

/**
 * Приводит слово к его начальной форме.
 *
 * @param {boolean} keepPOS Не менять часть речи при нормализации (например,
 *  не делать из причастия инфинитив).
 * @returns {Parse} Разбор, соответствующий начальной форме или False,
 *  если произвести нормализацию не удалось.
 */
// TODO: некоторые смены частей речи, возможно, стоит делать в любом случае (т.к., например, компаративы, краткие формы причастий и прилагательных разделены, инфинитив отделен от глагола)
Parse.prototype.normalize = function (keepPOS) {
    return this.inflect(keepPOS ? { POS: this.tag.POS } : 0);
}

/**
 * Приводит слово к указанной форме.
 *
 * @param {Tag|Parse} [tag] Тег или другой разбор слова, с которым следует
 *  согласовать данный.
 * @param {Array|Object} grammemes Граммемы, по которым нужно согласовать слово.
 * @returns {Parse|False} Разбор, соответствующий указанной форме или False,
 *  если произвести согласование не удалось.
 * @see Tag.matches
 */
Parse.prototype.inflect = function (tag, grammemes) {
    return this;
}

/**
 * Приводит слово к форме, согласующейся с указанным числом.
 * Вместо конкретного числа можно указать категорию (согласно http://www.unicode.org/cldr/charts/29/supplemental/language_plural_rules.html).
 *
 * @param {number|string} number Число, с которым нужно согласовать данное слово или категория, описывающая правило построения множественного числа.
 * @returns {Parse|False} Разбор, соответствующий указанному числу или False,
 *  если произвести согласование не удалось.
 */
Parse.prototype.pluralize = function (number) {
    if (!this.tag.NOUN && !this.tag.ADJF && !this.tag.PRTF) {
        return this;
    }

    if (typeof number == 'number') {
        number = number % 100;
        if ((number % 10 == 0) || (number % 10 > 4) || (number > 4 && number < 21)) {
            number = 'many';
        } else if (number % 10 == 1) {
            number = 'one';
        } else {
            number = 'few';
        }
    }

    if (this.tag.NOUN && !this.tag.nomn && !this.tag.accs) {
        return this.inflect([number == 'one' ? 'sing' : 'plur', this.tag.CAse]);
    } else if (number == 'one') {
        return this.inflect(['sing', this.tag.nomn ? 'nomn' : 'accs'])
    } else if (this.tag.NOUN && (number == 'few')) {
        return this.inflect(['sing', 'gent']);
    } else if ((this.tag.ADJF || this.tag.PRTF) && this.tag.femn && (number == 'few')) {
        return this.inflect(['plur', 'nomn']);
    } else {
        return this.inflect(['plur', 'gent']);
    }
}

/**
 * Проверяет, согласуется ли текущая форма слова с указанной.
 *
 * @param {Tag|Parse} [tag] Тег или другой разбор слова, с которым следует
 *  проверить согласованность.
 * @param {Array|Object} grammemes Граммемы, по которым нужно проверить
 *  согласованность.
 * @returns {boolean} Является ли текущая форма слова согласованной с указанной.
 * @see Tag.matches
 */
Parse.prototype.matches = function (tag, grammemes) {
    return this.tag.matches(tag, grammemes);
}

/**
 * Возвращает текущую форму слова.
 *
 * @returns {String} Текущая форма слова.
 */
Parse.prototype.toString = function () {
    return this.word;
}

// Выводит информацию о слове в консоль.
Parse.prototype.log = function () {
    console.group(this.toString());
    console.log('Stutter?', this.stutterCnt, 'Typos?', this.typosCnt);
    console.log(this.tag.ext.toString());
    console.groupEnd();
}
