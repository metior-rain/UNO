import { log } from "console";
import { deflateRaw } from "zlib";
import WebSocket from "ws";
import { broadcast, rejection, sendMessage, sendRequest } from "../app";
import { cardRender, extract } from "./kit";


// 卡牌的数字或者功能，draw4和wild都是万能牌才可以用的，hidden_是用来表示空牌的
enum CardType {
    zero = 0, one, two, three, four, five, six, seven, eight, nine, skip, reverse, draw2, wild, draw4, hidden_ = 100


}

// 卡牌的颜色，wild为万能牌
enum Color {
    yellow = 1, green, blue, red, wild
}



const CardTypeMapping: { [key: number]: CardType } = {
    1: CardType.zero, 2: CardType.zero,
    3: CardType.one, 4: CardType.one,
    5: CardType.two, 6: CardType.two,
    7: CardType.three, 8: CardType.three,
    9: CardType.four, 10: CardType.four,
    11: CardType.five, 12: CardType.five,
    13: CardType.six, 14: CardType.six,
    15: CardType.seven, 16: CardType.seven,
    17: CardType.eight, 18: CardType.eight,
    19: CardType.nine, 20: CardType.nine,
    21: CardType.skip, 22: CardType.skip,
    23: CardType.reverse, 24: CardType.reverse,
    25: CardType.draw2, 26: CardType.draw2,

}


// 表示请求输入，当GameManager实例中的request属性不为空且游戏模式为暂停，则表示当前游戏正在请求玩家输入，
// 用来实现请求摸牌后是否保留该牌，或者万能牌后选颜色，和质疑功能
interface Request {
    target: Player;


    question: string;

    options: string[]

    detail: any[]

    callback?: () => void
}








class Card {
    type: CardType = CardType.hidden_;

    color: Color = Color.wild;



    constructor(_type: CardType, _color: Color) {
        if (_color === Color.wild) {
            if (_type === CardType.draw4 || _type === CardType.wild || _type === CardType.hidden_) {
                this.type = _type,
                    this.color = _color
            } else {
                return
            }
        } else {
            if (_type === CardType.draw4 || _type === CardType.wild) {
                return
            }
            this.type = _type,
                this.color = _color
        }




    }

}





class Player {

    id: number


    // 是否为UNO状态
    UNO: boolean = false;

    // 当前玩家的客户端
    client: WebSocket | null = null;

    status: PlayerStatus = PlayerStatus.offline

    cards: Card[]

    private localtion: number;

    sendMessage(option: string, message: any) {
        this.client?.send(JSON.stringify({
            option,
            message
        }))
    }

    sendError(message: string) {
        this.client?.send(JSON.stringify({
            option: "error",
            message: {
                content: message,
            }
        }))
    }

    rejection(message: string, doNotCover = false) {
        this.client?.send(JSON.stringify({
            option: "rejection",
            message: {
                content: message,
                doNotCover,
            }
        }))
    }

    get game() {
        let game = GameManager.searchForGame(this.localtion)

        if (game) {
            return game
        } else {
            return new GameManager(100, 1)
        }

    }

    sortCards() {
        this.cards = this.cards.sort((card1, card2) => {
            if (card1.color == card2.color) {
                return card2.type - card1.type
            }
            return card2.color - card1.color
        })
    }

    addCards(cards: Card[]) {
        cards.forEach(card => {
            this.cards.push(card);
        });
        this.sortCards()
        this.UNO = false;
    }



    removeCard(index: number, deleteCount: number = 1, addback: boolean = false) {
        const removed = this.cards.splice(index - 1, deleteCount)
        if (addback) {
            this.addCards(removed);

        }
        return removed[0]
    }


