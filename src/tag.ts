/**
 * Тег. Содержит в себе информацию о конкретной форме слова, но при этом
 * к конкретному слову не привязан. Всевозможные значения тегов переиспользуются
 * для всех разборов слов.
 *
 * Все граммемы навешаны на тег как поля. Если какая-то граммема содержит в себе
 * дочерние граммемы, то значением поля является именно название дочерней
 * граммемы (например, tag.GNdr == 'masc'). В то же время для дочерних граммем
 * значением является просто true (т.е. условие можно писать и просто как
 * if (tag.masc) ...).
 *
 * @property {string[]} stat Полный список неизменяемых граммем.
 * @property {string[]} flex Полный список изменяемых граммем.
 */
export class Tag {
    public stat: string[];
    public flex: string[];

    public POS!: boolean;
    public POST!: boolean;
    public NUMR!: boolean;
    public NPRO!: boolean;
    public PRED!: boolean;
    public PREP!: boolean;
    public CONJ!: boolean;
    public PRCL!: boolean;
    public INTJ!: boolean;
    public Apro!: boolean;
    public NUMB!: boolean;
    public ROMN!: boolean;
    public LATN!: boolean;
    public PNCT!: boolean;
    public UNKN!: boolean;

    public Name!: string;
    public Surn!: string;
    public Patr!: string;
    public Geox!: string;
    public Init!: string;

    constructor(grammemes: any, str: string) {
        let par: string | undefined;
        const pair = str.split(' ');
        if (pair.length === 2) {
            this.stat = pair[0]!.split(',');
            this.flex = pair[1]!.split(',');
            // throw new Error(`Invalid input format: ${str} splits to ${pair}`);
        } else {
            this.stat = pair[0]!.split(',');
            this.flex = [];
        }
        if ((this.stat === undefined) || (this.flex === undefined)) {
            throw new Error(`Invalid input format: ${pair} has ${this.stat} or ${this.flex} undefined`);
        }
        for (let j = 0; j < 2; j++) {
            // TypeScript is too dumb to understand that ['stat', 'flex'][j] always resolves to either 'stat' or 'flex'. 
            // let grams = this[['stat', 'flex'][j]];
            let grams = (j == 0)? this.stat : this.flex;

            for (let i = 0; i < grams.length; i++) {
                let gram = grams[i] as string;
                if (grammemes[gram]) {
                    (this as any)[gram] = true;
                    // loc2 -> loct -> CAse
                    while (grammemes[gram] && (par = grammemes[gram].parent)) {
                        (this as any)[par] = gram;
                        gram = par;
                    }
                }
            }
        }
        if ('POST' in this) {
            this.POS = this.POST;
        }
    }


    /**
     * Возвращает текстовое представление тега.
     *
     * @returns {string} Список неизменяемых граммем через запятую, пробел,
     *  и список изменяемых граммем через запятую.
     */
    public toString(): string {
        return (this.stat.join(',') + ' ' + this.flex.join(',')).trim();
    }

    /**
     * Проверяет согласованность с конкретными значениями граммем либо со списком
     * граммем из другого тега (или слова).
     *
     * @param {Tag|Parse} [tag] Тег или разбор слова, с которым следует
     *  проверить согласованность.
     * @param {Array|Object} grammemes Граммемы, по которым нужно проверить
     *  согласованность.
     *
     *  Если указан тег (или разбор), то grammemes должен быть массивом тех
     *  граммем, которые у обоих тегов должны совпадать. Например:
     *  tag.matches(otherTag, ['POS', 'GNdr'])
     *
     *  Если тег не указан, а указан массив граммем, то проверяется просто их
     *  наличие. Например, аналог выражения (tag.NOUN && tag.masc):
     *  tag.matches([ 'NOUN', 'masc' ])
     *
     *  Если тег не указан, а указан объект, то ключи в нем — названия граммем,
     *  значения — дочерние граммемы, массивы граммем, либо true/false:
     *  tag.matches({ 'POS' : 'NOUN', 'GNdr': ['masc', 'neut'] })
     * @returns {boolean} Является ли текущий тег согласованным с указанным.
     */
    // TODO: научиться понимать, что некоторые граммемы можно считать эквивалентными при сравнении двух тегов (вариации падежей и т.п.)
    public matches(tag: string[] | Tag, grammemes: string[] | { [key: string]: string[] | boolean }): boolean {
        if (!grammemes) {
            if (Array.isArray(tag)) {
                for (let i = 0; i < tag.length; i++) {
                    if (!(this as any)[tag[i]!]) {
                        return false;
                    }
                }
                return true;
            } else {
                // Match to map
                for (let k in tag) {
                    if ((tag as any)[k] !== undefined) {
                        if (Array.isArray((tag as any)[k])) {
                            if (((tag as any)[k] as string[]).indexOf((this as any)[k]) === -1) {
                                return false;
                            }
                        } else {
                            if ((tag as any)[k] !== (this as any)[k]) {
                                return false;
                            }
                        }
                    }
                }
                return true;
            }
        }

        // Match to another tag
        for (let i = 0; i < (grammemes as string[]).length; i++) {
            let gramIndex = (grammemes as string[])[i];
            if ((tag as any)[gramIndex!] !== (this as any)[gramIndex!]) {
                return false;
            }
        }
        return true;
    }

    public isProductive() {
        return !(
            this.NUMR ||
            this.NPRO ||
            this.PRED ||
            this.PREP ||
            this.CONJ ||
            this.PRCL ||
            this.INTJ ||
            this.Apro ||
            this.NUMB ||
            this.ROMN ||
            this.LATN ||
            this.PNCT ||
            this.UNKN
        );
    }

    public isCapitalized() {
        return this.Name || this.Surn || this.Patr || this.Geox || this.Init;
    }
}
