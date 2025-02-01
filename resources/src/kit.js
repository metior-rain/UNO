function cardMapping(_color, _type) {
    let color = ""
    let type = ""
    switch (_color) {
        case 1:
            color = "Yellow"
            break;
        case 2:
            color = "Green"
            break;
        case 3:
            color = "Blue"
            break;
        case 4:
            color = "Red"
            break;
        case 5:
            color = "Wild"
            break;
    }
    switch (_type) {
        case 0:
            type = "0"
            break;
        case 1:
            type = "1"
            break;
        case 2:
            type = "2"
            break;
        case 3:
            type = "3"
            break;
        case 4:
            type = "4"
            break;
        case 5:
            type = "5"
            break;
        case 6:
            type = "6"
            break;
        case 7:
            type = "7"
            break;
        case 8:
            type = "8"
            break;
        case 8:
            type = "8"
            break;
        case 9:
            type = "9"
            break;
        case 10:
            type = "Skip"
            break;
        case 11:
            type = "Reverse"
            break;
        case 12:
            type = "Draw 2"
            break;
        case 13:
            type = "Card"
            break;
        case 14:
            type = "Draw 4"
            break;
    }
    return [color,type]
}


function cardRender(cards, withIndex = true) {
    let result = ""
    let index = 1
    for (let card of cards) {
        
        if (card.type == 100) {
            result += `No Card`
            break;
        }
        result += `
        <span style="text-wrap: nowrap;">
        [${ withIndex ? " " + index + " " : " "}<span class="${cardMapping(card.color,card.type)[0].toLowerCase()}">${cardMapping(card.color,card.type)[0]} ${cardMapping(card.type,card.type)[1]} </span>]        </span>`
        index++
    }
    return result
}


function sendMessage(message) {
    socket.send(JSON.stringify(message));
}

function prompt(message, type, display = true) {
    if (display) {
        messageSlot.innerHTML = `<span class=\"${type}\">${message}</span>`
    }
    return `<span class=\"${type}\">${message}</span>`

}

