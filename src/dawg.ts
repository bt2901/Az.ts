import { readStringMapDawg, readByteCompletionDawg } from 'dawgjs/factories';

import { ByteDawg } from 'dawgjs/byte_dawg';
import { ByteMapDawg } from 'dawgjs/byte_map_dawg';
import { MapDawg } from 'dawgjs/map_dawg';
import { ByteCompletionDawg } from 'dawgjs/byte_completion_dawg';
import { encodeUtf8 } from 'dawgjs/codec';

export class Dawg {
    private format;
    private dawgjs;

    constructor(buffer: ArrayBuffer, format: string) {
        this.format = format;

        if (format === 'words') {
            this.dawgjs = readStringMapDawg(buffer, this.deserializerWord, 1, true);
        }
        if (format === 'probs') {
            this.dawgjs = readStringMapDawg(buffer, this.deserializerProbs, 1, true);
        }
        if (format === 'int') {
            this.dawgjs = readByteCompletionDawg(buffer);
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
        const index = this.dawgjs?.dictionary?.followBytes(encodeUtf8(str));
        const hasValue = this.dawgjs?.dictionary?.hasValue(index);
        const value = this.dawgjs?.dictionary?.value(index) ^ (1 << 31);

        if (hasValue && typeof value !== 'undefined') {
            return value;
        }
        return undefined;
    }

    private getStr(str: string) {
        const indexes = this.dawgjs.getArray(str);

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
