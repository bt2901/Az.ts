import { DAWG } from './dawg';
import { Tag } from './tag';
import { Parse } from './parse';

/** @namespace Index **/
let words;
let probabilities;
let predictionSuffixes;
let prefixes = ['', 'по', 'наи'];
let suffixes;
let grammemes;
let paradigms;
let tags;
const defaults = {
    ignoreCase: false,
    replacements: { 'е': 'ё' },
    stutter: 0,
    typos: 0,
    parsers: [
        // Словарные слова + инициалы
        'Dictionary?', 'AbbrName?', 'AbbrPatronymic',
        // Числа, пунктуация, латиница (по-хорошему, токенизатор не должен эту ерунду сюда пускать)
        'IntNumber', 'RealNumber', 'Punctuation', 'RomanNumber?', 'Latin',
        // Слова с дефисами
        'HyphenParticle', 'HyphenAdverb', 'HyphenWords',
        // Предсказатели по префиксам/суффиксам
        'PrefixKnown', 'PrefixUnknown?', 'SuffixKnown?', 'Abbr'
    ],
    forceParse: false,
    normalizeScore: true
};

let initials;
let particles;
let knownPrefixes;

const autoTypos = [4, 9];
let UNKN;
const __init = [];
let initialized = false;

export function makeTag(tagInt, tagExt) {
    var tag = new Tag(grammemes, tagInt);
    tag.ext = new Tag(grammemes, tagExt);
    return deepFreeze(tag);
}

// Взято из https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
function deepFreeze(obj) {
    if (!('freeze' in Object)) {
        return;
    }

    var propNames = Object.getOwnPropertyNames(obj);
    propNames.forEach(function (name) {
        var prop = obj[name];

        if (typeof prop == 'object' && prop !== null)
            deepFreeze(prop);
    });

    return Object.freeze(obj);
}

/**
 * Производит морфологический анализ слова. Возвращает возможные варианты
 * разбора по убыванию их правдоподобности.
 *
 * @playground
 * var Az = require('az');
 * Az.Morph.init(function() {
 *   console.log(Az.Morph('стали'));
 * });
 * @param {string} word Слово, которое следует разобрать.
 * @param {Object} [config] Опции разбора.
 * @param {boolean} [config.ignoreCase=False] Следует ли игнорировать
 *  регистр слов (в основном это означает возможность написания имен собственных и
 *  инициалов с маленькой буквы).
 * @param {Object} [config.replacements={ 'е': 'ё' }] Допустимые замены букв
 *  при поиске слов в словаре. Ключи объекта — заменяемые буквы в разбираемом
 *  слове, соответствующие им значения — буквы в словарных словах, которым
 *  допустимо встречаться вместо заменяемых. По умолчанию буква «е» может
 *  соответствовать букве «ё» в словарных словах.
 * @param {number} [config.stutter=Infinity] «Заикание». Устраняет повторения букв
 *  (как с дефисом - «не-е-ет», так и без - «нееет»).
 *
 *  Infinity не ограничивает максимальное число повторений (суммарно во всем слове).
 *
 *  0 или false чтобы отключить.
 * @param {number|'auto'} [config.typos=0] Опечатки. Максимальное количество
 * опечаток в слове.
 *
 *  Опечаткой считается:
 *  - лишняя буква в слове
 *  - пропущенная буква в слове (TODO: самый медленный тип опечаток, стоит сделать опциональным)
 *  - не та буква в слове (если правильная буква стоит рядом на клавиатуре)
 *  - переставленные местами соседние буквы
 *
 *  0 или false чтобы отключить.
 *
 *  'auto':
 *  - 0, если слово короче 5 букв
 *  - 1, если слово короче 10 букв (но только если не нашлось варианта разбора без опечаток)
 *  - 2 в противном случае (но только если не нашлось варианта разбора без опечаток или с 1 опечаткой)
 * @param {string[]} [config.parsers] Список применяемых парсеров (см. поля
 *  объекта Az.Morph.Parsers) в порядке применения (т.е. стоящие в начале
 *  имеют наивысший приоритет).
 *
 *  Вопросительный знак означает, что данный парсер не терминальный, то есть
 *  варианты собираются до первого терминального парсера. Иными словами, если
 *  мы дошли до какого-то парсера, значит все стоящие перед ним терминальные
 *  парсеры либо не дали результата совсем, либо дали только с опечатками.
 *
 *  (парсер в терминологии pymorphy2 — анализатор)
 * @param {boolean} [config.forceParse=False] Всегда возвращать хотя бы один вариант
 *  разбора (как это делает pymorphy2), даже если совсем ничего не получилось.
 * @returns {Parse[]} Варианты разбора.
 * @memberof Az
 */