    // 将玩家对象与客户端相连接，并设置客户端的Websocket
    connection(to: WebSocket) {
        if (GameManager.testMode) {
            this.status = PlayerStatus.ready
        } else if (this.game.status == GameStatus.unstarted) {
            this.status = PlayerStatus.linked
        } else if (this.game.status == GameStatus.processing) {
            if (this.status == PlayerStatus.offline) {
                if (this.game.isAllReady && this.game.request == null) {
                    this.game.status = GameStatus.processing
                }
            }
        } else {
            this.status = PlayerStatus.ready
        }
        this.client = to
        to.on("close", () => {
            this.status = PlayerStatus.offline;
            if (this.id === 1) {
                GameManager.gameList = GameManager.gameList.filter((game) => this.game.code != game.code);
                this.game.status = GameStatus.over
                broadcast(this.game, "update", "Game Over");
            } else if (this.game.status == GameStatus.processing) {
                this.game.status = GameStatus.paused;
                broadcast(this.game, "update", `Player${this.id} exit the game, Waiting for reconnecting`)
            }
        })
        to.on("message", (stream) => {
            const data = JSON.parse(stream.toString())


            switch (data.option) {
                case "ready":
                    this.status = PlayerStatus.ready;
                    broadcast(this.game, "update", `Player${this.id} is ready`)
                    break;
                case "start":
                    if (this.id == 1) {
                        if (this.game.isAllReady) {
                            this.game.status = GameStatus.processing

                            broadcast(this.game, "notice", "Game Start")
                        } else {

                            this.rejection("Not all players are ready")
                        }
                    } else {
                        rejection(this.client!, "You have no authority to do that")
                    }
                    break;
                case "answer": // 回应request请求
                    const request = this.game.request
                    if (request?.target === this) {
                        if (request.options.indexOf(data.message.option) != -1) {
                            switch (request.question) {
                                case "play?":
                                    switch (data.message.option) {
                                        case "yes":
                                            this.game.status = GameStatus.processing
                                            let newCard: Card | null = null
                                            this.cards = this.cards.filter((card) => {
                                                if (request == null) {
                                                    return true
                                                }
                                                if (card.color == request.detail[0].color && card.type == request.detail[0].type) {
                                                    this.game.request = null
                                                    newCard = card;
                                                    return false
                                                } else {
                                                    return true
                                                }
                                            })

                                            if (!this.game.playCard(this, newCard!)) {
                                                this.game.push();
                                                broadcast(this.game, "update", `Player${this.id} kept the card`)

                                            }

                                            break;
                                        case "no":
                                            this.game.status = GameStatus.processing
                                            this.game.push();
                                            this.game.request = null
                                            broadcast(this.game, "update", `Player${this.id} kept the card`)

                                            break;
                                        default:
                                            this.rejection("Invalid answer")
                                    }
                                case "color?":
                                    switch (data.message.option) {
                                        case "red":
                                            this.game.presentColor = Color.red;
                                            this.game.status = GameStatus.processing;
                                            this.game.request = null;
                                            broadcast(this.game, "update", `Player${request.target.id} turned the color red`)
                                            break;
                                        case "blue":
                                            this.game.presentColor = Color.blue;
                                            this.game.status = GameStatus.processing;

                                            this.game.request = null;
                                            broadcast(this.game, "update", `Player${request.target.id} turned the color blue`)
                                            break;
                                        case "green":
                                            this.game.presentColor = Color.green;
                                            this.game.status = GameStatus.processing;
                                            
                                            this.game.request = null;
                                            broadcast(this.game, "update", `Player${request.target.id} turned the color green`)
                                            break;
                                        case "yellow": this.game.presentColor = Color.yellow;
                                            this.game.status = GameStatus.processing;
                                            this.game.request = null;
                                            broadcast(this.game, "update", `Player${request.target.id} turned the color yellow`)
                                            break;

                                    }
                                    break;
                                case "challenge?":
                                    switch (data.message.option) {
                                        case "yes":
                                            let judge = false;
                                            for (let card of (request.detail[0] as Player).cards) {
                                                if (card.color == (request.detail[2] as Color)) {
                                                    log(request.detail[2] as Color)
                                                    judge = true;
                                                }
                                            }
                                            if (judge) {
                                                request.detail[0].addCards(GameManager.cardConstructor(4));
                                                this.game.status = GameStatus.processing;
                                                this.game.request = null;
                                                broadcast(this.game, "update", `Player${request.target.id} challenged it, and succeed`)

                                            } else {
                                                request.target.addCards(GameManager.cardConstructor(6));
                                                this.game.status = GameStatus.processing;
                                                this.game.request = null;
                                                this.game.push();
                                                
                                                broadcast(this.game, "update", `Player${request.target.id} challenged it, but failed`)            

                                            }

                                            break;
                                        case "no":
                                            request.detail[1].addCards(GameManager.cardConstructor(4));
                                            this.game.status = GameStatus.processing;

                                            this.game.request = null;
                                            this.game.push();
                                            broadcast(this.game, "update", `Player${request.target.id} accepted it`)
                                            break;


                                    }

                            }
                            if (request.callback) request.callback();


                        } else {
                            this.rejection("Invalid answer")
                        }
                    } else {
                        this.rejection("There are no request")
                    }
                    break;
                case "play card":

                    if (this != this.game.presentPlayer) {
                        rejection(this.client!, "It's not your turn")
                        return;
                    }
                    if (data.message.index > this.cards.length) {
                        rejection(this.client!, "You don't have that card")
                        return;
                    }
                    if (!this.game.playCard(this, this.removeCard(data.message.index))) {
                        rejection(this.client!, "You can't play this card");
                        return
                    }
                    break;
                case "draw card":
                    if (this.game.presentPlayer !== this) {
                        this.rejection("It's not your turn");
                        return
                    }
                    const newCard = GameManager.cardConstructor(1)
                    this.addCards(newCard);

                    broadcast(this.game, "update", `Player${this.id} draw a card`)
                    this.game.makeRequest(this, "play?", ["yes", "no"], [newCard[0]])
                    break;
                case "UNO":
                    if (this.cards.length <= 2) {
                        this.UNO = true;
                        broadcast(this.game, "update", `Player${this.id} UNOed`);
                    } else {
                        this.rejection("You can't do this now")
                    }
                    
                    break;
                case "report":
                    let target = this.game.searchPlayer(data.message.id,this.client)
                    if (target) {
                        log(target.cards.length,!target.UNO)
                        if (target.cards.length == 1 && !target.UNO) {
                            target.addCards(GameManager.cardConstructor(2));
                            broadcast(this.game, "update", `Player${target.id} didn't UNO, draw 2 cards`);
                            if (this.game.request?.target == target) {
                                target.client?.send(JSON.stringify({
                                    option: "caption",
                                    message: {
                                        game: extract(this.game),
                                        player: target,
                                        content: "You've been reported that you didn't UNO"
                                    }
                                }))
                            } 
                            
                        } else {
                            this.rejection("Report Failed")
                        }
                    } else {
                        this.rejection("Cannot find that player");
                    }
            }
        })
    }

