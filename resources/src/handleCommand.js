function handleCommand(input) {
    const command = (input + "").toLowerCase()
    switch (mode) {
        case "processing":
            
            const operation = (command + "").split(" ")[0]
            const parameter = (command + "").split(" ")[1]
            switch (operation) {
                case "p":
                    if (!Number.isInteger(Number(parameter))) {
                        prompt("Invalid Index", "error")
                        break;
                    }
                    prompt("Uploading...", "content")
                    sendMessage({
                        option: "play card",
                        message: {
                            code: gameData.gameCode,
                            id: gameData.playerID,
                            index: Number(parameter)
                        }

                    })
                    break;
                case "dc":
                    prompt("Uploading...", "content");
                    sendMessage({
                        option: "draw card",
                        message: {
                            code: gameData.gameCode,
                            id: gameData.playerID
                        }
                    })
                    break;
                case "re":
                    prompt("Uploading...", "content");
                    sendMessage({
                        option: "answer",
                        message: {
                            option: parameter
                        }
                    })
                    break;
                case "uno":
                    prompt("Uploading...", "content");
                    sendMessage({
                        option: "UNO",
                        message: {
                            option: parameter
                        }
                    })
                    break;
                case "rp":
                    if (!Number.isInteger(Number(parameter))) {
                        prompt("Invalid Index", "warn")
                        break;
                    }
                    prompt("Uploading...", "content")
                    sendMessage({
                        option: "report",
                        message: {
                            id: Number(parameter)
                        }

                    })
                default:
                    prompt("Invalid Command", "error")
                    break;
            }
            break;
        case "unstarted":
            switch (command) {
                case "start":

                    prompt("Uploading...", "content")
                    sendMessage({
                        option: "start",
                        message: {
                            code: gameData.gameCode,
                            id: gameData.playerID
                        }
                    })
                    break;
                case "ready":
                    prompt("You've already been ready", "error");
                    break;
                default:
                    prompt("Invalid Command", "warn")
            }
            break;

        case "unready":
            switch (command) {
                case "ready":
                    prompt("Uploading...", "content")
                    sendMessage({
                        option: "ready",
                        message: {
                            code: gameData.gameCode,
                            id: gameData.playerID
                        }
                    })
                    break;
                case "start":
                    prompt("You're not ready yet", "error")
                    break;
                default:
                    prompt("Invalid Command", "warn")
            }
            break;

        case "joining":
            var code = command
            if (!Number.isInteger(Number(code)) || Number(code) < 100 || Number(code) >= 1000) {
                prompt("Invalid Code, Game Code should be integer number between 100 and 999", "warn")

                return
            }
            setting[0] = parseInt(code)
            mode = "selecting"
            prompt("Enter the ID of your player", "info")
            break;

        case "selecting":
            var number = command
            if (!Number.isInteger(Number(number)) || Number(number) < 2 || Number(number) > 4) {
                prompt("Invalid Number", "warn")
                return
            }
            prompt("Uploading...", "content")
            setting[1] = parseInt(number)
            sendMessage({
                option: "join",
                message: {
                    code: setting[0],
                    playerID: setting[1]
                }
            })
            break;


        case "settingPlayerNumber":
            var number = command
            if (!Number.isInteger(Number(number)) || Number(number) < 2 || Number(number) > 8) {
                prompt("Invalid Number", "warn")
                return
            }
            prompt("Uploading...", "info")
            setting[1] = parseInt(number)
            sendMessage({
                option: "new",
                message: {
                    code: setting[0],
                    playerNumber: setting[1]
                }
            })
            break;
        case "new":
            var code = command
            if (!Number.isInteger(Number(code)) || Number(code) < 100 || Number(code) >= 1000) {
                prompt("Invalid Code, Game Code should be integer number between 100 and 999", "warn")
                return
            }
            setting[0] = parseInt(code)
            mode = "settingPlayerNumber"
            prompt("Setting the number of Players", "info")

            break;




        case false:
            switch (command) {
                case "new":
                    prompt("Enter the Game Code", "info")
                    mode = "new"
                    break;
                case "join":
                    prompt("Enter the Game Code", "info")
                    mode = "joining"
                    break;
                default:
                    prompt("Command Not Found", "warn")
                    break;
            }
            break;
    }
}



