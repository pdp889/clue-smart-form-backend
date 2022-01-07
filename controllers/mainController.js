let Player = require('../models/player');
const { body,validationResult } = require('express-validator');
const decoder = require('jwt-decode');
const { default: jwtDecode } = require('jwt-decode');
const clueCard = {
    suspects: ['Mustard', 'Plum', 'Green', 'Peacock', 'Scarlet', 'White'],
    weapons: ['Knife', 'Candlestick', 'Revolver', 'Rope', 'Lead Pipe', 'Wrench'],
    rooms:['Hall', 'Lounge', 'Dining Room', 'Kitchen', 'Ballroom', 'Conservatory', 'Billiard Room', 'Library', 'Study'],
    allCards: [].concat(this.suspects, this.weapons, this.rooms)
}

// Add player to database
exports.add_player_post = async(req,res,next) => {
    
    const errors = validationResult(req);
    let token = req.headers.authorization.split(' ')[1];
    let decoded = decoder(token).sub;

    let player = new Player({
        name: req.body.name,
        tracking_obj: req.body.tracking_obj,
        number_cards: req.body.number_cards,
        requests: [],
        user: decoded
    })

    if (!errors.isEmpty()){
        return res.json({player, errors:errors.array()})
    } else {
        player.save((err) => {
            if (err) { return next(err); }
            return res.json({'status': 'player added'})
        })
    }
}

//Remove player from database
exports.remove_player_post = async(req,res,next) => {
    
    let token = req.headers.authorization.split(' ')[1];
    let decoded = decoder(token).sub;
    
    let player = await Player.find({ _id: req.body._id, user: decoded });
    if (player == null) {
        return res.json({message: 'no record'});
    }
    Player.findByIdAndRemove(req.body._id).then(() => {
        return res.json({message: 'delete successful'})
    })
    
}

//Start game - should check whether card amounts add up to 18, and if not return a error
exports.start_game_get = async(req,res,next) => {
    let token = req.headers.authorization.split(' ')[1];
    let decoded = decoder(token).sub;
    
    let players = await Player.find({ user: decoded });
    let count = 0;
    Array.from(players).forEach(player => {
        count += player.number_cards;
    })
    if (count === 18){
        res.json({message: 'count is 18, start game!'})
    }else {
        res.json({error: 'count is ' + count + ', correct so it is 18'})
    }
}

//send full board in JSON on get
exports.board_get = async(req,res,next) => {
    let token = req.headers.authorization.split(' ')[1];
    let decoded = decoder(token).sub;
    
    let board = await Player.find({ user: decoded });
    res.json(board);
}

// should return player list of names for use in add move form..
exports.add_move_get = async(req,res,next) => {
    let token = req.headers.authorization.split(' ')[1];
    let decoded = decoder(token).sub;
    
    let board = await Player.find({ user: decoded });
    res.json(board);
}

//should add a move and update the database accordingly
exports.add_move_post = async(req,res,next) => {
    
    let allNo = false;

    if (req.body.all_no == 'true') {
        allNo = true;
    }

    let message = '';
    let reqBody = req.body;

    let playerid = req.body.playerId;
    let request = req.body.request;
    let cardshown = req.body.cardshown;
    let all_no = allNo;

    let token = req.headers.authorization.split(' ')[1];
    let decoded = decoder(token).sub;

    // this will change the status quo to where it should be.
    let player = await Player.findOne({ _id: playerid, user: decoded });
    let copy = Object.assign({}, player.tracking_obj);
    if (cardshown !="Unknown" && all_no == false){
        message = 'A card is shown';
        player.tracking_obj[cardshown] = 1;
        copy[cardshown] = 1;
    } else if(all_no == true){
        message = 'no card is shown';
        for (let i =0; i<3; i++){
            player.tracking_obj[request[i]] = -1;
            copy[cardshown] = 1;
        }
    } else {
        message=`it is ${allNo} that this was an all know, and we should know that a card is shown but not know what`;
        //we put the request at the end of the array. 
        player.requests = player.requests || [];
        player.requests.push(request);
    }
    res.json({obj: player.tracking_obj, copy: copy});
    // let updated = await Player.findByIdAndUpdate(
    //     player._id, player, { new: true });
    
    // //update all players based on new info.

    // //let updateAll = await updateAllPlayers(decoded);
    //res.json({message: message, reqBody: reqBody});
}

//should delete all users from database
exports.end_game_get = async(req,res,next) => {
    let token = req.headers.authorization.split(' ')[1];
    let decoded = decoder(token).sub;
    let message = await Player.deleteMany({ user: decoded });
    return res.json({message});
}

