"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameStatus = exports.PlayerStatus = exports.CardTypeMapping = exports.Color = exports.Player = exports.GameManager = exports.CardType = exports.Card = void 0;
const console_1 = require("console");
const app_1 = require("../app");
const kit_1 = require("./kit");
var CardType;
(function (CardType) {
    CardType[CardType["zero"] = 0] = "zero";
    CardType[CardType["one"] = 1] = "one";
    CardType[CardType["two"] = 2] = "two";
    CardType[CardType["three"] = 3] = "three";
    CardType[CardType["four"] = 4] = "four";
    CardType[CardType["five"] = 5] = "five";
    CardType[CardType["six"] = 6] = "six";
    CardType[CardType["seven"] = 7] = "seven";
    CardType[CardType["eight"] = 8] = "eight";
    CardType[CardType["nine"] = 9] = "nine";
    CardType[CardType["skip"] = 10] = "skip";
    CardType[CardType["reverse"] = 11] = "reverse";
    CardType[CardType["draw2"] = 12] = "draw2";
    CardType[CardType["wild"] = 13] = "wild";
    CardType[CardType["draw4"] = 14] = "draw4";
    CardType[CardType["hidden_"] = 100] = "hidden_";
})(CardType || (exports.CardType = CardType = {}));
var Color;
(function (Color) {
    Color[Color["yellow"] = 1] = "yellow";
    Color[Color["green"] = 2] = "green";
    Color[Color["blue"] = 3] = "blue";
    Color[Color["red"] = 4] = "red";
    Color[Color["wild"] = 5] = "wild";
})(Color || (exports.Color = Color = {}));
const CardTypeMapping = {
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
};
exports.CardTypeMapping = CardTypeMapping;
class Card {
    constructor(_type, _color) {
        this.type = CardType.hidden_;
        this.color = Color.wild;
        if (_color === Color.wild) {
            if (_type === CardType.draw4 || _type === CardType.wild || _type === CardType.hidden_) {
                this.type = _type,
                    this.color = _color;
            }
            else {
                return;
            }
        }
        else {
            if (_type === CardType.draw4 || _type === CardType.wild) {
                return;
            }
            this.type = _type,
                this.color = _color;
        }
    }
}
exports.Card = Card;
class Player {
    sendMessage(option, message) {
        var _a;
        (_a = this.client) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify({
            option,
            message
        }));
    }
    sendError(message) {
        var _a;
        (_a = this.client) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify({
            option: "error",
            message: {
                content: message,
            }
        }));
    }
    rejection(message, doNotCover = false) {
        var _a;
        (_a = this.client) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify({
            option: "rejection",
            message: {
                content: message,
                doNotCover,
            }
        }));
    }
    get game() {
        let game = GameManager.searchForGame(this.localtion);
        if (game) {
            return game;
        }
        else {
            return new GameManager(100, 1);
        }
    }
    sortCards() {
        this.cards = this.cards.sort((card1, card2) => {
            if (card1.color == card2.color) {
                return card2.type - card1.type;
            }
            return card2.color - card1.color;
        });
    }
    addCards(cards) {
        cards.forEach(card => {
            this.cards.push(card);
        });
        this.sortCards();
        this.UNO = false;
    }
    removeCard(index, deleteCount = 1, addback = false) {
        const removed = this.cards.splice(index - 1, deleteCount);
        if (addback) {
            this.addCards(removed);
        }
        return removed[0];
    }
    connection(to) {
        if (GameManager.testMode) {
            this.status = PlayerStatus.ready;
        }
        else if (this.game.status == GameStatus.unstarted) {
            this.status = PlayerStatus.linked;
        }
        else if (this.game.status == GameStatus.processing) {
            if (this.status == PlayerStatus.offline) {
                if (this.game.isAllReady && this.game.request == null) {
                    this.game.status = GameStatus.processing;
                }
            }
        }
        else {
            this.status = PlayerStatus.ready;
        }
        this.client = to;
        to.on("close", () => {
            this.status = PlayerStatus.offline;
            if (this.id === 1) {
                GameManager.gameList = GameManager.gameList.filter((game) => this.game.code != game.code);
                this.game.status = GameStatus.over;
                (0, app_1.broadcast)(this.game, "update", "Game Over");
            }
            else if (this.game.status == GameStatus.processing) {
                this.game.status = GameStatus.paused;
                (0, app_1.broadcast)(this.game, "update", `Player${this.id} exit the game, Waiting for reconnecting`);
            }
        });
        to.on("message", (stream) => {
            var _a, _b;
            const data = JSON.parse(stream.toString());
            switch (data.option) {
                case "ready":
                    this.status = PlayerStatus.ready;
                    (0, app_1.broadcast)(this.game, "update", `Player${this.id} is ready`);
                    break;
                case "start":
                    if (this.id == 1) {
                        if (this.game.isAllReady) {
                            this.game.status = GameStatus.processing;
                            (0, app_1.broadcast)(this.game, "notice", "Game Start");
                        }
                        else {
                            this.rejection("Not all players are ready");
                        }
                    }
                    else {
                        (0, app_1.rejection)(this.client, "You have no authority to do that");
                    }
                    break;
                case "answer":
                    const request = this.game.request;
                    if ((request === null || request === void 0 ? void 0 : request.target) === this) {
                        if (request.options.indexOf(data.message.option) != -1) {
                            switch (request.question) {
                                case "play?":
                                    switch (data.message.option) {
                                        case "yes":
                                            this.game.status = GameStatus.processing;
                                            let newCard = null;
                                            this.cards = this.cards.filter((card) => {
                                                if (request == null) {
                                                    return true;
                                                }
                                                if (card.color == request.detail[0].color && card.type == request.detail[0].type) {
                                                    this.game.request = null;
                                                    newCard = card;
                                                    return false;
                                                }
                                                else {
                                                    return true;
                                                }
                                            });
                                            if (!this.game.playCard(this, newCard)) {
                                                this.game.push();
                                                (0, app_1.broadcast)(this.game, "update", `Player${this.id} kept the card`);
                                            }
                                            break;
                                        case "no":
                                            this.game.status = GameStatus.processing;
                                            this.game.push();
                                            this.game.request = null;
                                            (0, app_1.broadcast)(this.game, "update", `Player${this.id} kept the card`);
                                            break;
                                        default:
                                            this.rejection("Invalid answer");
                                    }
                                case "color?":
                                    switch (data.message.option) {
                                        case "red":
                                            this.game.presentColor = Color.red;
                                            this.game.status = GameStatus.processing;
                                            this.game.request = null;
                                            (0, app_1.broadcast)(this.game, "update", `Player${request.target.id} turned the color red`);
                                            break;
                                        case "blue":
                                            this.game.presentColor = Color.blue;
                                            this.game.status = GameStatus.processing;
                                            this.game.request = null;
                                            (0, app_1.broadcast)(this.game, "update", `Player${request.target.id} turned the color blue`);
                                            break;
                                        case "green":
                                            this.game.presentColor = Color.green;
                                            this.game.status = GameStatus.processing;
                                            this.game.request = null;
                                            (0, app_1.broadcast)(this.game, "update", `Player${request.target.id} turned the color green`);
                                            break;
                                        case "yellow":
                                            this.game.presentColor = Color.yellow;
                                            this.game.status = GameStatus.processing;
                                            this.game.request = null;
                                            (0, app_1.broadcast)(this.game, "update", `Player${request.target.id} turned the color yellow`);
                                            break;
                                    }
                                    break;
                                case "challenge?":
                                    switch (data.message.option) {
                                        case "yes":
                                            let judge = false;
                                            for (let card of request.detail[0].cards) {
                                                if (card.color == request.detail[2]) {
                                                    (0, console_1.log)(request.detail[2]);
                                                    judge = true;
                                                }
                                            }
                                            if (judge) {
                                                request.detail[0].addCards(GameManager.cardConstructor(4));
                                                this.game.status = GameStatus.processing;
                                                this.game.request = null;
                                                (0, app_1.broadcast)(this.game, "update", `Player${request.target.id} challenged it, and succeed`);
                                            }
                                            else {
                                                request.target.addCards(GameManager.cardConstructor(6));
                                                this.game.status = GameStatus.processing;
                                                this.game.request = null;
                                                this.game.push();
                                                (0, app_1.broadcast)(this.game, "update", `Player${request.target.id} challenged it, but failed`);
                                            }
                                            break;
                                        case "no":
                                            request.detail[1].addCards(GameManager.cardConstructor(4));
                                            this.game.status = GameStatus.processing;
                                            this.game.request = null;
                                            this.game.push();
                                            (0, app_1.broadcast)(this.game, "update", `Player${request.target.id} accepted it`);
                                            break;
                                    }
                            }
                            if (request.callback)
                                request.callback();
                        }
                        else {
                            this.rejection("Invalid answer");
                        }
                    }
                    else {
                        this.rejection("There are no request");
                    }
                    break;
                case "play card":
                    if (this != this.game.presentPlayer) {
                        (0, app_1.rejection)(this.client, "It's not your turn");
                        return;
                    }
                    if (data.message.index > this.cards.length) {
                        (0, app_1.rejection)(this.client, "You don't have that card");
                        return;
                    }
                    if (!this.game.playCard(this, this.removeCard(data.message.index))) {
                        (0, app_1.rejection)(this.client, "You can't play this card");
                        return;
                    }
                    break;
                case "draw card":
                    if (this.game.presentPlayer !== this) {
                        this.rejection("It's not your turn");
                        return;
                    }
                    const newCard = GameManager.cardConstructor(1);
                    this.addCards(newCard);
                    (0, app_1.broadcast)(this.game, "update", `Player${this.id} draw a card`);
                    this.game.makeRequest(this, "play?", ["yes", "no"], [newCard[0]]);
                    break;
                case "UNO":
                    if (this.cards.length <= 2) {
                        this.UNO = true;
                        (0, app_1.broadcast)(this.game, "update", `Player${this.id} UNOed`);
                    }
                    else {
                        this.rejection("You can't do this now");
                    }
                    break;
                case "report":
                    let target = this.game.searchPlayer(data.message.id, this.client);
                    if (target) {
                        (0, console_1.log)(target.cards.length, !target.UNO);
                        if (target.cards.length == 1 && !target.UNO) {
                            target.addCards(GameManager.cardConstructor(2));
                            (0, app_1.broadcast)(this.game, "update", `Player${target.id} didn't UNO, draw 2 cards`);
                            if (((_a = this.game.request) === null || _a === void 0 ? void 0 : _a.target) == target) {
                                (_b = target.client) === null || _b === void 0 ? void 0 : _b.send(JSON.stringify({
                                    option: "caption",
                                    message: {
                                        game: (0, kit_1.extract)(this.game),
                                        player: target,
                                        content: "You've been reported that you didn't UNO"
                                    }
                                }));
                            }
                        }
                        else {
                            this.rejection("Report Failed");
                        }
                    }
                    else {
                        this.rejection("Cannot find that player");
                    }
            }
        });
    }
    constructor(_id, _game) {
        this.UNO = false;
        this.client = null;
        this.status = PlayerStatus.offline;
        this.localtion = _game.code;
        this.id = _id;
        if (GameManager.testMode) {
            this.cards = [];
            GameManager.testCardStack.forEach(card => {
                this.cards.push(card);
            });
        }
        else {
            this.cards = GameManager.cardConstructor();
        }
        this.sortCards();
    }
}
exports.Player = Player;
class GameManager {
    push() {
        this.count += this.direction;
    }
    get players() {
        return this.order;
    }
    static searchForGame(gameID, from = this.gameList) {
        var result = null;
        from.forEach(game => {
            if (game.code === gameID) {
                result = game;
            }
        });
        return result;
    }
    searchPlayer(id = 0, client = null) {
        var result = null;
        this.players.forEach(player => {
            if (player.id === id) {
                result = player;
            }
        });
        return result;
    }
    static cardConstructor(by = this.initialCardNumber) {
        const cardSeed = generateRandomNumbers(by);
        let cards = [];
        for (let num of cardSeed) {
            switch (true) {
                case (num >= 1 && num <= 25):
                    cards.push(new Card(CardTypeMapping[num], Color.red));
                    break;
                case (num >= 26 && num <= 50):
                    cards.push(new Card(CardTypeMapping[num - 25], Color.blue));
                    break;
                case (num >= 51 && num <= 75):
                    cards.push(new Card(CardTypeMapping[num - 50], Color.green));
                    break;
                case (num >= 76 && num <= 100):
                    cards.push(new Card(CardTypeMapping[num - 75], Color.yellow));
                    break;
                case (num >= 101 && num <= 104):
                    cards.push(new Card(CardType.wild, Color.wild));
                    break;
                case (num >= 105 && num <= 108):
                    cards.push(new Card(CardType.draw4, Color.wild));
                    break;
            }
        }
        return cards;
    }
    get isAllReady() {
        for (let player of this.players) {
            if (player.status !== PlayerStatus.ready) {
                return false;
            }
        }
        return true;
    }
    get presentPlayer() {
        let index = (this.count % this.playerNumber);
        return this.order[index < 0 ? this.playerNumber + index : index];
    }
    get nextPlayer() {
        let index = (this.count + this.direction) % this.playerNumber;
        return this.order[index < 0 ? this.playerNumber + index : index];
    }
    get toppestCard() {
        if (this.cardStack.length == 0) {
            return new Card(CardType.hidden_, Color.wild);
        }
        else {
            return this.cardStack[this.cardStack.length - 1];
        }
    }
    playCard(by, using) {
        if (this.status != GameStatus.processing) {
            by.addCards([using]);
            return false;
        }
        if (this.presentPlayer != by) {
            by.addCards([using]);
            return false;
        }
        if (!this.gameLogic(by, using)) {
            by.addCards([using]);
            return false;
        }
        return true;
    }
    constructor(_code, _playerNumber = 2) {
        this.direction = 1;
        this.cardStack = [];
        this.presentColor = Math.floor(Math.random() * 4) + 1;
        this.status = GameStatus.unstarted;
        this.count = 0;
        this.request = null;
        this.code = _code;
        this.playerNumber = _playerNumber;
        this.order = [];
        for (let i = 0; i < this.playerNumber; i++) {
            this.order[i] = new Player(i + 1, this);
        }
    }
    gameLogic(player, card) {
        // if (card.color != this.presentColor && card.color != Color.wild && card.type != this.cardStack[this.cardStack.length - 1].type) {
        //     return false
        // }
        if (card.color == Color.wild) {
            // this.presentColor = Color.wild
            if (card.type == CardType.draw4) {
                //
                const present = this.presentPlayer;
                const next = this.nextPlayer;
                const color = this.presentColor;
                this.makeRequest(player, "color?", ["red", "blue", "green", "yellow"], [this.presentPlayer, this.nextPlayer], () => {
                    this.makeRequest(next, "challenge?", ["yes", "no"], [present, next, color]);
                });
            }
            else {
                this.makeRequest(player, "color?", ["red", "blue", "green", "yellow"], [this.presentPlayer, this.nextPlayer]);
            }
            //
        }
        else {
            if (this.presentColor == Color.wild || card.color == this.presentColor || card.type == this.toppestCard.type) {
                this.presentColor = card.color;
                // 特殊规则
                switch (card.type) {
                    case CardType.skip:
                        this.push();
                        if (this.playerNumber == 2) {
                            this.presentPlayer.addCards(GameManager.cardConstructor(1));
                        }
                        break;
                    case CardType.reverse:
                        if (this.playerNumber == 2) {
                            this.push();
                        }
                        else {
                            this.direction = -this.direction;
                        }
                        //
                        break;
                    case CardType.draw2:
                        this.push();
                        this.presentPlayer.addCards(GameManager.cardConstructor(2));
                        break;
                }
            }
            else {
                return false;
            }
        }
        // log(this.toppestCard);
        this.cardStack.push(card);
        this.push();
        (0, app_1.broadcast)(this, "update", `Player${player.id} played ${(0, kit_1.cardRender)([card])}`);
        if (player.cards.length == 0) {
            this.request = null;
            this.status = GameStatus.over;
            (0, app_1.broadcast)(this, "update", "Game Over");
        }
        return true;
    }
    makeRequest(target, question, options, detail = [], callback) {
        this.status = GameStatus.paused;
        if (target.client) {
            this.request = {
                target,
                question,
                options,
                detail,
                callback
            };
            (0, app_1.sendRequest)(this.request.target.client, this.request.question, this.request.options, {
                game: (0, kit_1.extract)(this),
                player: this.request.target,
                attachment: this.request.detail,
                content: ""
            });
        }
    }
}
exports.GameManager = GameManager;
GameManager.testMode = false;
GameManager.testCardStack = [
    new Card(CardType.draw4, Color.wild),
    new Card(CardType.wild, Color.wild),
    new Card(CardType.reverse, Color.red),
    new Card(CardType.reverse, Color.red),
];
GameManager.gameList = [];
GameManager.initialCardNumber = 7;
function generateRandomNumbers(count, min = 1, max = 108) {
    const numbers = [];
    for (let i = 0; i < count; i++) {
        const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
        numbers.push(randomNumber);
    }
    return numbers;
}
var GameStatus;
(function (GameStatus) {
    GameStatus["unstarted"] = "Unstarted";
    GameStatus["processing"] = "Processing";
    GameStatus["paused"] = "Paused";
    GameStatus["over"] = "Over";
})(GameStatus || (exports.GameStatus = GameStatus = {}));
var PlayerStatus;
(function (PlayerStatus) {
    PlayerStatus["offline"] = "Offline";
    PlayerStatus["linked"] = "Linked";
    PlayerStatus["ready"] = "Ready";
})(PlayerStatus || (exports.PlayerStatus = PlayerStatus = {}));
