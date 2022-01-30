import { Parse } from './parse';
import { getDictionaryScore } from './getDictionaryScore';

export const DictionaryParse = function (
    paradigms?: any,
    tags?: any,
    prefixes?: any,
    suffixes?: any,
    word?: any,
    paradigmIdx?: any,
    formIdx?: any,
    stutterCnt?: any,
    typosCnt?: any,
    prefix?: any,
    suffix?: any,
) {
    this.paradigms = paradigms;
    this.tags = tags;
    this.prefixes = prefixes;
    this.suffixes = suffixes;

    this.word = word;
    this.paradigmIdx = paradigmIdx;
    this.paradigm = this.paradigms[paradigmIdx];
    this.formIdx = formIdx;
    this.formCnt = this.paradigm.length / 3;
    this.tag = this.tags[this.paradigm[this.formCnt + formIdx]];
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
            this.prefixes[this.paradigm[(this.formCnt << 1) + this.formIdx]].length,
            this.word.length - this.suffixes[this.paradigm[this.formIdx]].length)
    );
}

// Склоняет/спрягает слово так, чтобы оно соответствовало граммемам другого слова, тега или просто конкретным граммемам (подробнее см. Tag.prototype.matches).
// Всегда выбирается первый подходящий вариант.
DictionaryParse.prototype.inflect = function (tag, grammemes) {
    if (!grammemes && typeof tag === 'number') {
        // Inflect to specific formIdx
        return new DictionaryParse(
            this.paradigms,
            this.tags,
            this.prefixes,
            this.suffixes,
            this.prefixes[this.paradigm[(this.formCnt << 1) + tag]] +
            this.base() +
            this.suffixes[this.paradigm[tag]],
            this.paradigmIdx,
            tag, 0, 0, this.prefix, this.suffix
        );
    }

    for (var formIdx = 0; formIdx < this.formCnt; formIdx++) {
        if (this.tags[this.paradigm[this.formCnt + formIdx]].matches(tag, grammemes)) {
            return new DictionaryParse(
                this.paradigms,
                this.tags,
                this.prefixes,
                this.suffixes,
                this.prefixes[this.paradigm[(this.formCnt << 1) + formIdx]] +
                this.base() +
                this.suffixes[this.paradigm[formIdx]],
                this.paradigmIdx,
                formIdx, 0, 0, this.prefix, this.suffix
            );
        }
    }

    return false;
}

DictionaryParse.prototype.toString = function () {
    if (this.prefix) {
        var pref = this.prefixes[this.paradigm[(this.formCnt << 1) + this.formIdx]];
        return pref + this.prefix + this.word.substr(pref.length) + this.suffix;
    } else {
        return this.word + this.suffix;
    }
}
