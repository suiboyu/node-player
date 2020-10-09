var pl = require('../dist/Player').default
const fs = require('fs')
const path = require('path')
const inquirer = require('inquirer')
const axios = require('axios')
const https = require('https')
const http = require('http')

//get media and lyric files
let filesPath = path.resolve(__dirname, '../files')
let filesList = fs.readdirSync(filesPath)
let mp3Files = []
let lyricFiles = []
filesList.forEach((item) => {
    if (item.match('.mp3')) {
        mp3Files.push({
            src: `./files/${item}`,
            name: item,
            lyricSrc: `./files/${item.split('.')[0]}.lyric`
        })
    } else if (item.match('.json')) {
        lyricFiles.push(item)
    }
})

// 显示下载进度
function generateKeyFrame(width = 24, keyIndex, isCom = '=', notCom = ' ') {
    return [...Array(width)].map((_, i) => i == 0 ? 
        '[': i == width.length - 1? 
        ']': i <= keyIndex? 
        isCom: notCom)
    .join('')
}

async function download({ keywords }) {
    if (!keywords) {
        return new Promise((resolve) =>{
            inquirer.prompt([
                {
                    type: 'list',
                    name: 'song',
                    message: '选择本地歌曲播放',
                    choices: mp3Files,
                    pageSize: 10,
                }
            ]).then((answers) => {
                resolve(answers.song)
            })
        })
    }
    let found = mp3Files.find(ele => {
        return ele.name.includes(keywords)
    })
    if (found) {
        return Promise.resolve(found.name)
    } else {
        return await axios.post(`http://127.0.0.1:3400/search?keyword=${encodeURIComponent(keywords)}`)
        .then((res) => {
            return res.data
        })
        .then((result) => {
            return result.data.list.slice(0, 50)
        })
    }
}

function downloadHighQuiltyFileByID(id, type) {
    return type === 'music'? axios.post(`http://127.0.0.1:3400/song/url?id=${encodeURIComponent(id)}&&type=320`): 
        axios.post(`http://127.0.0.1:3400/lyric?cid=${encodeURIComponent(id)}`)
}


async function saveFile(fileInfo) {
    const { name, url, type, data } = fileInfo
    let dirPath = path.resolve(__dirname, '..')
    let filesPath = path.join(dirPath, 'files')
    if (!fs.existsSync(filesPath)) {
        fs.mkdirSync(filesPath)
    }
    return new Promise((resolve)=>{
        let stream = fs.createWriteStream(path.join(filesPath, `${name}.${type}`))
        let receivedBytes = 0
        let totalBytes = 0

        let process_width = 24
        let key_interval = 100/process_width
        
        if (url) {
            http.get(url, (res) => {
                if (res.statusCode === 200) {
                    totalBytes = parseInt(res.headers['content-length'], 10)
                    res.on('data', (d) => {
                        receivedBytes += d.length
                        let percentage = (Math.floor(receivedBytes) * 100) / totalBytes
                        let keyIndex = Math.floor(percentage/key_interval)
                        process.stdout.clearLine()
                        process.stdout.write(`\r 正在下载：${generateKeyFrame(process_width, keyIndex, '=', ' ')}${percentage.toFixed(2)}%`)
                        stream.write(d)
                    })
                    res.on('end', () => {
                        stream.end()
                        // process.stdout.clearLine()
                        process.stdout.write(`\r 下载⏬完成✅`)
                        resolve()
                    })
                }
            })
        } else if (data) {
            fs.writeFile(path.join(filesPath, `${name}.${type}`), data, function(err){ 
                if(err){
                console.log(err);
                }
                resolve()
            })
        }
    })
    
}

async function showSongList(songList) {
    let targetSony = {}
    let options = songList.map((item) => {
        return {
            name: `${item.name}-${item.artists[0].name}-[${item.album.name}]`,
            value: item.id
        }
    })
    Promise.resolve().then(()=>{
        inquirer.prompt([
            {
                type: 'list',
                name: 'song',
                message: '选择一个歌曲下载',
                choices: options,
                pageSize: 10,
                filter: function (val) {
                    return val.toLowerCase();
                  },
            }
        ]).then((answers) => {
            const { song } = answers
            targetSony = songList.filter((item) => item.id === song)[0]
            return Promise.all([downloadHighQuiltyFileByID(targetSony.id, 'music'), downloadHighQuiltyFileByID(targetSony.cid, 'lyric')])
        }).then((result) => {
            const [musicData, lyricData] =  result
            return Promise.all([
                saveFile({name: targetSony.name, url: musicData.data.data, type: 'mp3'}),
                saveFile({name: targetSony.name, data: lyricData.data.data, type: 'lyric'})
            ])
        }).then(() => {
            mp3Files.push({
                name: `${targetSony.name}.mp3`,
                src: `./files/${targetSony.name}.mp3`,
                lyricSrc: `./files/${targetSony.name.split('.')[0]}.lyric`
            })
            playSong({
                name: `${targetSony.name}.mp3`,
                src: `./files/${targetSony.name}.mp3`
            })
        })
    })
}

inquirer.prompt([
    {
      type: 'input',
      name: 'keywords',
      message: '请输入歌曲名在线搜索(按回车选择本地音乐播放)',
    }
  ]).then((answers) => {
    return download(answers)
  }).then((songList) => {
    //优先播放本地音乐
    if (typeof songList === 'string') {
        playSong({
            name: songList,
            src: `./files/${songList}`
        })
    } else {
        return showSongList(songList)
    }
  })


function playSong(index = 0) {
    
    let player 
    var keypress = require('keypress');
    if (!player) {
        player = new pl(mp3Files)
    }
    player.play(index)

    // make `process.stdin` begin emitting "keypress" events
    keypress(process.stdin);
    // listen for the "keypress" event
    process.stdin.on('keypress', function (ch, key) {
        process.stdout.clearLine()
        if (key && key.ctrl && key.name == 'c') {
        console.log('⏸️');
            process.stdin.pause();
        }
        // play prev song
        if (key && key.ctrl && key.name == 'p') {
            player.prev && player.prev()
            // curIndex++
        }
        // play next song
        if (key && key.ctrl && key.name == 'n') {
            player.next && player.next()
            // curIndex++
        }
    });
    process.stdin.setRawMode(true);
    process.stdin.resume();
}

// playSony(0)