export const Morph = function (word, config) {
    if (!initialized) {
        throw new Error('Please call Az.Morph.init() before using this module.');
    }

    config = config ? Object.assign(defaults, config) : defaults;

    var parses = [];
    var matched = false;
    for (var i = 0; i < config.parsers.length; i++) {
        var name = config.parsers[i];
        var terminal = name[name.length - 1] != '?';
        name = terminal ? name : name.slice(0, -1);
        if (name in Morph.Parsers) {
            var vars = Morph.Parsers[name](word, config);
            for (var j = 0; j < vars.length; j++) {
                vars[j].parser = name;
                if (!vars[j].stutterCnt && !vars[j].typosCnt) {
                    matched = true;
                }
            }

            parses = parses.concat(vars);
            if (matched && terminal) {
                break;
            }
        } else {
            console.warn('Parser "' + name + '" is not found. Skipping');
        }
    }

    if (!parses.length && config.forceParse) {
        parses.push(new Parse(word.toLocaleLowerCase(), UNKN));
    }

    var total = 0;
    for (var i = 0; i < parses.length; i++) {
        if (parses[i].parser == 'Dictionary') {
            var res = probabilities?.findAll(parses[i] + ':' + parses[i].tag);
            if (res && res[0]) {
                parses[i].score = (res[0][1] / 1000000) * getDictionaryScore(parses[i].stutterCnt, parses[i].typosCnt);
                total += parses[i].score;
            } else {
                parses[i].score = 1;
                total += parses[i].score;
            }
        }
    }

    // Normalize Dictionary & non-Dictionary scores separately
    if (config.normalizeScore) {
        if (total > 0) {
            for (var i = 0; i < parses.length; i++) {
                if (parses[i].parser == 'Dictionary') {
                    parses[i].score /= total;
                }
            }
        }

        total = 0;
        for (var i = 0; i < parses.length; i++) {
            if (parses[i].parser != 'Dictionary') {
                total += parses[i].score;
            }
        }
        if (total > 0) {
            for (var i = 0; i < parses.length; i++) {
                if (parses[i].parser != 'Dictionary') {
                    parses[i].score /= total;
                }
            }
        }
    }

    parses.sort(function (e1, e2) {
        return e2.score - e1.score;
    });

    return parses;
}

// TODO: вынести парсеры в отдельный файл(ы)?

Morph.Parsers = {}

function lookup(dawg, word, config) {
    var entries;
    if (config.typos == 'auto') {
        entries = dawg.findAll(word, config.replacements, config.stutter, 0);
        for (var i = 0; i < autoTypos.length && !entries.length && word.length > autoTypos[i]; i++) {
            entries = dawg.findAll(word, config.replacements, config.stutter, i + 1);
        }
    } else {
        entries = dawg.findAll(word, config.replacements, config.stutter, config.typos);
    }
    return entries;
}

function getDictionaryScore(stutterCnt, typosCnt) {
    return Math.pow(0.3, typosCnt) * Math.pow(0.6, Math.min(stutterCnt, 1));
}

