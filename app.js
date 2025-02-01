"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = sendError;
exports.sendMessage = sendMessage;
exports.rejection = rejection;
exports.broadcast = broadcast;
exports.sendRequest = sendRequest;
const express_1 = __importDefault(require("express"));
const ws_1 = __importDefault(require("ws"));
const http_1 = __importDefault(require("http"));
const console_1 = require("console");
const logic_1 = require("./script/logic");
const kit_1 = require("./script/kit");
const app = (0, express_1.default)();
const port = 3000;
const server = http_1.default.createServer(app);
const wss = new ws_1.default.Server({ server });
wss.on("connection", (ws) => {
    ws.on("close", () => {
        logic_1.GameManager.gameList = logic_1.GameManager.gameList.filter(game => {
            for (let player of game.players) {
                if (player.client === ws) {
                    player.status = logic_1.PlayerStatus.offline;
                    broadcast(game, "update", "Game Over");
                    if (player.id == 1) {
                        return false;
                    }
                    else {
                        return true;
                    }
                }
                else {
                    return true;
                }
            }
        });
        (0, console_1.log)("connection end");
    });
    // 设置定时器，每隔一定时间发送 ping 帧
    setInterval(() => {
        ws.ping(); // 发送 ping 帧
    }, 30000); // 每30秒发送一次
    ws.on("message", (message) => {
        const data = JSON.parse(message.toString());
        /* data 数据个格式
            应符合
            {
                option: string, 全部小写
                message: { }
            }
        
        
        */
        switch (data.option) {
            case "new":
                // 这里少加了一个判断，以后补
                if (logic_1.GameManager.searchForGame(data.message.code)) {
                    ws.send(JSON.stringify({
                        option: "error",
                        message: {
                            content: "Aleardy Exist"
                        }
                    }));
                    return;
                }
                const game = new logic_1.GameManager(data.message.code, data.message.playerNumber);
                logic_1.GameManager.gameList.push(game);
                game.players[0].connection(ws);
                game.players[0].status = logic_1.PlayerStatus.ready;
                ws.send(JSON.stringify({
                    option: "respone",
                    message: {
                        game: (0, kit_1.extract)(game),
                        player: game.players[0],
                        content: "Game Created"
                    }
                }));
                break;
            // 处理加入游戏相关
            case "join":
                for (let game of logic_1.GameManager.gameList) {
                    if (game.code === data.message.code) {
                        for (let player of game.players) {
                            if (player.id === data.message.playerID) {
                                if (player.status !== logic_1.PlayerStatus.offline) {
                                    ws.send(JSON.stringify({
                                        option: "error",
                                        message: {
                                            content: "Occupied"
                                        }
                                    }));
                                    return;
                                }
                                player.connection(ws);
                                ws.send(JSON.stringify({
                                    option: "respone",
                                    message: {
                                        game: (0, kit_1.extract)(game),
                                        player,
                                        content: "Linked"
                                    }
                                }));
                                broadcast(game, "update", `Player${player.id} join the game`);
                                return;
                            }
                        }
                    }
                }
                ;
                ws.send(JSON.stringify({
                    option: "error",
                    message: {
                        content: "Not Found"
                    }
                }));
                break;
        }
    });
    (0, console_1.log)("Connection Established");
    (0, console_1.log)(logic_1.GameManager.gameList);
});
app.use(express_1.default.static("./resources/"));
server.listen(port, () => {
    console.log("server running at port " + port);
});
function sendMessage(target, option, message) {
    target.send(JSON.stringify({
        option,
        message
    }));
}
function sendError(target, message) {
    target.send(JSON.stringify({
        option: "error",
        message: {
            content: message,
        }
    }));
}
function rejection(target, message) {
    target.send(JSON.stringify({
        option: "rejection",
        message: {
            content: message,
        }
    }));
}
function broadcast(game, option = "update", message = "Updated") {
    game.players.forEach(player => {
        var _a;
        if (player.client) {
            if (((_a = game.request) === null || _a === void 0 ? void 0 : _a.target) === player) {
                return;
            }
            player.client.send(JSON.stringify({
                option,
                message: {
                    game: (0, kit_1.extract)(game),
                    player,
                    content: message
                }
            }));
        }
    });
}
function sendRequest(target, question, options, detail) {
    target.send(JSON.stringify({
        option: "request",
        message: {
            question,
            options,
            detail
        }
    }));
}
