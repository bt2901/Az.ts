import { Dawg } from './dawg';
import { Tag } from './tag';
import { Grammeme, Files, ParseResult, defaults } from './types';
import { getParsers } from './parsers';
import { DictionaryParse } from "./dictionaryParse";


export class AzClass {
    private initialized: boolean = false;
    private knownPrefixes: string[] = [];
    private prefixes: string[] = [];
    private particles: string[] = [];
    private replacements?: string[][];
    private words!: Dawg;
    private predictionSuffixes: Dawg[] = [];
    private probabilities?: Dawg;
    private grammemes: { [key: string]: Grammeme } = {};

    private tags: Tag[] = [];
    private config: typeof defaults = defaults;
    private suffixes: string[] = [];
    private paradigms: Uint16Array[] = [];
    private parsers: { [key: string]: (word: string, config: any) => DictionaryParse[] } = {};

    public init(files: Files) {

        this.knownPrefixes = files['config.json'].knownPrefixes;
        this.prefixes = files['config.json'].prefixes;
        this.particles = files['config.json'].particles;
        this.replacements = files['config.json'].replacements;

        this.words = new Dawg(files['words.dawg'], 'words');

        this.predictionSuffixes = new Array(3);

        for (let prefix = 0; prefix < 3; prefix++) {
            this.predictionSuffixes[prefix] = new Dawg(files[`prediction-suffixes-${prefix}.dawg`], 'probs');
        }

        if (files['p_t_given_w.intdawg']) {
            this.probabilities = new Dawg(files['p_t_given_w.intdawg'], 'int');
        }

        this.grammemes = (files['grammemes.json'] || []).reduce((all: { [key: string]: Grammeme }, [internal, parent, external, externalFull]: string[]) => {
            if (internal === undefined || parent === undefined || external === undefined || externalFull === undefined) { // Check if any value is undefined
                throw new Error('Grammeme file is corrupted: Missing or empty values.');
            }
            const grammeme: Grammeme = { internal, parent, external, externalFull };

            return {
                ...all,
                [internal as string]: grammeme,
                [external as string]: grammeme,
            };
        }, {});


        this.tags = files['gramtab-opencorpora-int.json'].map((tag: string) => new Tag(this.grammemes, tag));
        if (files['gramtab-opencorpora-ext.json']) {
            let ext_tags = files['gramtab-opencorpora-ext.json'].map((tag: string) => new Tag(this.grammemes, tag));
            this.tags.forEach((tag, i) => {
                if (i < ext_tags.length) {
                    tag.ext = ext_tags[i];
                }
            });
        }
        this.suffixes = files['suffixes.json'];

        const list = new Uint16Array(files['paradigms.array']);
        const count = list[0];
        if (count === undefined) {
            throw new Error('Paradigms array is corrupted: Missing count value.');
        }
        let pos = 1;

        for (let i = 0; i < count; i++) {
            const size = list[pos++];
            if (size === undefined) {
                throw new Error('Paradigms array is corrupted: Missing size value.');
            }
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
            this.particles,
            this.knownPrefixes,
        );

        this.initialized = true;

        return this;
    }

    public morph(word: string, config?: typeof defaults) {
        if (!this.initialized) {
            throw new Error('Please call Az.Morph.init() before using this module.');
        }

        this.config = config ? { ...defaults, ...config } : defaults;

        const parses: DictionaryParse[] = [];
        let matched = false;
        for (const unnsureName of this.config.parsers) {
            const terminal = unnsureName[unnsureName.length - 1] !== '?';
            const parserName = terminal ? unnsureName : unnsureName.slice(0, -1);

            const parserFunction = this.parsers[parserName];
            if (parserFunction) {
                const vars = parserFunction(word, this.config);
                for (const variable of vars) {
                    variable.parser = parserName;
                    matched = true;
                }

                parses.push(...vars);
                if (matched && terminal) {
                    break;
                }
            } else {
                throw new Error(`Unknown parser named ${parserName}!`);
            }
        }
        let total = 0;
        for (const parse of parses) {
            if (parse.parser === 'Dictionary') {
                const rawScore = this.probabilities?.getInt(`${parse}:${parse.tag}`);

                if (typeof rawScore !== 'undefined') {
                    parse.score = rawScore / 1000000;
                    total += parse.score;
                } else {
                    parse.score = 1;
                    total += parse.score;
                }
            }
        }

        // Normalize Dictionary & non-Dictionary scores separately
        if (this.config.normalizeScore) {
            if (total > 0) {
                for (const parse of parses) {
                    if (parse.parser === 'Dictionary') {
                        parse.score /= total;
                    }
                }
            }

            total = 0;
            for (const parse of parses) {
                if (parse.parser !== 'Dictionary') {
                    total += parse.score;
                }
            }
            if (total > 0) {
                for (const parse of parses) {
                    if (parse.parser !== 'Dictionary') {
                        parse.score /= total;
                    }
                }
            }
        }

        parses.sort( (a, b) => b.score - a.score);

        return parses;
    }
}