var DictionaryParse = function (word, paradigmIdx, formIdx, stutterCnt, typosCnt, prefix, suffix) {
    this.word = word;
    this.paradigmIdx = paradigmIdx;
    this.paradigm = paradigms[paradigmIdx];
    this.formIdx = formIdx;
    this.formCnt = this.paradigm.length / 3;
    this.tag = tags[this.paradigm[this.formCnt + formIdx]];
    this.stutterCnt = stutterCnt || 0;
    this.typosCnt = typosCnt || 0;
    this.score = getDictionaryScore(this.stutterCnt, this.typosCnt);
    this.prefix = prefix || '';
    this.suffix = suffix || '';
}

DictionaryParse.prototype = Object.create(Parse.prototype);
DictionaryParse.prototype.constructor = DictionaryParse;

// Возвращает основу слова
DictionaryParse.prototype.base = function () {
    if (this._base) {
        return this._base;
    }
    return (this._base = this.word.substring(
            prefixes[this.paradigm[(this.formCnt << 1) + this.formIdx]].length,
            this.word.length - suffixes[this.paradigm[this.formIdx]].length)
    );
}

// Склоняет/спрягает слово так, чтобы оно соответствовало граммемам другого слова, тега или просто конкретным граммемам (подробнее см. Tag.prototype.matches).
// Всегда выбирается первый подходящий вариант.
DictionaryParse.prototype.inflect = function (tag, grammemes) {
    if (!grammemes && typeof tag === 'number') {
        // Inflect to specific formIdx
        return new DictionaryParse(
            prefixes[this.paradigm[(this.formCnt << 1) + tag]] +
            this.base() +
            suffixes[this.paradigm[tag]],
            this.paradigmIdx,
            tag, 0, 0, this.prefix, this.suffix
        );
    }

    for (var formIdx = 0; formIdx < this.formCnt; formIdx++) {
        if (tags[this.paradigm[this.formCnt + formIdx]].matches(tag, grammemes)) {
            return new DictionaryParse(
                prefixes[this.paradigm[(this.formCnt << 1) + formIdx]] +
                this.base() +
                suffixes[this.paradigm[formIdx]],
                this.paradigmIdx,
                formIdx, 0, 0, this.prefix, this.suffix
            );
        }
    }

    return false;
}

DictionaryParse.prototype.toString = function () {
    if (this.prefix) {
        var pref = prefixes[this.paradigm[(this.formCnt << 1) + this.formIdx]];
        return pref + this.prefix + this.word.substr(pref.length) + this.suffix;
    } else {
        return this.word + this.suffix;
    }
}

var CombinedParse = function (left, right) {
    this.left = left;
    this.right = right;
    this.tag = right.tag;
    this.score = left.score * right.score * 0.8;
    this.stutterCnt = left.stutterCnt + right.stutterCnt;
    this.typosCnt = left.typosCnt + right.typosCnt;
    if ('formCnt' in right) {
        this.formCnt = right.formCnt;
    }
}

CombinedParse.prototype = Object.create(Parse.prototype);
CombinedParse.prototype.constructor = CombinedParse;

CombinedParse.prototype.inflect = function (tag, grammemes) {
    var left, right;

    var right = this.right.inflect(tag, grammemes);
    if (!grammemes && typeof tag === 'number') {
        left = this.left.inflect(right.tag, ['POST', 'NMbr', 'CAse', 'PErs', 'TEns']);
    } else {
        left = this.left.inflect(tag, grammemes);
    }
    if (left && right) {
        return new CombinedParse(left, right);
    } else {
        return false;
    }
}

CombinedParse.prototype.toString = function () {
    return this.left.word + '-' + this.right.word;
}

