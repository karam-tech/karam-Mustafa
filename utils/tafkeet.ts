// utils/tafkeet.ts

const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
const onesFeminine = ['', 'إحدى', 'اثنتان', 'ثلاث', 'أربع', 'خمس', 'ست', 'سبع', 'ثمان', 'تسع'];
const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
const thousands = { one: 'ألف', two: 'ألفان', few: 'آلاف', many: 'ألفًا' };
const millions = { one: 'مليون', two: 'مليونان', few: 'ملايين', many: 'مليونًا' };

function convertThreeDigits(num: number, isFeminineContext: boolean = false): string {
    if (num === 0) return '';
    let text = '';
    const h = Math.floor(num / 100);
    const t = Math.floor((num % 100) / 10);
    const o = num % 10;

    if (h > 0) {
        text += hundreds[h];
        if (t > 0 || o > 0) text += ' و ';
    }

    if (t === 1 && o > 0) {
        text += teens[o];
    } else {
        const oneUnit = isFeminineContext ? onesFeminine[o] : ones[o];
        if (o > 0 && t > 1) {
            text += oneUnit + ' و ' + tens[t];
        } else if (o > 0) {
            text += oneUnit;
        } else if (t > 0) {
            text += tens[t];
        }
    }
    return text;
}

function getPlural(num: number, plurals: { one: string, two: string, few: string, many: string }): string {
    if (num === 1) return plurals.one;
    if (num === 2) return plurals.two;
    if (num >= 3 && num <= 10) return plurals.few;
    return plurals.many;
}

export function tafkeet(num: number): string {
    if (typeof num !== 'number' || isNaN(num)) {
        return 'رقم غير صالح';
    }
    if (num === 0) {
        return 'صفر فقط لا غير';
    }

    const [integerPart, fractionalPart] = num.toFixed(2).split('.').map(Number);
    
    let integerText = '';
    if (integerPart > 0) {
        const millionsNum = Math.floor(integerPart / 1000000);
        const thousandsNum = Math.floor((integerPart % 1000000) / 1000);
        const hundredsNum = integerPart % 1000;

        if (millionsNum > 0) {
            const millionsText = convertThreeDigits(millionsNum, true);
            integerText += millionsText + ' ' + getPlural(millionsNum, millions);
            if (thousandsNum > 0 || hundredsNum > 0) integerText += ' و ';
        }
        
        if (thousandsNum > 0) {
            const thousandsText = convertThreeDigits(thousandsNum, true);
            integerText += thousandsText + ' ' + getPlural(thousandsNum, thousands);
            if (hundredsNum > 0) integerText += ' و ';
        }

        if (hundredsNum > 0) {
            integerText += convertThreeDigits(hundredsNum);
        }

        const poundPlural = integerPart === 1 ? 'جنيه' : (integerPart === 2 ? 'جنيهان' : (integerPart >= 3 && integerPart <= 10 ? 'جنيهات' : 'جنيهاً'));
        integerText = `${integerText} ${poundPlural}`;
    }

    let fractionalText = '';
    if (fractionalPart > 0) {
        fractionalText = convertThreeDigits(fractionalPart);
        const piasterPlural = fractionalPart === 1 ? 'قرش' : (fractionalPart === 2 ? 'قرشان' : (fractionalPart >= 3 && fractionalPart <= 10 ? 'قروش' : 'قرشاً'));
        fractionalText = `${fractionalText} ${piasterPlural}`;
    }

    let result = '';
    if (integerText && fractionalText) {
        result = `${integerText} و ${fractionalText}`;
    } else {
        result = integerText || fractionalText;
    }

    return `${result.trim()} فقط لا غير`;
}