    constructor(_id: number, _game: GameManager) {

        this.localtion = _game.code
        this.id = _id
        if (GameManager.testMode) {
            this.cards = []
            GameManager.testCardStack.forEach(card => {
                this.cards.push(card);
            });
        } else {
            this.cards = GameManager.cardConstructor()
        }
        this.sortCards();
    }
}






class GameManager {

    static testMode: boolean = false;

    static testCardStack: Card[] = [
        new Card(CardType.draw4, Color.wild),
        new Card(CardType.wild, Color.wild),
        new Card(CardType.reverse, Color.red),
        new Card(CardType.reverse, Color.red),
    ];


    static gameList: GameManager[] = []

    static initialCardNumber: number = 7

    code: number


    direction: number = 1

    push() {
        this.count += this.direction
    }

    cardStack: Card[] = []

    get players(): Player[] {
        return this.order
    }


    static searchForGame(gameID: number, from: GameManager[] = this.gameList): GameManager | null {

        var result: GameManager | null = null
        from.forEach(game => {
            if (game.code === gameID) {
                result = game

            }
        });
        return result

    }


    searchPlayer(id: number = 0, client: WebSocket | null = null): Player | null {
        var result: Player | null = null
        this.players.forEach(player => {
            if (player.id === id) {
                result = player
            }
        })
        return result
    }

    static cardConstructor(by: number = this.initialCardNumber): Card[] {
        const cardSeed = generateRandomNumbers(by)
        let cards: Card[] = []
        for (let num of cardSeed) {
            switch (true) {
                case (num >= 1 && num <= 25):
                    cards.push(new Card(CardTypeMapping[num], Color.red))
                    break;
                case (num >= 26 && num <= 50):
                    cards.push(new Card(CardTypeMapping[num - 25], Color.blue))
                    break;
                case (num >= 51 && num <= 75):
                    cards.push(new Card(CardTypeMapping[num - 50], Color.green))
                    break;
                case (num >= 76 && num <= 100):
                    cards.push(new Card(CardTypeMapping[num - 75], Color.yellow))
                    break;
                case (num >= 101 && num <= 104):
                    cards.push(new Card(CardType.wild, Color.wild))
                    break;
                case (num >= 105 && num <= 108):
                    cards.push(new Card(CardType.draw4, Color.wild))
                    break;


            }
        }

        return cards

    }


