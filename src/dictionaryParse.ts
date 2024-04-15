import { Tag } from './tag';

export class DictionaryParse {
    private paradigms: Uint16Array[];
    private tags: any[];
    private prefixes: string[];
    private suffixes: string[];

    public word: string;
    public paradigmIdx: number;
    public formIdx: number;
    public prefix: string = "";
    public suffix: string = "";

    private _base?: string;
    private formCnt: number;
    private paradigm: Uint16Array;
    public tag: Tag;
    public parser: string = "None";
    public score: number = 1;

    constructor(
        paradigms: Uint16Array[],
        tags: any[],
        prefixes: string[],
        suffixes: string[],
        word: string,
        paradigmIdx: number,
        formIdx: number,
        prefix: string = "",
        suffix: string = "",
    ) {
        this.paradigms = paradigms;
        this.tags = tags;
        this.prefixes = prefixes;
        this.suffixes = suffixes;
        this.word = word;
        this.paradigmIdx = paradigmIdx;
        this.paradigm = (this.paradigms![paradigmIdx] as Uint16Array);
        this.formIdx = formIdx;
        this.formCnt = this.paradigm.length / 3;
        this.tag = this.tags[(this.paradigm[this.formCnt + formIdx] as number)];
        this.prefix = prefix || '';
        this.suffix = suffix || '';
    }
    private getPref(someFormIdx: number): string {
        const prefIdx = this.paradigm[(this.formCnt << 1) + someFormIdx]
        if (typeof prefIdx === "undefined"){
            throw new Error('Non-existing form');
        }
        return (this.prefixes![prefIdx] as string)
    }
    private getSuf(someFormIdx: number): string {
        const sufIdx = this.paradigm[someFormIdx]
        if (typeof sufIdx === "undefined"){
            throw new Error('Non-existing form');
        }
        return (this.suffixes![sufIdx] as string)
    }

    public base(): string {
        if (this._base) {
            return this._base;
        }

        this._base = this.word.substring(
            this.getPref(this.formIdx).length,
            this.word.length - this.getSuf(this.formIdx).length,
        );

        return this._base;
    }

    public inflect(tag: any, grammemes?: any): DictionaryParse | false {
        if (!grammemes && typeof tag === 'number') {
            // Inflect to specific formIdx
            return new DictionaryParse(
                this.paradigms,
                this.tags,
                this.prefixes,
                this.suffixes,
                this.getPref(tag) + this.base() + this.getSuf(tag),
                this.paradigmIdx,
                tag,
                this.prefix,
                this.suffix,
            );
        }

        for (let formIdx = 0; formIdx < this.formCnt; formIdx++) {
            const newFormIdx = this.paradigm[this.formCnt + formIdx];
            if (typeof newFormIdx === "undefined"){
                throw new Error('Non-existing form');
            }
            if (this.tags[newFormIdx].matches(tag, grammemes)) {
                return new DictionaryParse(
                    this.paradigms,
                    this.tags,
                    this.prefixes,
                    this.suffixes,
                    this.getPref(formIdx) + this.base() + this.getSuf(formIdx),
                    this.paradigmIdx,
                    formIdx,
                    this.prefix,
                    this.suffix,
                );
            }
        }

        return false;
    }

    public toString(): string {
        if (this.prefix) {
            const pref = this.getPref(this.formIdx);
            return pref + this.prefix + this.word.substr(pref.length) + this.suffix;
        } else {
            return this.word + this.suffix;
        }
    }
    public normalize(keepPOS: boolean): DictionaryParse | false {
        return this.inflect(keepPOS ? { POS: this.tag.POS } : 0);
    }
}
