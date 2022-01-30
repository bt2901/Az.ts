export function getDictionaryScore(stutterCnt, typosCnt) {
    return Math.pow(0.3, typosCnt) * Math.pow(0.6, Math.min(stutterCnt, 1));
}
