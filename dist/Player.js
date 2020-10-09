import { EventEmitter } from "events";
import fs from 'fs';
import mp3Duration from 'mp3-duration';
import lame from 'lame';
import Speaker from 'speaker';
import { convertLyric } from './utils';

const KEY_FRAME = ["∙∙∙∙∙", "●∙∙∙∙", "∙●∙∙∙", "∙∙●∙∙", "∙∙∙●∙", "∙∙∙∙●", "∙∙∙∙∙"];

export default class Player extends EventEmitter {
    constructor(lists = [], params) {
        super();
        this.history = [];
        this.paused = false;
        this.list = lists;
        this.playingIndex = 0;
        this.mp3Duration = 0;
        this.barTimer = null;
    }

    get lists() {
        if (!this.list) return null;
        return this.list.map(ele => ele['src']);
    }

    get playing() {
        if (!this.history.length) return null;
    }

    get lyrics() {
        let lyrics = [];
        let lyricPath = this.list[this.playingIndex].lyricSrc;
        if (fs.existsSync(lyricPath)) {
            let lyricInputSteam = fs.readFileSync(lyricPath).toString();
            lyrics = convertLyric(lyricInputSteam);
        }
        return lyrics;
    }

    // 展示播放进度&&歌词
    showProcessBar() {
        let currentPlayingSongName = this.list[this.playingIndex].name;
        let index = 0;
        let i = 0;
        let keyIndex = 0;
        let currentLyricTime = (this.lyrics[0] || [])[0];
        let nextLyricTime = (this.lyrics[1] || [])[0];
        let currentLyricContent = (this.lyrics[0] || [])[1];
        this.barTimer = setInterval(() => {
            i = i + 0.1;
            keyIndex = ++keyIndex % KEY_FRAME.length;
            process.stdout.clearLine();
            process.stdout.write(`\r${KEY_FRAME[keyIndex]} 正在播放:${currentPlayingSongName} [${parseInt(i)} / ${this.mp3Duration}s]  ${currentLyricContent}`);

            if (this.lyrics && this.lyrics.length) {
                if (i >= nextLyricTime) {
                    nextLyricTime = (this.lyrics[index + 1] || [])[0];
                    currentLyricTime = (this.lyrics[index] || [])[0];
                    currentLyricContent = (this.lyrics[index] || [])[1];
                    index++;
                }
            }
        }, 100);
    }

    //获取标签
    dura(src, cb) {
        mp3Duration(src, function (err, duration) {
            if (err) return console.log(err.message);
            return cb(null, Math.floor(duration));
        });
    }

    //读取文件
    read(src, cb) {
        return cb(null, fs.createReadStream(src));
    }

    stop() {
        if (!this.speaker) return;
        this.lameStream.unpipe();
        this.speaker.Speaker.close();
    }

    //上一曲
    prev() {
        if (this.playingIndex <= 0) {
            this.playingIndex = this.list.length - 1;
        } else {
            --this.playingIndex;
        }
        clearInterval(this.barTimer);
        process.stdout.clearLine();
        this.stop();
        this.play(this.playingIndex);
        return;
    }

    //下一曲
    next() {
        if (this.playingIndex >= this.list.length) {
            this.playingIndex = 0;
        } else {
            this.playingIndex++;
        }
        clearInterval(this.barTimer);
        process.stdout.clearLine();
        this.stop();
        this.play(this.playingIndex);
        return;
    }

    //播放
    play(index = 0) {
        if (this.list.length <= 0) return;
        if (typeof index !== 'number') {
            index = this.list.findIndex(ele => ele.name === index.name);
            console.log('index', index);
        }
        if (index >= this.list.length) {
            index = this.list.length - 1;
        }
        this.playingIndex = index;
        let song = this.list[index];
        let self = this; //Player

        this.read(song['src'], (err, pool) => {
            if (err) {
                return this.emit('error', err);
            }
            //异步
            this.dura(song['src'], (err, data) => {
                if (!err) {
                    song.dura = data;
                    this.mp3Duration = data;
                    this.showProcessBar();
                }
            });
            this.lameStream = new lame.Decoder();

            pool.pipe(this.lameStream).once('format', onPlaying).once('finish', () => this.next());

            function onPlaying(f) {
                self.lameFormat = f;
                let speaker = new Speaker(self.lameFormat);
                // this [this] is decoder
                self.emit('playing', song);
                self.speaker = {
                    'readableStream': this,
                    'Speaker': speaker
                };
                self.history.push(index);
                this.pipe(speaker).once('close', () => {
                    self.emit('playend', song);
                });
            }
        });
    }
}
//# sourceMappingURL=Player.js.map