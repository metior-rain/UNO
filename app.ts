import express, { Request, Response } from 'express';

import WebSocket from 'ws';


import http from "http"
import { log } from 'console';
import { GameManager, GameStatus, Player, PlayerStatus} from './script/logic';
import { cardRender, extract } from './script/kit';



const app = express()
const port = 3000






const server = http.createServer(app)
 
const wss = new WebSocket.Server({ server });


wss.on("connection", (ws: WebSocket) => {
    


    ws.on("close", () => {
        GameManager.gameList = GameManager.gameList.filter(game => {
            for (let player of game.players) {
                if (player.client === ws) {
                    player.status = PlayerStatus.offline
                    
                    broadcast(game,"update","Game Over");
                    if (player.id == 1) {
                        return false
                    } else {
                        return true
                    }
                } else {
                    return true
                }
            }
        });
        log("connection end")
    })


        // 设置定时器，每隔一定时间发送 ping 帧
    setInterval(() => {
        ws.ping();  // 发送 ping 帧
    }, 30000); // 每30秒发送一次

    
    

    ws.on("message", (message) => {
        const data = JSON.parse(message.toString())

        /* data 数据格式 
            应符合
            {
                option: string, 全部小写
                message: {  }
            }
            大部分情况下message会带有一个 game 和 content属性，game必须使用 extract的方法将game中的属性提取，防止传输过多无用数据
        
        */
        
        
        switch (data.option) {

            // 创建房间
            case "new":
                if (GameManager.searchForGame(data.message.code)) {
                    ws.send(JSON.stringify({
                        option: "error",
                        message: {
                            content: "Aleardy Exist"
                        }
                    }))
                    
                    return
                }
                const game = new GameManager(data.message.code, data.message.playerNumber)
                GameManager.gameList.push(game);
                
                
                game.players[0].connection(ws);
                game.players[0].status = PlayerStatus.ready
                ws.send(JSON.stringify({
                    option: "respone",
                    message: {
                        game: extract(game),
                        player: game.players[0],
                        content: "Game Created"
                    }
                }))
                
                break;
            
            // 处理加入游戏相关
            case "join":
                for(let game of GameManager.gameList) {
                    if (game.code === data.message.code) {
                        for(let player of game.players) {
                            if (player.id === data.message.playerID) {
                                if (player.status !== PlayerStatus.offline) {
                                    ws.send(JSON.stringify({
                                        option: "error",
                                        message: {
                                            content: "Occupied"
                                        }
                                    }))
                                    return
                                }
                                
                                player.connection(ws)
                                ws.send(JSON.stringify({
                                    option: "respone",
                                    message: {
                                        game: extract(game),
                                        player,
                                        content: "Linked"
                                        
                                    }
                                }))
                                broadcast(game,"update",`Player${player.id} join the game`)
                                return
                            }
                            
                        }
                    }
                };
                ws.send(JSON.stringify({
                    option: "error",
                    message: {
                        content:"Not Found"
                    }
                }))
                break;
            
            
            
            
        }   
    })

    

    log("Connection Established")
})

app.use(express.static("./resources/"))



server.listen(port, () => {
    console.log("server running at port " + port);
    
})



function sendMessage(target:WebSocket,option:string , message: any) {
    target.send(JSON.stringify({
        option,
        message
    }))
}

function sendError(target:WebSocket, message: string) {
    target.send(JSON.stringify({
        option: "error",
        message: {
            content: message,
        }
    }))
}

function rejection(target:WebSocket, message: string) {
    target.send(JSON.stringify({
        option: "rejection",
        message: {
            content: message,
        }
    }))
}


function broadcast(game: GameManager, option: string = "update", message: string = "Updated") {
    
    game.players.forEach(player => {
        if (player.client) {
            if (game.request?.target === player) {
                return
            }
            player.client.send(JSON.stringify({
                option,
                message: {
                    game: extract(game),
                    player,
                    content: message
                }
            }))
        }
    });
}


function sendRequest(target: WebSocket, question: string, options: string[], detail:any) {
    
    target.send(JSON.stringify({
        option: "request",
        message: {
            question,
            options,
            detail
            
        }
    }))
}









export {sendError, sendMessage, rejection, broadcast, sendRequest}