__init.push(function () {
    Morph.Parsers.Dictionary = function (word, config) {
        var isCapitalized =
            !config.ignoreCase && word.length &&
            (word[0].toLocaleLowerCase() != word[0]) &&
            (word.substr(1).toLocaleUpperCase() != word.substr(1));
        word = word.toLocaleLowerCase();

        var opts = lookup(words, word, config);

        var vars = [];
        for (var i = 0; i < opts.length; i++) {
            for (var j = 0; j < opts[i][1].length; j++) {
                var w = new DictionaryParse(
                    opts[i][0],
                    opts[i][1][j][0],
                    opts[i][1][j][1],
                    opts[i][2],
                    opts[i][3]);
                if (config.ignoreCase || !w.tag.isCapitalized() || isCapitalized) {
                    vars.push(w);
                }
            }
        }
        return vars;
    }

    var abbrTags = [];
    for (var i = 0; i <= 2; i++) {
        for (var j = 0; j <= 5; j++) {
            for (var k = 0; k <= 1; k++) {
                abbrTags.push(makeTag(
                    'NOUN,inan,' + ['masc', 'femn', 'neut'][i] + ',Fixd,Abbr ' + ['sing', 'plur'][k] + ',' + ['nomn', 'gent', 'datv', 'accs', 'ablt', 'loct'][j],
                    'СУЩ,неод,' + ['мр', 'жр', 'ср'][i] + ',0,аббр ' + ['ед', 'мн'][k] + ',' + ['им', 'рд', 'дт', 'вн', 'тв', 'пр'][j]
                ));
            }
        }
    }

    // Произвольные аббревиатуры (несклоняемые)
    // ВК, ЖК, ССМО, ОАО, ЛенСпецСМУ
    Morph.Parsers.Abbr = function (word, config) {
        // Однобуквенные считаются инициалами и для них заведены отдельные парсеры
        if (word.length < 2) {
            return [];
        }
        // Дефисов в аббревиатуре быть не должно
        if (word.indexOf('-') > -1) {
            return [];
        }
        // Первая буква должна быть заглавной: сокращения с маленькой буквы (типа iOS) мало распространены
        // Последняя буква должна быть заглавной: иначе сокращение, вероятно, склоняется
        if ((initials.indexOf(word[0]) > -1) && (initials.indexOf(word[word.length - 1]) > -1)) {
            var caps = 0;
            for (var i = 0; i < word.length; i++) {
                if (initials.indexOf(word[i]) > -1) {
                    caps++;
                }
            }
            if (caps <= 5) {
                var vars = [];
                for (var i = 0; i < abbrTags.length; i++) {
                    var w = new Parse(word, abbrTags[i], 0.5);
                    vars.push(w);
                }
                return vars;
            }
        }
        // При игнорировании регистра разбираем только короткие аббревиатуры
        // (и требуем, чтобы каждая буква была «инициалом», т.е. без мягких/твердых знаков)
        if (!config.ignoreCase || (word.length > 5)) {
            return [];
        }
        word = word.toLocaleUpperCase();
        for (var i = 0; i < word.length; i++) {
            if (initials.indexOf(word[i]) == -1) {
                return [];
            }
        }
        var vars = [];
        for (var i = 0; i < abbrTags.length; i++) {
            var w = new Parse(word, abbrTags[i], 0.2);
            vars.push(w);
        }
        return vars;
    }

    var InitialsParser = function (isPatronymic, score) {
        var initialsTags = [];
        for (var i = 0; i <= 1; i++) {
            for (var j = 0; j <= 5; j++) {
                initialsTags.push(makeTag(
                    'NOUN,anim,' + ['masc', 'femn'][i] + ',Sgtm,Name,Fixd,Abbr,Init sing,' + ['nomn', 'gent', 'datv', 'accs', 'ablt', 'loct'][j],
                    'СУЩ,од,' + ['мр', 'жр'][i] + ',sg,имя,0,аббр,иниц ед,' + ['им', 'рд', 'дт', 'вн', 'тв', 'пр'][j]
                ));
            }
        }
        return function (word, config) {
            if (word.length != 1) {
                return [];
            }
            if (config.ignoreCase) {
                word = word.toLocaleUpperCase();
            }
            if (initials.indexOf(word) == -1) {
                return [];
            }
            var vars = [];
            for (var i = 0; i < initialsTags.length; i++) {
                var w = new Parse(word, initialsTags[i], score);
                vars.push(w);
            }
            return vars;
        }
    }

    Morph.Parsers.AbbrName = InitialsParser(false, 0.1);
    Morph.Parsers.AbbrPatronymic = InitialsParser(true, 0.1);

    var RegexpParser = function (regexp, tag, score) {
        return function (word, config) {
            if (config.ignoreCase) {
                word = word.toLocaleUpperCase();
            }
            if (word.length && word.match(regexp)) {
                return [new Parse(word, tag)];
            } else {
                return [];
            }
        }
    }

    grammemes['NUMB'] = grammemes['ЧИСЛО'] =
        grammemes['ROMN'] = grammemes['РИМ'] =
            grammemes['LATN'] = grammemes['ЛАТ'] =
                grammemes['PNCT'] = grammemes['ЗПР'] =
                    grammemes['UNKN'] = grammemes['НЕИЗВ'] =
                        { parent: 'POST' };

    Morph.Parsers.IntNumber = RegexpParser(
        /^[−-]?[0-9]+$/,
        makeTag('NUMB,intg', 'ЧИСЛО,цел'), 0.9);

    Morph.Parsers.RealNumber = RegexpParser(
        /^[−-]?([0-9]*[.,][0-9]+)$/,
        makeTag('NUMB,real', 'ЧИСЛО,вещ'), 0.9);

    Morph.Parsers.Punctuation = RegexpParser(
        /^[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]+$/,
        makeTag('PNCT', 'ЗПР'), 0.9);

    Morph.Parsers.RomanNumber = RegexpParser(
        /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/,
        makeTag('ROMN', 'РИМ'), 0.9);

    Morph.Parsers.Latin = RegexpParser(
        /[A-Za-z\u00C0-\u00D6\u00D8-\u00f6\u00f8-\u024f]$/,
        makeTag('LATN', 'ЛАТ'), 0.9);

    // слово + частица
    // смотри-ка
    Morph.Parsers.HyphenParticle = function (word, config) {
        word = word.toLocaleLowerCase();

        var vars = [];
        for (var k = 0; k < particles.length; k++) {
            if (word.substr(word.length - particles[k].length) == particles[k]) {
                var base = word.slice(0, -particles[k].length);
                var opts = lookup(words, base, config);

                //console.log(opts);
                for (var i = 0; i < opts.length; i++) {
                    for (var j = 0; j < opts[i][1].length; j++) {
                        var w = new DictionaryParse(
                            opts[i][0],
                            opts[i][1][j][0],
                            opts[i][1][j][1],
                            opts[i][2],
                            opts[i][3],
                            '', particles[k]);
                        w.score *= 0.9;
                        vars.push(w);
                    }
                }
            }
        }

        return vars;
    }

    var ADVB = makeTag('ADVB', 'Н');

    // 'по-' + прилагательное в дательном падеже
    // по-западному
    Morph.Parsers.HyphenAdverb = function (word, config) {
        word = word.toLocaleLowerCase();

        if ((word.length < 5) || (word.substr(0, 3) != 'по-')) {
            return [];
        }

        var opts = lookup(words, word.substr(3), config);

        var parses = [];
        var used = {};

        for (var i = 0; i < opts.length; i++) {
            if (!used[opts[i][0]]) {
                for (var j = 0; j < opts[i][1].length; j++) {
                    var parse = new DictionaryParse(opts[i][0], opts[i][1][j][0], opts[i][1][j][1], opts[i][2], opts[i][3]);
                    if (parse.matches(['ADJF', 'sing', 'datv'])) {
                        used[opts[i][0]] = true;

                        parse = new Parse('по-' + opts[i][0], ADVB, parse.score * 0.9, opts[i][2], opts[i][3]);
                        parses.push(parse);
                        break;
                    }
                }
            }
        }
        return parses;
    }

    // слово + '-' + слово
    // интернет-магазин
    // компания-производитель
    Morph.Parsers.HyphenWords = function (word, config) {
        word = word.toLocaleLowerCase();
        for (var i = 0; i < knownPrefixes.length; i++) {
            if (knownPrefixes[i][knownPrefixes[i].length - 1] == '-' &&
                word.substr(0, knownPrefixes[i].length) == knownPrefixes[i]) {
                return [];
            }
        }
        var parses = [];
        var parts = word.split('-');
        if (parts.length != 2 || !parts[0].length || !parts[1].length) {
            if (parts.length > 2) {
                var end = parts[parts.length - 1];
                var right = Morph.Parsers.Dictionary(end, config);
                for (var j = 0; j < right.length; j++) {
                    if (right[j] instanceof DictionaryParse) {
                        right[j].score *= 0.2;
                        right[j].prefix = word.substr(0, word.length - end.length - 1) + '-';
                        parses.push(right[j]);
                    }
                }
            }
            return parses;
        }
        var left = Morph.Parsers.Dictionary(parts[0], config);
        var right = Morph.Parsers.Dictionary(parts[1], config);


        // Variable
        for (var i = 0; i < left.length; i++) {
            if (left[i].tag.Abbr) {
                continue;
            }
            for (var j = 0; j < right.length; j++) {
                if (!left[i].matches(right[j], ['POST', 'NMbr', 'CAse', 'PErs', 'TEns'])) {
                    continue;
                }
                if (left[i].stutterCnt + right[j].stutterCnt > config.stutter ||
                    left[i].typosCnt + right[j].typosCnt > config.typos) {
                    continue;
                }
                parses.push(new CombinedParse(left[i], right[j]));
            }
        }
        // Fixed
        for (var j = 0; j < right.length; j++) {
            if (right[j] instanceof DictionaryParse) {
                right[j].score *= 0.3;
                right[j].prefix = parts[0] + '-';
                parses.push(right[j]);
            }
        }

        return parses;
    }

    Morph.Parsers.PrefixKnown = function (word, config) {
        var isCapitalized =
            !config.ignoreCase && word.length &&
            (word[0].toLocaleLowerCase() != word[0]) &&
            (word.substr(1).toLocaleUpperCase() != word.substr(1));
        word = word.toLocaleLowerCase();
        var parses = [];
        for (var i = 0; i < knownPrefixes.length; i++) {
            if (word.length - knownPrefixes[i].length < 3) {
                continue;
            }

            if (word.substr(0, knownPrefixes[i].length) == knownPrefixes[i]) {
                var end = word.substr(knownPrefixes[i].length);
                var right = Morph.Parsers.Dictionary(end, config);
                for (var j = 0; j < right.length; j++) {
                    if (!right[j].tag.isProductive()) {
                        continue;
                    }
                    if (!config.ignoreCase && right[j].tag.isCapitalized() && !isCapitalized) {
                        continue;
                    }
                    right[j].score *= 0.7;
                    right[j].prefix = knownPrefixes[i];
                    parses.push(right[j]);
                }
            }
        }
        return parses;
    }

    Morph.Parsers.PrefixUnknown = function (word, config) {
        var isCapitalized =
            !config.ignoreCase && word.length &&
            (word[0].toLocaleLowerCase() != word[0]) &&
            (word.substr(1).toLocaleUpperCase() != word.substr(1));
        word = word.toLocaleLowerCase();
        var parses = [];
        for (var len = 1; len <= 5; len++) {
            if (word.length - len < 3) {
                break;
            }
            var end = word.substr(len);
            var right = Morph.Parsers.Dictionary(end, config);
            for (var j = 0; j < right.length; j++) {
                if (!right[j].tag.isProductive()) {
                    continue;
                }
                if (!config.ignoreCase && right[j].tag.isCapitalized() && !isCapitalized) {
                    continue;
                }
                right[j].score *= 0.3;
                right[j].prefix = word.substr(0, len);
                parses.push(right[j]);
            }
        }
        return parses;
    }

    // Отличие от предсказателя по суффиксам в pymorphy2: найдя подходящий суффикс, проверяем ещё и тот, что на символ короче
    Morph.Parsers.SuffixKnown = function (word, config) {
        if (word.length < 4) {
            return [];
        }
        var isCapitalized =
            !config.ignoreCase && word.length &&
            (word[0].toLocaleLowerCase() != word[0]) &&
            (word.substr(1).toLocaleUpperCase() != word.substr(1));
        word = word.toLocaleLowerCase();
        var parses = [];
        var minlen = 1;
        var coeffs = [0, 0.2, 0.3, 0.4, 0.5, 0.6];
        var used = {};
        for (var i = 0; i < prefixes.length; i++) {
            if (prefixes[i].length && (word.substr(0, prefixes[i].length) != prefixes[i])) {
                continue;
            }
            var base = word.substr(prefixes[i].length);
            for (var len = 5; len >= minlen; len--) {
                if (len >= base.length) {
                    continue;
                }
                var left = base.substr(0, base.length - len);
                var right = base.substr(base.length - len);
                var entries = predictionSuffixes[i].findAll(right, config.replacements, 0, 0);
                if (!entries) {
                    continue;
                }

                var p = [];
                var max = 1;
                for (var j = 0; j < entries.length; j++) {
                    var suffix = entries[j][0];
                    var stats = entries[j][1];

                    for (var k = 0; k < stats.length; k++) {
                        var parse = new DictionaryParse(
                            prefixes[i] + left + suffix,
                            stats[k][1],
                            stats[k][2]);
                        // Why there is even non-productive forms in suffix DAWGs?
                        if (!parse.tag.isProductive()) {
                            continue;
                        }
                        if (!config.ignoreCase && parse.tag.isCapitalized() && !isCapitalized) {
                            continue;
                        }
                        var key = parse.toString() + ':' + stats[k][1] + ':' + stats[k][2];
                        if (key in used) {
                            continue;
                        }
                        max = Math.max(max, stats[k][0]);
                        parse.score = stats[k][0] * coeffs[len];
                        p.push(parse);
                        used[key] = true;
                    }
                }
                if (p.length > 0) {
                    for (var j = 0; j < p.length; j++) {
                        p[j].score /= max;
                    }
                    parses = parses.concat(p);
                    // Check also suffixes 1 letter shorter
                    minlen = Math.max(len - 1, 1);
                }
            }
        }
        return parses;
    }

    UNKN = makeTag('UNKN', 'НЕИЗВ');
});