//send board summary in JSON on get
exports.board_summary_get = async(req,res,next) => {
    
    let token = req.headers.authorization.split(' ')[1];
    let decoded = decoder(token).sub;
    let summary = {};
    let packetTracker = {};
    clueCard.allCards.forEach(i => {
        summary[i] = null;
        packetTracker[i] = 0;
    });
    let board = await Player.find({ user: decoded });

    Array.from(board).forEach(playerObj => {
        let trackingObj = playerObj.tracking_obj;
        clueCard.allCards.forEach(i => {
            if (trackingObj[i] === 1){
                //we know who has it, and it's not in packet.
                summary[i]= playerObj.name;
                packetTracker[i] +=1;
            }
            if (trackingObj[i] === 0){
                //we don't know about this one.
                packetTracker[i] += 1;
            }
        });
    })

    clueCard.allCards.forEach(j => {
        if(packetTracker[j] === 0){
            //we know it's in packet.
            summary[j] = 'IN PACKET';
        }
    });
    res.json(summary);
}

//Helper methods for post AddMove
//this method updates a player object based on the latest information in the database
const updatePlayer = async (updatedPlayer, decoded) => {

    let yeses = await getFullYesList(decoded);
    let nos = getBlankClueCard(false);
    let workingRequests = [];

    // creates no map, and updated tracking obj if something is on the yes list;
    clueCard.allCards.forEach(cardName => {
        if(updatedPlayer.tracking_obj[cardName] <= 0){
            if (yeses[cardName] && updatedPlayer.tracking_obj[cardName] == 0){
                //if it's on the yeses, then we know this player doesn't have this card.
                updatedPlayer.tracking_obj[cardName] = -1;
            }                 
            nos[cardName] = true;
        }
    });

    //This loop iterates over each request and does a bunch of ridiculous for loops and eventually 
    //updates the request or the board as appropriate and adds it back to workingRequests
    updatedPlayer.requests.forEach(request => {
        let ultimateRequest = [];
        let yes = false;
        //if any value in the request is a yes, 
        request.forEach(card => {
            if (yeses[card]){
                yes = true;
                //this means there's a yes, so we don't do anything else with this request.
        }});

            
        if(!yes){  
            request.forEach(card => {
                if (!nos[card]){
                    // this card is not a known no, so we leave it.
                    ultimateRequest.push(card);
                }
            });
        }

        //if there is only one name in the request, we know the player has that card.    
        if (ultimateRequest.length === 1){
            updatedPlayer.tracking_obj[ultimateRequest[0]] = 1;
        } else if (ultimateRequest.length != 0){
            workingRequests.push(ultimateRequest);
        }
        
    })
        
    updatedPlayer.requests = workingRequests;
    let finalUpdatedTrackingObj = await checkTrackingObj(updatedPlayer.number_cards, updatedPlayer.tracking_obj);
    updatedPlayer.tracking_obj = finalUpdatedTrackingObj;
    
    let final = await Player.findByIdAndUpdate(updatedPlayer._id, updatedPlayer, {new: true});
    return final;
}
//this method checks if the number of a player's known cards are equal to the number of cards in his or her hand, and if so, sets nos for all the other cards.
const checkTrackingObj = async (numberOfCards, trackingObj) => {

    count = 0;
    clueCard.allCards.forEach( card => {
        if (trackingObj[card] === 1){
            count += 1;
        }
    });

    if (count >= numberOfCards) {
        clueCard.allCards.forEach( card => {
            if (trackingObj[card] === 0){
                trackingObj[card] = -1;
            }
        });
    }
    return trackingObj;
}

//this provides the full list of ruled out suspects
const getFullYesList = async(decoded) => {

    let allPlayers = await Player.find({ user: decoded });
    let yeses = getBlankClueCard(false);

    Array.from(allPlayers).forEach( player => {
        clueCard.allCards.forEach(name => {
            if (player.tracking_obj[name] === 1){
                yeses[name] = true;
            }
        });
    });
    return yeses;
}

//this cylces through all players calling the update player method.
const updateAllPlayers = async(decoded) => {
    let players = await Player.find({ user: decoded });
    let promises = [];
    //add each player to the promises queue for their update player function.
    Array.from(players).forEach(player => {
        promises.push(updatePlayer(player, decoded))
    });
    const results = await Promise.all(promises);
    return results;
}

const getBlankClueCard = (initialValue) => {
    let obj = {};
    clueCard.allCards.forEach(card => {
        obj[card] = initialValue;
    });
    return obj;
}