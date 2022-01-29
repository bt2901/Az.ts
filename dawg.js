import { readStringMapDawg, readStringCompletionDawg, readByteCompletionDawg } from 'dawgjs/factories';
import { encodeUtf8, decodeUtf8, b64encode } from 'dawgjs/codec';

export class DAWG {
    constructor(buffer, format) {
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
    findAll(str) {
        if (this.format === 'int') {
            const index = this.dawgjs.dictionary.followBytes(encodeUtf8(str));
            const hasValue = this.dawgjs.dictionary.hasValue(index) ^ (1 << 31);
            const value = this.dawgjs.dictionary.value(index) ^ (1 << 31);

            if (hasValue) {
                return [[str, value]];
            }

            return [];
        }

        const indexes = this.dawgjs.getArray(str);

        if (indexes.length) {
            return [
                [
                    str,
                    indexes,
                    0,
                    0,
                ]
            ];
        } else {
            return [];
        }
    }
    deserializerInt(bytes) {
        let view = new DataView(bytes.buffer);

        return [bytes];
    }
    deserializerWord(bytes) {
        let view = new DataView(bytes.buffer);

        const paradigmId = view.getUint16(0);
        const indexInParadigm = view.getUint16(2);

        return [paradigmId, indexInParadigm];
    }
    deserializerProbs(bytes) {
        let view = new DataView(bytes.buffer);

        const paradigmId = view.getUint16(0);
        const indexInParadigm = view.getUint16(2);
        const indexInParadigm2 = view.getUint16(4);

        return [paradigmId, indexInParadigm, indexInParadigm2];
    }
}
