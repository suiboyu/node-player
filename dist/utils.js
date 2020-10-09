function convertLyric(lyric) {
    let lines = lyric.split('\n');
    let pattern = /\[\d{2}:\d{2}.\d{2}\]/g;
    let result = [];
    while (!pattern.test(lines[0])) {
        lines = lines.slice(1);
    }
    lines[lines.length - 1].length === 0 && lines.pop();
    for (const item of lines) {
        let index = item.indexOf(']');
        let time = item.substring(0, index + 1);
        let timeValue = item.substring(1, time.length - 1);
        let value = item.substring(index + 1);
        let timeArray = timeValue.split(':');
        result.push([parseInt(timeArray[0], 10) * 60 + parseFloat(timeArray[1]), value]);
    }
    return result;
}

export { convertLyric };
//# sourceMappingURL=utils.js.map