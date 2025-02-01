function update(data, display = true) {

    if (display) prompt(data.content, "content")



    if (data.game.status == "Unstarted") {
        switch (data.player.status) {
            case "Ready":
                mode = "unstarted"
                break;
            case "Linked":
                mode = "unready"
                break;
        }
        cardboard.style.display = "none"
    } else {
        mode = "processing"
        cardboard.style.display = "block"
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
    }

    statusBoard.innerHTML = `<span class="stress">Player Status:</span> <br>`



    cardboard.innerHTML = `<span class="stress">Your Cards:</span><br>`
    cardboard.innerHTML += cardRender(data.player.cards)




    for (player of data.game.players) {
        if (data.player.id === player.id) {
            statusBoard.innerHTML += `<span class="warn">(ME)</span>`
        }
        if (player.UNO) {
            statusBoard.innerHTML += `<span class="stress">(UNO!)</span>`
        }
        if (mode == "processing") {
            statusBoard.innerHTML += `
                <span class="info">Player${player.id}: </span>
                <span class="content">${player.cards.length} ${player.cards.length == 1 ? "card" : "cards"} left</span>
                <span class="stress">${mode == "processing" && data.game.presentPlayer.id == player.id ? "<- Playing" : ""}</span>
                <br>
            `
        } else {
            statusBoard.innerHTML += `
            <span class="info">Player${player.id}: </span>
            <span class="content">${player.status}</span>
            <span class="stress">${mode == "processing" && data.game.presentPlayer.id == player.id ? "<- Playing" : ""}</span>
            <br>
        `
        }


    }
    statusBoard.innerHTML += `
        <span class="info">Game Code: </span>
        <span class="content">${data.game.code}</span>;
        <span class="info">Toppest Card: </span>
        <span class="content">${cardRender([data.game.toppestCard], false)}</span>;
        <span class="info">Present Color:</span>
        <span class="content">${cardMapping(data.game.presentColor,"")[0]}</span>
        <br>
        
    `
    

    if (data.game.presentPlayer.id == gameData.playerID && data.game.status === "Processing") {
        messageSlot.innerHTML += "<br>Your Turn"
    }
}