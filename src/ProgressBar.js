const chalk = require('chalk');
const deleteLine = () => process.stdout.clearLine(0);
// const deleteLeft = () => process.stdout.clearLine(-1);
// const deleteRight = () => process.stdout.clearLine(1);
const setCursor = (i) => process.stdout.cursorTo(i);
const write = (str) => process.stdout.write(str);

const epsilon = 0.00001;

/**
 * Maps a fg color to a bg color of the same color.
 * @param {chalk fg color} fg 
 * @returns {chalk bg color} bg color
 */
const getBG = (fg) => {
    switch (fg) {
        case chalk.blue: return chalk.bgBlue;
        case chalk.cyan: return chalk.bgCyan;
        case chalk.green: return chalk.bgGreen;
        case chalk.yellow: return chalk.bgYellow;
        case chalk.red: return chalk.bgRed;
        case chalk.magenta: return chalk.bgMagenta;
        case chalk.white: return chalk.bgWhite;
        case chalk.gray: return chalk.bgGray;
        case chalk.black: return chalk.bgBlack;
        case chalk.blueBright: return chalk.bgBlueBright;
        case chalk.cyanBright: return chalk.bgCyanBright;
        case chalk.greenBright: return chalk.bgGreenBright;
        case chalk.yellowBright: return chalk.bgYellowBright;
        case chalk.redBright: return chalk.bgRedBright;
        case chalk.magentaBright: return chalk.bgMagentaBright;
        case chalk.whiteBright: return chalk.bgWhiteBright;
        case chalk.grayBright: return chalk.bgGrayBright;
        case chalk.blackBright: return chalk.bgBlackBright;
        default: throw new Error('Invalid color');
    }
};

/**
 * Renders the ms in human-readable format.
 * @param {number} ms - The number of ms.
 * @param {number} precision - The number of decimal digits to print.
 * @returns {string} Prints in seconds, minutes, hours, or days, depending on situation.
 */
const renderTime = (ms, precision) => {
    const msInS = 1000;
    const sInM = 60;
    const mInH = 60;
    const hInD = 24;

    if (ms < 1000) {
        return ms.toFixed(0) + 'ms';
    }
    const s = ms / msInS;
    if (s < 2 * sInM) {
        return s.toFixed(precision) + 's';
    }
    const m = s / sInM;
    if (m < 2 * mInH) {
        return m.toFixed(precision) + ' minutes';
    }
    const h = m / mInH;
    if (h < 2 * hInD) {
        return h.toFixed(precision) + ' hours';
    }
    const d = h / hInD;
    return d.toFixed(precision) + ' days';
};

/**
 * A class for rendering a CLI progress bar.
 */
class ProgressBar {
    /**
     * Constructor
     * @param {number} width - An integer width.
     * @param {chalk fg color} color - A chalk fg color function
     * @param {string | [string]} backgroundStr - Accepts a string or a char array.
     */
    constructor(width = 50, color = chalk.blue, backgroundStr = new Array(width).fill(' ')) {
        this.lastFill = 0;
        this.iter = 0;
        this.longest = 0;
        this.width = width;
        this.longest = width;
        this.fgColor = color;
        this.bgColor = getBG(color);
        if (typeof backgroundStr === 'string') {
            backgroundStr = backgroundStr.split('');
        }
        if (backgroundStr.length < width) {
            for (let i = backgroundStr.length - 1; i < width; i++) {
                backgroundStr.unshift(' ');
            }
        }
        this.backgroundStr = backgroundStr;
    }

    /**
     * Checks to see if we're done within the margin of completion.
     * @param {number} percentage 
     * @returns {boolean}
     */
    isDone(percentage) {
        return (1 - percentage < epsilon) || (percentage > 1);
    }

    /**
     * Generates the spinning highlight that shows things are still processing. Move it every time we get a set().
     * @param {number} i 
     * @returns 
     */
    getPinwheel(i) {
        let pinwheel;
        switch ((this.iter + i) % Math.floor(this.width / 4)) {
            case 0:
                pinwheel = '░';
                break;
            case 1:
                pinwheel = '▒';
                break;
            case 2:
                pinwheel = '▓';
                break;
            default:
                pinwheel = '█';
        }
        return pinwheel;
    }

    /**
     * Sets the background string.
     * @param {string} str 
     */
    str(str) {
        this.backgroundStr = str.padStart(this.width, ' ').split('');
    }

    /**
     * Sets the percentage of the progress bar.
     * @param {number} perc 
     */
    set(perc) {
        if (!this.init) {
            this.init = Date.now();
        }
        perc = Math.min(1, Math.max(0, perc));
        const fill = Math.floor((perc + epsilon) * this.width);
        const builder = [];

        // Fill
        builder.push('[');
        this.iter++;
        let charIndex = 0;
        for (let i = 0; i < fill; i++) {
            if (fill !== this.width && i === fill - 1) {
                if (fill === this.lastFill) {
                    builder.push('▓');
                } else if (fill > this.lastFill) {
                    builder.push('');
                } else {
                    builder.push('▒');
                }
            } else {
                const bar = !this.isDone(perc)
                    ? this.getPinwheel(i)
                    : '█';
                const char = this.backgroundStr[i] === ' '
                    ? bar
                    : this.bgColor(chalk.black(this.backgroundStr[i]));
                builder.push(char);
            }
            charIndex++;
        }

        // Void
        for (let i = fill; i < this.width; i++) {
            const char = this.backgroundStr[charIndex++];
            builder.push(char);
        }

        // Timer
        builder.push(`] ${(perc * 100).toFixed(2).padStart(6, ' ')}%`);
        const diff = (Date.now() - this.init);
        builder.push(` - ${renderTime(diff, 3)}`);
        const remaining = (diff / perc) - diff;
        if (!this.isDone(perc)) {
            builder.push(` (${renderTime(remaining, 0)} remaining)`);
        }

        // flush excess digits
        // eslint-disable-next-line no-control-regex
        const curLeng = builder.join('').replace(/\u001b[^m]*?m/g, '').length;
        let flushGap = this.longest - curLeng;
        flushGap = flushGap < 0 ? 0 : flushGap;
        const gap = new Array(flushGap).fill(' ').join('');
        builder.push(gap);
        if (curLeng > this.longest) {
            this.longest = curLeng;
        }

        // Print
        const str = builder.join('');
        setCursor(0);
        write(this.fgColor(str));
        this.lastFill = fill;
        this.perc = perc;

        if (this.isDone(perc)) {
            write('\n');
            this.reset();
        }
    }

    writeAbove(str) {
        deleteLine();
        setCursor(0);
        console.log(str);
        this.set(this.perc);
    }

    reset() {
        this.lastFill = 0;
        this.iter = 0;
        this.init = undefined;
    }
}

module.exports = ProgressBar;
