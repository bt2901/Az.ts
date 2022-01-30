import { Parse } from "./parse";
import { DictionaryParse } from "./dictionaryParse";
import { makeTag } from "./tag";

const autoTypos = [4, 9];

function lookup(dawg, word, config, replacements) {
    var entries;
    if (config.typos == 'auto') {
        entries = dawg.findAll(word, replacements, config.stutter, 0);
        for (var i = 0; i < autoTypos.length && !entries.length && word.length > autoTypos[i]; i++) {
            entries = dawg.findAll(word, replacements, config.stutter, i + 1);
        }
    } else {
        entries = dawg.findAll(word, replacements, config.stutter, config.typos);
    }
    return entries;
}

export const CombinedParse = function (left, right) {
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

export function getParsers(
    words,
    paradigms,
    tags,
    prefixes,
    suffixes,
    predictionSuffixes,
    replacements,
    initials,
    particles,
    knownPrefixes,
    grammemes,
) {
    const Parsers: any = {}

    Parsers.Dictionary = function (word, config) {
        var isCapitalized =
            !config.ignoreCase && word.length &&
            (word[0].toLocaleLowerCase() != word[0]) &&
            (word.substr(1).toLocaleUpperCase() != word.substr(1));
        word = word.toLocaleLowerCase();

        var opts = lookup(words, word, config, replacements);

        var vars = [];
        for (var i = 0; i < opts.length; i++) {
            for (var j = 0; j < opts[i][1].length; j++) {
                var w = new DictionaryParse(
                    paradigms,
                    tags,
                    prefixes,
                    suffixes,
                    opts[i][0],
                    opts[i][1][j][0],
                    opts[i][1][j][1],
                    opts[i][2],
                    opts[i][3],
                );
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
                    grammemes,
                    'NOUN,inan,' + ['masc', 'femn', 'neut'][i] + ',Fixd,Abbr ' + ['sing', 'plur'][k] + ',' + ['nomn', 'gent', 'datv', 'accs', 'ablt', 'loct'][j],
                    'СУЩ,неод,' + ['мр', 'жр', 'ср'][i] + ',0,аббр ' + ['ед', 'мн'][k] + ',' + ['им', 'рд', 'дт', 'вн', 'тв', 'пр'][j]
                ));
            }
        }
    }

// Произвольные аббревиатуры (несклоняемые)
// ВК, ЖК, ССМО, ОАО, ЛенСпецСМУ
    Parsers.Abbr = function (word, config) {
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
                    grammemes,
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

    Parsers.AbbrName = InitialsParser(false, 0.1);
    Parsers.AbbrPatronymic = InitialsParser(true, 0.1);

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

    Parsers.IntNumber = RegexpParser(
        /^[−-]?[0-9]+$/,
        makeTag(grammemes, 'NUMB,intg', 'ЧИСЛО,цел'), 0.9);

    Parsers.RealNumber = RegexpParser(
        /^[−-]?([0-9]*[.,][0-9]+)$/,
        makeTag(grammemes, 'NUMB,real', 'ЧИСЛО,вещ'), 0.9);

    Parsers.Punctuation = RegexpParser(
        /^[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]+$/,
        makeTag(grammemes, 'PNCT', 'ЗПР'), 0.9);

    Parsers.RomanNumber = RegexpParser(
        /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/,
        makeTag(grammemes, 'ROMN', 'РИМ'), 0.9);

    Parsers.Latin = RegexpParser(
        /[A-Za-z\u00C0-\u00D6\u00D8-\u00f6\u00f8-\u024f]$/,
        makeTag(grammemes, 'LATN', 'ЛАТ'), 0.9);

// слово + частица
// смотри-ка
    Parsers.HyphenParticle = function (word, config) {
        word = word.toLocaleLowerCase();

        var vars = [];
        for (var k = 0; k < particles.length; k++) {
            if (word.substr(word.length - particles[k].length) == particles[k]) {
                var base = word.slice(0, -particles[k].length);
                var opts = lookup(words, base, config, replacements);

                //console.log(opts);
                for (var i = 0; i < opts.length; i++) {
                    for (var j = 0; j < opts[i][1].length; j++) {
                        var w = new DictionaryParse(
                            paradigms,
                            tags,
                            prefixes,
                            suffixes,
                            opts[i][0],
                            opts[i][1][j][0],
                            opts[i][1][j][1],
                            opts[i][2],
                            opts[i][3],
                            '',
                            particles[k],
                        );
                        w.score *= 0.9;
                        vars.push(w);
                    }
                }
            }
        }

        return vars;
    }

    var ADVB = makeTag(grammemes, 'ADVB', 'Н');

// 'по-' + прилагательное в дательном падеже
// по-западному
    Parsers.HyphenAdverb = function (word, config) {
        word = word.toLocaleLowerCase();

        if ((word.length < 5) || (word.substr(0, 3) != 'по-')) {
            return [];
        }

        var opts = lookup(words, word.substr(3), config, replacements);

        var parses = [];
        var used = {};

        for (var i = 0; i < opts.length; i++) {
            if (!used[opts[i][0]]) {
                for (var j = 0; j < opts[i][1].length; j++) {
                    var parse = new DictionaryParse(
                        paradigms,
                        tags,
                        prefixes,
                        suffixes,
                        opts[i][0],
                        opts[i][1][j][0],
                        opts[i][1][j][1],
                        opts[i][2],
                        opts[i][3],
                    );
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
    Parsers.HyphenWords = function (word, config) {
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
                var right = Parsers.Dictionary(end, config);
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
        var left = Parsers.Dictionary(parts[0], config);
        var right = Parsers.Dictionary(parts[1], config);


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

    Parsers.PrefixKnown = function (word, config) {
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
                var right = Parsers.Dictionary(end, config);
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

    Parsers.PrefixUnknown = function (word, config) {
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
            var right = Parsers.Dictionary(end, config);
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
    Parsers.SuffixKnown = function (word, config) {
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
                var entries = predictionSuffixes[i].findAll(right, replacements, 0, 0);
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
                            paradigms,
                            tags,
                            prefixes,
                            suffixes,
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

    return Parsers;
}
