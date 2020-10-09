# node-player
使用node播放mp3文件

```
 npm run start 播放./files目录下的mp3文件
```
#### 实现的功能
- lyric格式歌词显示
- 展示歌曲信息，播放进度
- 快捷键(control+p\n)切换上\下曲
- 歌曲下载存储至本地⏬

#### 如果切换歌曲存在问题

[解决方案](https://stackoverflow.com/questions/40822969/how-can-i-properly-end-or-destroy-a-speaker-instance-without-getting-illegal-ha)
Change node_modules/speaker/deps/mpg123/src/output/coreaudio.c:258

```
    -       usleep( (FIFO_DURATION/2) * 1000000 );
    +       usleep( (FIFO_DURATION/2) * 100000 );

```
Then in the node_modules/speaker/ directory, run:
```
    npm run install
```


