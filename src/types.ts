import { Tag } from './tag';

export const defaults = {
    ignoreCase: true,
    parsers: [
        'Dictionary?',
        'PrefixKnown',
        'PrefixUnknown?',
        'SuffixKnown?',
    ],
    forceParse: false,
    normalizeScore: true
};

export interface Grammeme {
    internal: string;
    parent: string;
    external: string;
    externalFull: string;
}

export interface Files {
    [key: string]: any;
}

export interface ParseResult {
    parser: string;
    score: number;
    tag: Tag;
}
