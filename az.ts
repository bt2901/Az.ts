import { DAWG } from './dawg';
import { Tag } from './tag';
import { getParsers } from './parsers';

const defaults = {
    ignoreCase: this,
    parsers: [
        'Dictionary?',
        'PrefixKnown',
        'PrefixUnknown?',
        'SuffixKnown?',
    ],
    forceParse: false,
    normalizeScore: true
};

export class AzClass {
    private initialized;
    private knownPrefixes;
    private prefixes;
    private particles;
    private initials;
    private replacements;
    private words;
    private predictionSuffixes;
    private probabilities;
    private grammemes;
    private tags;
    private config;
    private suffixes;
    private paradigms;
    private parsers;
    private UNKN;

    constructor() {

    }

    init(files) {
        this.initialized = false;

        let tagsInt;

        this.knownPrefixes = files['config.json'].knownPrefixes;
        this.prefixes = files['config.json'].prefixes;
        this.particles = files['config.json'].particles;
        this.initials = files['config.json'].initials;
        this.replacements = files['config.json'].replacements;

        this.words = new DAWG(files['words.dawg'], 'words');

        this.predictionSuffixes = new Array(3);

        for (let prefix = 0; prefix < 3; prefix++) {
            this.predictionSuffixes[prefix] = new DAWG(files[`prediction-suffixes-${prefix}.dawg`], 'probs');
        }

        if (files['p_t_given_w.intdawg']) {
            this.probabilities = new DAWG(files['p_t_given_w.intdawg'], 'int');
        }

        const parent = { parent: 'POST' };

        this.grammemes = {
            'NUMB': parent,
            'ROMN': parent,
            'LATN': parent,
            'PNCT': parent,
            'UNKN': parent,
        };

        const grammemesJson = files['grammemes.json'];

        for (let i = 0; i < grammemesJson.length; i++) {
            this.grammemes[grammemesJson[i][0]] = this.grammemes[grammemesJson[i][2]] = {
                parent: grammemesJson[i][1],
                internal: grammemesJson[i][0],
                external: grammemesJson[i][2],
                externalFull: grammemesJson[i][3]
            }
        }

        tagsInt = files['gramtab-opencorpora-int.json'];

        this.tags = Array(tagsInt.length);

        for (let i = 0; i < tagsInt.length; i++) {
            this.tags[i] = new Tag(this.grammemes, tagsInt[i]);
        }

        this.suffixes = files['suffixes.json'];

        const list = new Uint16Array(files['paradigms.array']);
        const count = list[0];
        let pos = 1;

        this.paradigms = [];
        for (let i = 0; i < count; i++) {
            const size = list[pos++];

            this.paradigms.push(list.subarray(pos, pos + size));
            pos += size;
        }

        this.parsers = getParsers(
            this.words,
            this.paradigms,
            this.tags,
            this.prefixes,
            this.suffixes,
            this.predictionSuffixes,
            this.replacements,
            this.initials,
            this.particles,
            this.knownPrefixes,
        );

        this.UNKN = new Tag(this.grammemes, 'UNKN');

        this.initialized = true;
    }

    inflect() {

    }

    morph(word, config) {
        if (!this.initialized) {
            throw new Error('Please call Az.Morph.init() before using this module.');
        }

        this.config = config ? Object.assign(defaults, config) : defaults;

        var parses = [];
        var matched = false;
        for (var i = 0; i < this.config.parsers.length; i++) {
            var name = this.config.parsers[i];
            var terminal = name[name.length - 1] != '?';
            name = terminal ? name : name.slice(0, -1);

            var vars = this.parsers[name](word, this.config);
            for (var j = 0; j < vars.length; j++) {
                vars[j].parser = name;
                matched = true;
            }

            parses = parses.concat(vars);
            if (matched && terminal) {
                break;
            }
        }

        if (!parses.length && this.config.forceParse) {
            parses.push({
                word,
                tag: this.UNKN,
            });
        }

        var total = 0;
        for (var i = 0; i < parses.length; i++) {
            if (parses[i].parser == 'Dictionary') {
                var res = this.probabilities?.findAll(parses[i] + ':' + parses[i].tag);
                if (res && res[0]) {
                    parses[i].score = res[0][1] / 1000000;
                    total += parses[i].score;
                } else {
                    parses[i].score = 1;
                    total += parses[i].score;
                }
            }
        }

        // Normalize Dictionary & non-Dictionary scores separately
        if (this.config.normalizeScore) {
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

        parses.sort( (a, b) => b.score - a.score);

        return parses;
    }
}

let instance;

function getInstance() {
    if (!instance) {
        instance = new AzClass();
    }

    return instance;
}

export const Az = getInstance();
