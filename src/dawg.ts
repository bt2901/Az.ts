import { readStringMapDawg, readByteCompletionDawg } from 'dawgjs/factories';

import { ByteDawg } from 'dawgjs/byte_dawg';
import { ByteMapDawg } from 'dawgjs/byte_map_dawg';
import { MapDawg } from 'dawgjs/map_dawg';
import { ByteCompletionDawg } from 'dawgjs/byte_completion_dawg';
import { encodeUtf8 } from 'dawgjs/codec';

export class Dawg {
    private format;
    private dawgjs_map;
    private dawgjs_byte;

    constructor(buffer: ArrayBuffer, format: string) {
        this.format = format;

        if (format === 'words') {
            this.dawgjs_map = readStringMapDawg(buffer, this.deserializerWord, 1, true);
        }
        if (format === 'probs') {
            this.dawgjs_map = readStringMapDawg(buffer, this.deserializerProbs, 1, true);
        }
        if (format === 'int') {
            this.dawgjs_byte = readByteCompletionDawg(buffer);
        }
    }
    public findAll(str: string, replaces?: string[][]) {
        const results = [
            this.getStr(str),
            ...this.getAllReplaces(str, replaces).map((rep) => this.getStr(rep)),
        ];

        return results.filter(Boolean);
    }
    public getInt(str: string): number | undefined {
        // yes, Az.probabilities.format == "int"
        // while Az.predictionSuffixes[i].format == "probs"
        // go figure
        if (this.format === 'probs' || this.format === 'words' || typeof this.dawgjs_byte === 'undefined') {
            throw new Error('You are trying to access wrong DAWG type.');
        }
        const index = this.dawgjs_byte.dictionary!.followBytes(encodeUtf8(str));
        const hasValue = this.dawgjs_byte.dictionary!.hasValue(index);
        const value = this.dawgjs_byte.dictionary!.value(index) ^ (1 << 31);

        if (hasValue && typeof value !== 'undefined') {
            return value;
        }
        return undefined;
    }

    private getStr(str: string): any[] | undefined {
        if (this.format === 'int' || typeof this.dawgjs_map === 'undefined') {
            throw new Error('You are trying to access wrong DAWG type.');
        }
        const indexes = this.dawgjs_map.getArray(str);

        if (indexes.length) {
            return [
                str,
                indexes,
            ];
        }

        return;
    }
    private getAllReplaces(str: string, replaces?: string[][]): string[] {
        const allReplaces: string[] = [];

        if (!replaces || !replaces.length) {
            return allReplaces;
        }

        for (let i = 0; i < str.length; i++) {
            const char = str[i];

            replaces.forEach(([from, to]) => {
                if (char === from) {
                    allReplaces.push(`${str.slice(0, i)}${to}${str.slice(i + 1)}`);
                }
            });
        }

        return allReplaces;
    }
    private deserializerWord(bytes: Uint8Array): [number, number] {
        let view = new DataView(bytes.buffer);

        const paradigmId = view.getUint16(0);
        const indexInParadigm = view.getUint16(2);

        return [paradigmId, indexInParadigm];
    }
    private deserializerProbs(bytes: Uint8Array): [number, number, number] {
        let view = new DataView(bytes.buffer);

        const paradigmId = view.getUint16(0);
        const indexInParadigm = view.getUint16(2);
        const indexInParadigm2 = view.getUint16(4);

        return [paradigmId, indexInParadigm, indexInParadigm2];
    }
}
