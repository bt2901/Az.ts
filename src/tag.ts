interface UdDictResult {
    PoS?: string;
    Case?: string;
    Animacy?: string;
    Number?: string;
    Person?: string;
    Aspect?: string;
    VerbForm?: string;
    Gender?: string;
    // Add more properties if needed
}

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
    ext?: Tag;

    public POS!: string;

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
        for (const prop of (['stat', 'flex'] as const)) {
            const grams = this[prop];

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
        this.POS = (this.ud_dict()["PoS"] as string);
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

    public ud_dict(): UdDictResult {
        const result: UdDictResult = {};
        const gramSet = (this.stat + "," + this.flex).split(",");

        const PosSet = new Set([
            "NOUN", "NPRO", "VERB", "ADJF", "PRTF", "ADVB", "GRND", "PREP", "PRED", "Prnt", "CONJ", "PRCL", "INTJ", "NUMR",
            "PRCL", "Apro",
            "ADJS", "COMP", "VERB", "INFN", "PRTS", 
        ]);
        const CasesSet = new Set(["nomn", "gent", "datv", "accs", "ablt", "inst", "loct", "voct", "loc2", "gen2"]);
        const PerSet = new Set(["1per", "2per", "3per", "0per"]);
        const GenderSet = new Set(["masc", "neut", "femn"]);
        const TenseSet = new Set(["past", "futr", "imperfect", "cond", "pres"]);
        const MoodSet = new Set(["impr"]);
        const AspectSet = new Set(["perf", "impf"]);
        for (const gramName of gramSet) {
           if (PosSet.has(gramName)) {
                result["PoS"] = gramName;
                if (gramName == "VERB") {
                    result["VerbForm"] = "Fin";
                };
                if (gramName == "INFN") {
                    result["VerbForm"] = "Inf";
                    result["PoS"] = "VERB";
                };
           }
           if (CasesSet.has(gramName)) {
                result["Case"] = gramName;
           }
           if (AspectSet.has(gramName)) {
                result["Aspect"] = gramName;
           }
           if (gramName === "inan" || gramName === "anim" ) {
                result["Animacy"] = gramName;
           }
           if (gramName === "plur" || gramName === "sing" ) {
                result["Number"] = gramName;
           }
           if (PerSet.has(gramName)) {
                result["Person"] = gramName;
           }
           if (GenderSet.has(gramName)) {
                result["Gender"] = gramName;
           }
        }
        return result;
    }

    public isProductive() {
        const NonProdSet = new Set(["NUMR", "NPRO", "PRED", "PREP", "CONJ", "PRCL", "INTJ", "Apro", "NUMB", "ROMN", "LATN", "PNCT", "UNKN"]);

        return !(NonProdSet.has(this.POS));
    }

    public isCapitalized() {
        return this.Name || this.Surn || this.Patr || this.Geox || this.Init;
    }
}
