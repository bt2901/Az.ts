import{Az}from"./az";import{Dawg}from"./az.dawg";let words,probabilities,suffixes,grammemes,paradigms,tags,UNKN,predictionSuffixes=new Array(3),prefixes=["","по","наи"],defaults={ignoreCase:!1,replacements:{"е":"ё"},stutter:1/0,typos:0,parsers:["Dictionary?","AbbrName?","AbbrPatronymic","IntNumber","RealNumber","Punctuation","RomanNumber?","Latin","HyphenParticle","HyphenAdverb","HyphenWords","PrefixKnown","PrefixUnknown?","SuffixKnown?","Abbr"],forceParse:!1,normalizeScore:!0},initials="АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЭЮЯ",particles=["-то","-ка","-таки","-де","-тко","-тка","-с","-ста"],knownPrefixes=["авиа","авто","аква","анти","анти-","антропо","архи","арт","арт-","астро","аудио","аэро","без","бес","био","вело","взаимо","вне","внутри","видео","вице-","вперед","впереди","гекто","гелио","гео","гетеро","гига","гигро","гипер","гипо","гомо","дву","двух","де","дез","дека","деци","дис","до","евро","за","зоо","интер","инфра","квази","квази-","кило","кино","контр","контр-","космо","космо-","крипто","лейб-","лже","лже-","макро","макси","макси-","мало","меж","медиа","медиа-","мега","мета","мета-","метео","метро","микро","милли","мини","мини-","моно","мото","много","мульти","нано","нарко","не","небез","недо","нейро","нео","низко","обер-","обще","одно","около","орто","палео","пан","пара","пента","пере","пиро","поли","полу","после","пост","пост-","порно","пра","пра-","пред","пресс-","противо","противо-","прото","псевдо","псевдо-","радио","разно","ре","ретро","ретро-","само","санти","сверх","сверх-","спец","суб","супер","супер-","супра","теле","тетра","топ-","транс","транс-","ультра","унтер-","штаб-","экзо","эко","эндо","эконом-","экс","экс-","экстра","экстра-","электро","энерго","этно"],autoTypos=[4,9],__init=[],initialized=!1;function deepFreeze(t){if(!("freeze"in Object))return;return Object.getOwnPropertyNames(t).forEach((function(e){let r=t[e];"object"==typeof r&&null!==r&&deepFreeze(r)})),Object.freeze(t)}class Tag{constructor(t){this.str=t;let e,r=t.split(" ");this.stat=r[0].split(","),this.flex=r[1]?r[1].split(","):[];for(let t=0;t<2;t++){let r=this[["stat","flex"][t]];for(let t=0;t<r.length;t++){let s=r[t];for(this[s]=!0;grammemes[s]&&(e=grammemes[s].parent);)this[e]=s,s=e}}"POST"in this&&(this.POS=this.POST)}toString(){return(this.stat.join(",")+" "+this.flex.join(",")).trim()}matches(t,e){if(!e){if("[object Array]"===Object.prototype.toString.call(t)){for(let e=0;e<t.length;e++)if(!this[t[e]])return!1;return!0}for(let e in t)if("[object Array]"===Object.prototype.toString.call(t[e])){if(!t[e].indexOf(this[e]))return!1}else if(t[e]!=this[e])return!1;return!0}t instanceof Parse&&(t=t.tag);for(let r=0;r<e.length;r++)if(t[e[r]]!=this[e[r]])return!1;return!0}isProductive(){return!(this.NUMR||this.NPRO||this.PRED||this.PREP||this.CONJ||this.PRCL||this.INTJ||this.Apro||this.NUMB||this.ROMN||this.LATN||this.PNCT||this.UNKN)}isCapitalized(){return this.Name||this.Surn||this.Patr||this.Geox||this.Init}}function makeTag(t,e){let r=new Tag(t);return r.ext=new Tag(e),deepFreeze(r)}let Morph=function(t,e){if(!initialized)throw new Error("Please call Az.Morph.init() before using this module.");e=e?Az.extend(defaults,e):defaults;let r=[],s=!1;for(let i=0;i<e.parsers.length;i++){let n=e.parsers[i],o="?"!=n[n.length-1];if(n=o?n:n.slice(0,-1),n in Morph.Parsers){let i=Morph.Parsers[n](t,e);for(let t=0;t<i.length;t++)i[t].parser=n,i[t].stutterCnt||i[t].typosCnt||(s=!0);if(r=r.concat(i),s&&o)break}else console.warn('Parser "'+n+'" is not found. Skipping')}!r.length&&e.forceParse&&r.push(new Parse(t.toLocaleLowerCase(),UNKN));let i=0;for(let t=0;t<r.length;t++)if("Dictionary"==r[t].parser){let e=probabilities.findAll(r[t]+":"+r[t].tag);e&&e[0]&&(r[t].score=e[0][1]/1e6*getDictionaryScore(r[t].stutterCnt,r[t].typosCnt),i+=r[t].score)}if(e.normalizeScore){if(i>0)for(let t=0;t<r.length;t++)"Dictionary"==r[t].parser&&(r[t].score/=i);i=0;for(let t=0;t<r.length;t++)"Dictionary"!=r[t].parser&&(i+=r[t].score);if(i>0)for(let t=0;t<r.length;t++)"Dictionary"!=r[t].parser&&(r[t].score/=i)}return r.sort((function(t,e){return e.score-t.score})),r};Morph.Parsers={};class Parse{constructor(t,e,r,s,i){this.word=t,this.tag=e,this.score=r,this.stutterCnt=s,this.typosCnt=i,this.stutterCnt=s||0,this.typosCnt=i||0,this.score=r||0}normalize(t){return this.inflect(t?{POS:this.tag.POS}:0)}inflect(t,e){return this}pluralize(t){return this.tag.NOUN||this.tag.ADJF||this.tag.PRTF?("number"==typeof t&&(t=(t%=100)%10==0||t%10>4||t>4&&t<21?"many":t%10==1?"one":"few"),!this.tag.NOUN||this.tag.nomn||this.tag.accs?"one"==t?this.inflect(["sing",this.tag.nomn?"nomn":"accs"]):this.tag.NOUN&&"few"==t?this.inflect(["sing","gent"]):(this.tag.ADJF||this.tag.PRTF)&&this.tag.femn&&"few"==t?this.inflect(["plur","nomn"]):this.inflect(["plur","gent"]):this.inflect(["one"==t?"sing":"plur",this.tag.CAse])):this}matches(t,e){return this.tag.matches(t,e)}toString(){return this.word}log(){var t;console.group(this.toString()),console.log("Stutter?",this.stutterCnt,"Typos?",this.typosCnt),console.log(null===(t=this.tag.ext)||void 0===t?void 0:t.toString()),console.groupEnd()}}function lookup(t,e,r){let s;if("auto"==r.typos){s=t.findAll(e,r.replacements,r.stutter,0);for(let i=0;i<autoTypos.length&&!s.length&&e.length>autoTypos[i];i++)s=t.findAll(e,r.replacements,r.stutter,i+1)}else s=t.findAll(e,r.replacements,r.stutter,r.typos);return s}function getDictionaryScore(t,e){return Math.pow(.3,e)*Math.pow(.6,Math.min(t,1))}class DictionaryParse extends Parse{constructor(t,e,r,s,i,n,o){super(t,tags[paradigms[e][paradigms[e].length/3+r]]),this.word=t,this.paradigmIdx=e,this.formIdx=r,this.stutterCnt=s,this.typosCnt=i,this.prefix=n,this.suffix=o,this.paradigm=paradigms[e],this.formCnt=this.paradigm.length/3,this.tag=tags[this.paradigm[this.formCnt+r]],this.stutterCnt=s||0,this.typosCnt=i||0,this.score=getDictionaryScore(this.stutterCnt,this.typosCnt),this.prefix=n||"",this.suffix=o||""}base(){return this._base?this._base:this._base=this.word.substring(prefixes[this.paradigm[(this.formCnt<<1)+this.formIdx]].length,this.word.length-suffixes[this.paradigm[this.formIdx]].length)}inflect(t,e){if(!e&&"number"==typeof t)return new DictionaryParse(prefixes[this.paradigm[(this.formCnt<<1)+t]]+this.base()+suffixes[this.paradigm[t]],this.paradigmIdx,t,0,0,this.prefix,this.suffix);for(let r=0;r<this.formCnt;r++)if(tags[this.paradigm[this.formCnt+r]].matches(t,e))return new DictionaryParse(prefixes[this.paradigm[(this.formCnt<<1)+r]]+this.base()+suffixes[this.paradigm[r]],this.paradigmIdx,r,0,0,this.prefix,this.suffix);return!1}log(){console.group(this.toString()),console.log("Stutter?",this.stutterCnt,"Typos?",this.typosCnt),console.log(prefixes[this.paradigm[(this.formCnt<<1)+this.formIdx]]+"|"+this.base()+"|"+suffixes[this.paradigm[this.formIdx]]),console.log(this.tag.ext.toString());let t=this.normalize();console.log("=> ",t+" ("+t.tag.ext.toString()+")"),t=this.normalize(!0),console.log("=> ",t+" ("+t.tag.ext.toString()+")"),console.groupCollapsed("Все формы: "+this.formCnt);for(let t=0;t<this.formCnt;t++){let e=this.inflect(t);console.log(e+" ("+e.tag.ext.toString()+")")}console.groupEnd(),console.groupEnd()}toString(){if(this.prefix){let t=prefixes[this.paradigm[(this.formCnt<<1)+this.formIdx]];return t+this.prefix+this.word.substr(t.length)+this.suffix}return this.word+this.suffix}}class CombinedParse extends Parse{constructor(t,e){super("",e.tag),this.left=t,this.right=e,this.left=t,this.right=e,this.tag=e.tag,this.score=t.score*e.score*.8,this.stutterCnt=t.stutterCnt+e.stutterCnt,this.typosCnt=t.typosCnt+e.typosCnt,"formCnt"in e&&(this.formCnt=e.formCnt)}inflect(t,e){let r,s=this.right.inflect(t,e);return r=e||"number"!=typeof t?this.left.inflect(t,e):this.left.inflect(s.tag,["POST","NMbr","CAse","PErs","TEns"]),!(!r||!s)&&new CombinedParse(r,s)}toString(){return this.left.word+"-"+this.right.word}}__init.push((function(){Morph.Parsers.Dictionary=function(t,e){let r=!e.ignoreCase&&t.length&&t[0].toLocaleLowerCase()!=t[0]&&t.substr(1).toLocaleUpperCase()!=t.substr(1);t=t.toLocaleLowerCase();let s=lookup(words,t,e),i=[];for(let t=0;t<s.length;t++)for(let n=0;n<s[t][1].length;n++){let o=new DictionaryParse(s[t][0],s[t][1][n][0],s[t][1][n][1],s[t][2],s[t][3]);(e.ignoreCase||!o.tag.isCapitalized()||r)&&i.push(o)}return i};let t=[];for(let e=0;e<=2;e++)for(let r=0;r<=5;r++)for(let s=0;s<=1;s++)t.push(makeTag("NOUN,inan,"+["masc","femn","neut"][e]+",Fixd,Abbr "+["sing","plur"][s]+","+["nomn","gent","datv","accs","ablt","loct"][r],"СУЩ,неод,"+["мр","жр","ср"][e]+",0,аббр "+["ед","мн"][s]+","+["им","рд","дт","вн","тв","пр"][r]));Morph.Parsers.Abbr=function(e,r){if(e.length<2)return[];if(e.indexOf("-")>-1)return[];if(initials.indexOf(e[0])>-1&&initials.indexOf(e[e.length-1])>-1){let r=0;for(let t=0;t<e.length;t++)initials.indexOf(e[t])>-1&&r++;if(r<=5){let r=[];for(let s=0;s<t.length;s++){let i=new Parse(e,t[s],.5);r.push(i)}return r}}if(!r.ignoreCase||e.length>5)return[];e=e.toLocaleUpperCase();for(let t=0;t<e.length;t++)if(-1==initials.indexOf(e[t]))return[];let s=[];for(let r=0;r<t.length;r++){let i=new Parse(e,t[r],.2);s.push(i)}return s};let e=function(t){let e=[];for(let t=0;t<=1;t++)for(let r=0;r<=5;r++)e.push(makeTag("NOUN,anim,"+["masc","femn"][t]+",Sgtm,Name,Fixd,Abbr,Init sing,"+["nomn","gent","datv","accs","ablt","loct"][r],"СУЩ,од,"+["мр","жр"][t]+",sg,имя,0,аббр,иниц ед,"+["им","рд","дт","вн","тв","пр"][r]));return function(r,s){if(1!=r.length)return[];if(s.ignoreCase&&(r=r.toLocaleUpperCase()),-1==initials.indexOf(r))return[];let i=[];for(let s=0;s<e.length;s++){let n=new Parse(r,e[s],t);i.push(n)}return i}};Morph.Parsers.AbbrName=e(.1),Morph.Parsers.AbbrPatronymic=e(.1);let r=function(t,e,r){return function(r,s){return s.ignoreCase&&(r=r.toLocaleUpperCase()),r.length&&r.match(t)?[new Parse(r,e)]:[]}};grammemes.NUMB=grammemes["ЧИСЛО"]=grammemes.ROMN=grammemes["РИМ"]=grammemes.LATN=grammemes["ЛАТ"]=grammemes.PNCT=grammemes["ЗПР"]=grammemes.UNKN=grammemes["НЕИЗВ"]={parent:"POST"},Morph.Parsers.IntNumber=r(/^[−-]?[0-9]+$/,makeTag("NUMB,intg","ЧИСЛО,цел")),Morph.Parsers.RealNumber=r(/^[−-]?([0-9]*[.,][0-9]+)$/,makeTag("NUMB,real","ЧИСЛО,вещ")),Morph.Parsers.Punctuation=r(/^[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,\-.\/:;<=>?@\[\]^_`{|}~]+$/,makeTag("PNCT","ЗПР")),Morph.Parsers.RomanNumber=r(/^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/,makeTag("ROMN","РИМ")),Morph.Parsers.Latin=r(/[A-Za-z\u00C0-\u00D6\u00D8-\u00f6\u00f8-\u024f]$/,makeTag("LATN","ЛАТ")),Morph.Parsers.HyphenParticle=function(t,e){t=t.toLocaleLowerCase();let r=[];for(let s=0;s<particles.length;s++)if(t.substr(t.length-particles[s].length)==particles[s]){let i=t.slice(0,-particles[s].length),n=lookup(words,i,e);for(let t=0;t<n.length;t++)for(let e=0;e<n[t][1].length;e++){let i=new DictionaryParse(n[t][0],n[t][1][e][0],n[t][1][e][1],n[t][2],n[t][3],"",particles[s]);i.score*=.9,r.push(i)}}return r};let s=makeTag("ADVB","Н");Morph.Parsers.HyphenAdverb=function(t,e){if((t=t.toLocaleLowerCase()).length<5||"по-"!=t.substr(0,3))return[];let r=lookup(words,t.substr(3),e),i=[],n={};for(let t=0;t<r.length;t++)if(!n[r[t][0]])for(let e=0;e<r[t][1].length;e++){let o=new DictionaryParse(r[t][0],r[t][1][e][0],r[t][1][e][1],r[t][2],r[t][3]);if(o.matches(["ADJF","sing","datv"])){n[r[t][0]]=!0,o=new Parse("по-"+r[t][0],s,.9*o.score,r[t][2],r[t][3]),i.push(o);break}}return i},Morph.Parsers.HyphenWords=function(t,e){t=t.toLocaleLowerCase();for(let e=0;e<knownPrefixes.length;e++)if("-"==knownPrefixes[e][knownPrefixes[e].length-1]&&t.substr(0,knownPrefixes[e].length)==knownPrefixes[e])return[];let r=[],s=t.split("-");if(2!=s.length||!s[0].length||!s[1].length){if(s.length>2){let i=s[s.length-1],n=Morph.Parsers.Dictionary(i,e);for(let e=0;e<n.length;e++)n[e]instanceof DictionaryParse&&(n[e].score*=.2,n[e].prefix=t.substr(0,t.length-i.length-1)+"-",r.push(n[e]))}return r}let i=Morph.Parsers.Dictionary(s[0],e),n=Morph.Parsers.Dictionary(s[1],e);for(let t=0;t<i.length;t++)if(!i[t].tag.Abbr)for(let s=0;s<n.length;s++)i[t].matches(n[s],["POST","NMbr","CAse","PErs","TEns"])&&(i[t].stutterCnt+n[s].stutterCnt>e.stutter||i[t].typosCnt+n[s].typosCnt>e.typos||r.push(new CombinedParse(i[t],n[s])));for(let t=0;t<n.length;t++)n[t]instanceof DictionaryParse&&(n[t].score*=.3,n[t].prefix=s[0]+"-",r.push(n[t]));return r},Morph.Parsers.PrefixKnown=function(t,e){let r=!e.ignoreCase&&t.length&&t[0].toLocaleLowerCase()!=t[0]&&t.substr(1).toLocaleUpperCase()!=t.substr(1);t=t.toLocaleLowerCase();let s=[];for(let i=0;i<knownPrefixes.length;i++)if(!(t.length-knownPrefixes[i].length<3)&&t.substr(0,knownPrefixes[i].length)==knownPrefixes[i]){let n=t.substr(knownPrefixes[i].length),o=Morph.Parsers.Dictionary(n,e);for(let t=0;t<o.length;t++)o[t].tag.isProductive()&&(e.ignoreCase||!o[t].tag.isCapitalized()||r)&&(o[t].score*=.7,o[t].prefix=knownPrefixes[i],s.push(o[t]))}return s},Morph.Parsers.PrefixUnknown=function(t,e){let r=!e.ignoreCase&&t.length&&t[0].toLocaleLowerCase()!=t[0]&&t.substr(1).toLocaleUpperCase()!=t.substr(1);t=t.toLocaleLowerCase();let s=[];for(let i=1;i<=5&&!(t.length-i<3);i++){let n=t.substr(i),o=Morph.Parsers.Dictionary(n,e);for(let n=0;n<o.length;n++)o[n].tag.isProductive()&&(e.ignoreCase||!o[n].tag.isCapitalized()||r)&&(o[n].score*=.3,o[n].prefix=t.substr(0,i),s.push(o[n]))}return s},Morph.Parsers.SuffixKnown=function(t,e){if(t.length<4)return[];let r=!e.ignoreCase&&t.length&&t[0].toLocaleLowerCase()!=t[0]&&t.substr(1).toLocaleUpperCase()!=t.substr(1);t=t.toLocaleLowerCase();let s=[],i=1,n=[0,.2,.3,.4,.5,.6],o={};for(let a=0;a<prefixes.length;a++){if(prefixes[a].length&&t.substr(0,prefixes[a].length)!=prefixes[a])continue;let l=t.substr(prefixes[a].length);for(let t=5;t>=i;t--){if(t>=l.length)continue;let h=l.substr(0,l.length-t),f=l.substr(l.length-t),g=predictionSuffixes[a].findAll(f,e.replacements,0,0);if(!g)continue;let u=[],p=1;for(let s=0;s<g.length;s++){let i=g[s][0],l=g[s][1];for(let s=0;s<l.length;s++){let f=new DictionaryParse(prefixes[a]+h+i,l[s][1],l[s][2]);if(!f.tag.isProductive())continue;if(!e.ignoreCase&&f.tag.isCapitalized()&&!r)continue;let g=f.toString()+":"+l[s][1]+":"+l[s][2];g in o||(p=Math.max(p,l[s][0]),f.score=l[s][0]*n[t],u.push(f),o[g]=!0)}}if(u.length>0){for(let t=0;t<u.length;t++)u[t].score/=p;s=s.concat(u),i=Math.max(t-1,1)}}}return s},UNKN=makeTag("UNKN","НЕИЗВ")})),Morph.setDefaults=function(t){defaults=t};export const Init=function(t,e){let r,s,i=0;function n(){if(!--i){tags=Array(r.length);for(let t=0;t<r.length;t++)tags[t]=new Tag(r[t]),tags[t].ext=new Tag(s[t]);tags=deepFreeze(tags);for(let t=0;t<__init.length;t++)__init[t]();initialized=!0,e&&e(null,Morph)}}e||"function"!=typeof t||(e=t,t="string"==typeof __dirname?__dirname+"/../dicts":"dicts"),i++,Dawg.load(t+"/words.dawg","words",(function(t,r){t?e(t):(words=r,n())}));for(let r=0;r<3;r++)!function(r){i++,Dawg.load(t+"/prediction-suffixes-"+r+".dawg","probs",(function(t,s){t?e(t):(predictionSuffixes[r]=s,n())}))}(r);i++,Dawg.load(t+"/p_t_given_w.intdawg","int",(function(t,r){t?e(t):(probabilities=r,n())})),i++,Az.load(t+"/grammemes.json","json",(function(t,r){if(t)e(t);else{grammemes={};for(let t=0;t<r.length;t++)grammemes[r[t][0]]=grammemes[r[t][2]]={parent:r[t][1],internal:r[t][0],external:r[t][2],externalFull:r[t][3]};n()}})),i++,Az.load(t+"/gramtab-opencorpora-int.json","json",(function(t,s){t?e(t):(r=s,n())})),i++,Az.load(t+"/gramtab-opencorpora-ext.json","json",(function(t,r){t?e(t):(s=r,n())})),i++,Az.load(t+"/suffixes.json","json",(function(t,r){t?e(t):(suffixes=r,n())})),i++,Az.load(t+"/paradigms.array","arraybuffer",(function(t,r){if(t)return void e(t);let s=new Uint16Array(r),i=s[0],o=1;paradigms=[];for(let t=0;t<i;t++){let t=s[o++];paradigms.push(s.subarray(o,o+t)),o+=t}n()}))};export{Morph};