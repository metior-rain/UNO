

const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const host = window.location.host;  // 包括域名和端口
const socketUrl = `${protocol}://${host}`;  // 假设 WebSocket 服务器在端口 3000


const socket = new WebSocket(socketUrl);





let gameData = {
    playerID: 0,
    gameCode: 0,
    cards: []
}






setInterval(() => {
    sendMessage({
        option: "heartbeat",
        message: {}
    })
}, 30000)



socket.onopen = () => {
    console.log('WebSocket Connection Established');
    socket.send(JSON.stringify({
        option: "test",
        message: {
            data: "hello",
        }
    }))

};



socket.onmessage = (event) => {
    const data = JSON.parse(event.data)
    switch (data.option) {
        case "respone":


            gameData.gameCode = data.message.game.code
            gameData.playerID = data.message.player.id
            guideBoard.innerHTML = `
                <span class="stress">Guide:</span>
                <br>
                ~<span class="info">start</span>: <span class="content">Start the game (Only when you are the Manager)</span><br>
                ~<span class="info">ready</span>: <span class="content">Get ready</span>
            `
            update(data.message);
            prompt("Linked", "content")
            break;
        case "error":
            prompt(data.message.content, "error");

            mode = false;
            guideBoard.innerHTML = `
                <span class="stress">Guide:</span>
                <br>
                ~<span class="info">new</span>: <span class="content">Create a new game and invite other players</span>
                <br>
                ~<span class="info">join</span>: <span class="content">Join games of others</span>
            `
            break;
        case "update":
            update(data.message);
            break;
        case "notice":
            if (data.message.game.status == "Processing") {
                mode = "processing"
                guideBoard.innerHTML = `
                    <span class="stress">Guide:</span>
                    <br>
                    ~<span class="info">p [Card Index]</span>: <span class="content">Play the card</span>
                    <br>
                    ~<span class="info">dc</span>: <span class="content">Draw a card</span>
                    <br>
                    ~<span class="info">re [Option]</span>: <span class="content">Reply a request</span>
                    <br>
                    ~<span class="info">uno</span>: <span class="content">Call UNO!</span>
                    <br>
                    ~<span class="info">rp [ID]</span>: <span class="content">Report a player</span>
                `
                update(data.message)
            }
            prompt(data.message.content, "content");
            break;
        case "rejection":
            if (data.message.doNotCover) {
                messageSlot.innerHTML += prompt(data.message.content, "warn")
            }
            prompt(data.message.content, "warn");

            break;
        case "caption":
            messageSlot.innerHTML += `<br>` + prompt(data.message.content, "warn", false);
            update(data.message, false);
            break;
        case "request":
            let request = ""
            let options = ""
            for (let option of data.message.options) {
                options += `[${option}] `
            }

            switch (data.message.question) {
                case "play?":
                    request = `Are you going to play ${cardRender(data.message.detail.attachment,false)}`;
                    break;
                case "color?":
                    request = `Which Color would you want to choose`
                    break;
                case "challenge?":
                    request = `Challenge that?`
                    break;
                
            }

            update(data.message.detail)

            prompt(`
                <span class="info">Request:</span>
                <span class="content">${request}</span>
                <br>
                <span class="info">Options: </span>${options}
                `, "content"
            )
            break;
    }

};





socket.onclose = () => {
    console.log('WebSocket Connection Closed');
};


const statusBoard = document.querySelector("#status")
const messageSlot = document.querySelector("#messageSlot")
const guideBoard = document.querySelector("#guide")
const input = document.querySelector('#input');
const cardboard = document.querySelector("#cards")






input.value += "~"
input.focus()

input.addEventListener('input', function () {
    // 获取当前 textarea 的文本内容
    let lines = this.value.split('\n');

    // 给每一行添加前缀 "~"（只有没有 "~" 的行才加）
    lines = lines.map(line => {
        // 如果这一行已经有前缀 "~"，就保持不变
        if (!line.startsWith('~')) {
            return `~${line}`;
        }
        return line;
    });

    // 将处理过的内容重新设置回 textarea
    this.value = lines.join('\n');
});


input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        let command = this.value
        if (command.startsWith('~')) {
            command = command.slice(1);

        }
        handleCommand(command)
        this.value = "~"
    }
})

let mode = false

// new 为创建房间时输入房间号，settingPlayerNumber 为设置房间人数时
//

// new 模式下两个数字分别为房间号和人数
// join 模式下两个数字分别是房间号和玩家ID
let setting = [0, 0]











