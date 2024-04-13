import { DictionaryParse } from "./dictionaryParse";
import { Dawg } from './dawg';
import { Tag } from './tag';
import { Grammeme, Files, ParseResult, defaults } from './types';


export function getParsers(
    words: Dawg,
    paradigms: Uint16Array[],
    tags: Tag[],
    prefixes: string[],
    suffixes: string[],
    predictionSuffixes: Dawg[],
    replacements: string[][] | undefined,
    particles: string[],
    knownPrefixes: string[],
) {
    const Parsers: { [key: string]: (word: string, config: any) => DictionaryParse[] } = {}

    Parsers['Dictionary'] = function (word: string, config: typeof defaults) {
        config = config ? { ...defaults, ...config } : defaults;
        var isCapitalized =
            !config.ignoreCase && word.length &&
            (word[0]!.toLocaleLowerCase() != word[0]) &&
            (word.substr(1).toLocaleUpperCase() != word.substr(1));
        word = word.toLocaleLowerCase();

        var opts = words.findAll(word,replacements);

        var vars = [];
        for (var opts_entry of opts) {
            for (var entry of opts_entry![1]) {
                var w = new DictionaryParse(
                    paradigms,
                    tags,
                    prefixes,
                    suffixes,
                    opts_entry![0],
                    entry[0],
                    entry[1],
                );
                if (config.ignoreCase || !w.tag.isCapitalized() || isCapitalized) {
                    vars.push(w);
                }
            }
        }

        return vars;
    }

    Parsers['PrefixKnown'] = function (word: string, config?: typeof defaults) {
        config = config ? { ...defaults, ...config } : defaults;
        var isCapitalized =
            !config.ignoreCase && word.length &&
            (word[0]!.toLocaleLowerCase() != word[0]) &&
            (word.substr(1).toLocaleUpperCase() != word.substr(1));
        word = word.toLocaleLowerCase();
        var parses = [];
        for (const knownPref of knownPrefixes) {
            if (word.length - knownPref.length < 3) {
                continue;
            }

            if (word.substr(0, knownPref.length) == knownPref) {
                var end = word.substr(knownPref.length);
                const right = Parsers['Dictionary']!(end, config);
                for (const entry of right) {
                    if (!entry.tag || !entry.tag.isProductive()) {
                        continue;
                    }
                    if (!config.ignoreCase && entry.tag.isCapitalized() && !isCapitalized) {
                        continue;
                    }
                    entry.score *= 0.7;
                    entry.prefix = knownPref;
                    parses.push(entry);
                }

            }
        }
        return parses;
    }

    Parsers['PrefixUnknown'] = function (word: string, config?: typeof defaults) {
        config = config ? { ...defaults, ...config } : defaults;
        var isCapitalized =
            !config.ignoreCase && word.length &&
            (word[0]!.toLocaleLowerCase() != word[0]) &&
            (word.substr(1).toLocaleUpperCase() != word.substr(1));
        word = word.toLocaleLowerCase();
        var parses = [];
        for (var len = 1; len <= 5; len++) {
            if (word.length - len < 3) {
                break;
            }
            var end = word.substr(len);
            const right = Parsers['Dictionary']!(end, config);
            for (const entry of right) {
                if (!entry.tag || !entry.tag.isProductive()) {
                    continue;
                }
                if (!config.ignoreCase && entry.tag.isCapitalized() && !isCapitalized) {
                    continue;
                }
                entry.score *= 0.3;
                entry.prefix = word.substr(0, len);
                parses.push(entry);
            }
        }
        return parses;
    }

    // Отличие от предсказателя по суффиксам в pymorphy2: найдя подходящий суффикс, проверяем ещё и тот, что на символ короче
    Parsers['SuffixKnown'] = function (word: string, config?: typeof defaults) {
        config = config ? { ...defaults, ...config } : defaults;
        if (word.length < 4) {
            return [];
        }
        var isCapitalized =
            !config.ignoreCase && word.length &&
            (word[0]!.toLocaleLowerCase() != word[0]) &&
            (word.substr(1).toLocaleUpperCase() != word.substr(1));
        word = word.toLocaleLowerCase();
        var parses = [];
        var minlen = 1;
        var coeffs = [0, 0.2, 0.3, 0.4, 0.5, 0.6];
        const used: { [key: string]: boolean } = {};
        for (var i = 0; i < prefixes.length; i++) {
            if (prefixes[i]!.length && (word.substr(0, prefixes[i]!.length) != prefixes[i])) {
                continue;
            }
            var base = word.substr(prefixes[i]!.length);
            for (var len = 5; len >= minlen; len--) {
                if (len >= base.length) {
                    continue;
                }
                var left = base.substr(0, base.length - len);
                var right = base.substr(base.length - len);
                // TODO: я просто взял и удалил (0, 0), так можно? откуда это взялось?
                // var entries = predictionSuffixes[i]!.findAll(right, replacements, 0, 0);
                var entries = predictionSuffixes[i]!.findAll(right, replacements);
                if (!entries) {
                    continue;
                }

                var p = [];
                var max = 1;
                for (const entry of entries) {
                    const suffix = entry![0];
                    const stats = entry![1];

                    for (const stats_entry of stats) {
                        if (stats_entry.length < 3) {
                          throw new Error('Corrupted data!');
                        }
                        var parse = new DictionaryParse(
                            paradigms,
                            tags,
                            prefixes,
                            suffixes,
                            prefixes[i] + left + suffix,
                            stats_entry[1],
                            stats_entry[2],
                            );
                        // Why there is even non-productive forms in suffix DAWGs?
                        if (!parse.tag || !parse.tag.isProductive()) {
                            continue;
                        }
                        if (!config.ignoreCase && parse.tag.isCapitalized() && !isCapitalized) {
                            continue;
                        }
                        const key = parse.toString() + ':' + stats_entry[1] + ':' + stats_entry[2];
                        if (key in used) {
                            continue;
                        }
                        max = Math.max(max, stats_entry[0]);
                        parse.score = stats_entry![0] * (coeffs[len] as number);
                        p.push(parse);
                        used[key] = true;
                    }
                }
                if (p.length > 0) {
                    for (let p_entry of p) {
                        p_entry.score /= max;
                    }
                    parses.push(...p);
                    // Check also suffixes 1 letter shorter
                    minlen = Math.max(len - 1, 1);
                }
            }
        }
        return parses;
    }

    return Parsers;
}