    get isAllReady(): boolean {
        for (let player of this.players) {
            if (player.status !== PlayerStatus.ready) {
                return false
            }

        }
        return true
    }

    presentColor: Color = Math.floor(Math.random() * 4) + 1;

    order: Player[]


    status: GameStatus = GameStatus.unstarted

    playerNumber: number

    count: number = 0


    get presentPlayer(): Player {
        let index = (this.count % this.playerNumber)

        return this.order[index < 0 ? this.playerNumber + index : index]
    }

    get nextPlayer(): Player {
        let index = (this.count + this.direction) % this.playerNumber;
        return this.order[index < 0 ? this.playerNumber + index : index]

    }


    get toppestCard(): Card {
        if (this.cardStack.length == 0) {
            return new Card(CardType.hidden_, Color.wild);

        }
        else {
            return this.cardStack[this.cardStack.length - 1];

        }
    }

    playCard(by: Player, using: Card): boolean {

        if (this.status != GameStatus.processing) {
            by.addCards([using])
            return false

        }
        if (this.presentPlayer != by) {
            by.addCards([using])
            return false
        }


        if (!this.gameLogic(by, using)) {
            by.addCards([using])
            return false
        }


        return true
    }

    constructor(_code: number, _playerNumber: number = 2) {
        this.code = _code
        this.playerNumber = _playerNumber
        this.order = []
        for (let i = 0; i < this.playerNumber; i++) {
            this.order[i] = new Player(i + 1, this);

        }

    }



    gameLogic(player: Player, card: Card): boolean {
        // if (card.color != this.presentColor && card.color != Color.wild && card.type != this.cardStack[this.cardStack.length - 1].type) {
        //     return false
        // }
        

        if (card.color == Color.wild) {
            // this.presentColor = Color.wild
            if (card.type == CardType.draw4) {
                //
                const present = this.presentPlayer;
                const next = this.nextPlayer;
                const color = this.presentColor
                this.makeRequest(player, "color?", ["red", "blue", "green", "yellow"], [this.presentPlayer, this.nextPlayer], () => {

                    this.makeRequest(next, "challenge?", ["yes", "no"], [present, next, color]);

                });
            } else {
                this.makeRequest(player, "color?", ["red", "blue", "green", "yellow"], [this.presentPlayer, this.nextPlayer])
            }

            //

        } else {
            if (this.presentColor == Color.wild || card.color == this.presentColor || card.type == this.toppestCard.type) {
                this.presentColor = card.color;


                // 特殊规则
                switch (card.type) {
                    case CardType.skip:
                        this.push()
                        if (this.playerNumber == 2) {
                            
                            this.presentPlayer.addCards(GameManager.cardConstructor(1));
                        }
                        break;
                    case CardType.reverse:
                        if (this.playerNumber == 2) {
                            this.push()
                        } else {
                            this.direction = -this.direction;


                        }
                        //
                        break;
                    case CardType.draw2:
                        this.push()
                        this.presentPlayer.addCards(GameManager.cardConstructor(2));

                        break;

                }
            } else {
                return false
            }

        }
        // log(this.toppestCard);
        this.cardStack.push(card);

        this.push()
        broadcast(this, "update", `Player${player.id} played ${cardRender([card])}`)
        if (player.cards.length == 0) {
            this.request = null
            this.status = GameStatus.over;
            broadcast(this, "update", "Game Over")
        }
        return true
    }


    request: Request | null = null

    makeRequest(target: Player, question: string, options: string[], detail: any[] = [], callback?: () => void) {
        this.status = GameStatus.paused;
        if (target.client) {
            this.request = {
                target,
                question,
                options,
                detail,
                callback
            }
            sendRequest(this.request.target.client!, this.request.question, this.request.options, {
                game: extract(this),
                player: this.request.target,
                attachment: this.request.detail,
                content: ""
            })
        }




    }

}





function generateRandomNumbers(count: number, min: number = 1, max: number = 108): number[] {
    const numbers: number[] = [];

    for (let i = 0; i < count; i++) {
        const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
        numbers.push(randomNumber);
    }
    return numbers;
}



enum GameStatus {
    unstarted = "Unstarted", processing = "Processing", paused = "Paused", over = "Over"
}

enum PlayerStatus {
    offline = "Offline",
    linked = "Linked",
    ready = "Ready"
}





export { Request, Card, CardType, GameManager, Player, Color, CardTypeMapping, PlayerStatus, GameStatus }