Morph.init = function (files) {
    let tagsInt;
    let tagsExt;

    knownPrefixes = files['config.json'].prefixes;
    particles = files['config.json'].particles;
    initials = files['config.json'].initials;

    words = new DAWG(files['words.dawg'], 'words');

    predictionSuffixes = new Array(3);

    for (let prefix = 0; prefix < 3; prefix++) {
        predictionSuffixes[prefix] = new DAWG(files[`prediction-suffixes-${prefix}.dawg`], 'probs');
    }

    if (files['p_t_given_w.intdawg']) {
        probabilities = new DAWG(files['p_t_given_w.intdawg'], 'int');
    } else {
        probabilities = undefined;
    }

    grammemes = {};
    const grammemesJson = files['grammemes.json']
    for (let i = 0; i < grammemesJson.length; i++) {
        grammemes[grammemesJson[i][0]] = grammemes[grammemesJson[i][2]] = {
            parent: grammemesJson[i][1],
            internal: grammemesJson[i][0],
            external: grammemesJson[i][2],
            externalFull: grammemesJson[i][3]
        }
    }

    tagsInt = files['gramtab-opencorpora-int.json'];
    tagsExt = files['gramtab-opencorpora-ext.json'];

    tags = Array(tagsInt.length);

    for (let i = 0; i < tagsInt.length; i++) {
        tags[i] = new Tag(grammemes, tagsInt[i]);
        tags[i].ext = new Tag(grammemes, tagsExt[i]);
    }

    tags = deepFreeze(tags);

    suffixes = files['suffixes.json'];

    const list = new Uint16Array(files['paradigms.array']);
    const count = list[0];
    let pos = 1;

    paradigms = [];
    for (let i = 0; i < count; i++) {
        const size = list[pos++];

        paradigms.push(list.subarray(pos, pos + size));
        pos += size;
    }

    for (let i = 0; i < __init.length; i++) {
        __init[i]();
    }

    initialized = true;
}

