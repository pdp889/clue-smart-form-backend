let Player = require('../models/player');
const { body,validationResult } = require('express-validator');
const decoder = require('jwt-decode');


// Add player to database
exports.add_player_post = async(req,res,next) => {
    
    const errors = validationResult(req);
    let token = req.headers.authorization.split(' ')[1];
    let decoded = decoder(token).sub;

    let player = new Player({
        name: req.body.name,
        tracking_array: req.body.tracking_array,
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
    
    let bool = false;
    if (req.body.all_no == 'true') {
        bool = true;
    }

    let message = '';
    let reqBody = req.body;

    let playerid = req.body.playerId;
    let request = req.body.request;
    let cardshown = parseInt(req.body.cardshown);
    let all_no = req.body.all_no;

    let token = req.headers.authorization.split(' ')[1];
    let decoded = decoder(token).sub;

    // this will change the status quo to where it should be.
    let player = await Player.findOne({ _id: playerid, user: decoded });
    if (cardshown >= 0 && all_no == false){
        message = 'A card is shown';
        player.tracking_array[cardshown] = 1;
    } else if(all_no == true){
        message = 'no card is shown';
        for (let i =0; i<3; i++){
            player.tracking_array[request[i]] = -1;
        }
    } else {
        message='a card is shown but we dont know what';
        let lastSpot = player.requests.length;
        if (!lastSpot) {
            lastSpot = 0;
        }
        player.requests[lastSpot]= request;
    }

    let updated = await Player.findByIdAndUpdate(
        player._id, player, { new: true });
    
    //update all players based on new info.

    let updateAll = await updateAllPlayers(decoded);
    res.json({message: message, reqBody: reqBody});
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
    
    let summary = [
        {
            name: 'Mustard',
            value: null
        },
        {
            name: 'Plum',
            value: null
        },
        {
            name: 'Green',
            value: null
        },
        {
            name: 'Peacock',
            value: null
        },
        {
            name: 'Scarlet',
            value: null
        },
        {
            name: 'White',
            value: null
        },
        {
            name: 'Knife',
            value: null
        },
        {
            name: 'Candlestick',
            value: null
        },
        {
            name: 'Revolver',
            value: null
        },
        {
            name: 'Rope',
            value: null
        },
        {
            name: 'Lead Pipe',
            value: null
        },
        {
            name: 'Wrench',
            value: null
        },
        {
            name: 'Hall',
            value: null
        },
        {
            name: 'Lounge',
            value: null
        },
        {
            name: 'Dining Room',
            value: null
        },
        {
            name: 'Kitchen',
            value: null
        },
        {
            name: 'Ballroom',
            value: null
        },
        {
            name: 'Conservatory',
            value: null
        },
        {
            name: 'Billiard Room',
            value: null
        },
        {
            name: 'Library',
            value: null
        },
        {
            name: 'Study',
            value: null
        }
    ]
    let packetTracker = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    let board = await Player.find({ user: decoded });
    Array.from(board).forEach(obj => {
        let array = obj.tracking_array;
        for (let i = 0; i<array.length; i++){
            let inPacket = 0;
            if (array[i] === 1){
                summary[i]["value"] = obj.name;
                packetTracker[i] +=1;
            }
            if (array[i] === 0){
                packetTracker[i] += 1;
            }
        }
    })

    for (let j = 0; j < packetTracker.length; j ++){
        if(packetTracker[j] === 0){
            summary[j]["value"] = 'IN PACKET';
        }
    }
    res.json(summary);
}

//Helper methods for post AddMove
//this method updates a player object based on the latest information in the database
const updatePlayer = async (updated, decoded) => {

    let yeses = await getFullYesList(decoded);
    let nos = [];
    let requests = [];

    // creates no list;
    for (let i =0; i < 21; i++){
        if (updated.tracking_array[i] === -1){
            nos.push(i);
        }
        if(updated.tracking_array[i] === 0){
            //check if i is on the yesList
            for (let k = 0; k < 21; k++){
                if (yeses[k] === i){
                    updated.tracking_array[i] = -1;
                }
            }


        }
    }

    updated.requests.forEach(request => {
        let ultimateRequest = [];
        let yes = false;
        //if any value in the request is a yes, 
        for(let i =0; i<3; i++){
            
            for(let k=0; k< updated.tracking_array.length; k++){
                if (updated.tracking_array[request[i]] === 1){
                    yes = true;
                }
            }    
        }
            
        if(yes===false){
                
            for(let i =0; i<request.length; i++){
                let push = 0;
                if (nos.length > 0){
                    for(let k=0; k< nos.length; k++){
                        if (request[i] === nos[k]){                        
                            push += 1;
                        }
                    }    
                } 
                if (push === 0){
                    ultimateRequest.push(request[i]);
                }    
                

            }

        }
            
        if (ultimateRequest.length === 1){
            
            updated.tracking_array[ultimateRequest[0]] = 1;
        } else if (ultimateRequest.length != 0){
            requests.push(ultimateRequest);
        }
        
    })
        
    updated.requests = requests;
    let array = await checkArray(updated.number_cards, updated.tracking_array);
    updated.trackingArray = array;
    
    let final = await Player.findByIdAndUpdate(updated._id, updated, {new: true});

    return final;
}
//this method checks if the number of a player's known cards are equal to the number of cards in his or her hand
const checkArray = async (numberOfCards, trackingArray) => {

    count = 0;
    for(let i = 0; i < trackingArray.length; i++){
        if (trackingArray[i] === 1){
            count += 1;
        }
    }

    if (count >= numberOfCards) {
        for(let i = 0; i < trackingArray.length; i++){
            if (trackingArray[i] === 0){
                trackingArray[i] = -1;
            }
        }
    }
    return trackingArray;
}

//this provides the full list of ruled out suspects
const getFullYesList = async(decoded) => {
    


    let allPlayers = await Player.find({ user: decoded });
    let yeses = [];

    Array.from(allPlayers).forEach( player => {
        for (let i =0; i < 21; i++){
            if (player.tracking_array[i] === 1){
                yeses.push(i);
            }
        }
    })

    return yeses;

}

//this cylces through all players calling the update player method.
const updateAllPlayers = async(decoded) => {
    let players = await Player.find({ user: decoded });
    let promises = [];
    Array.from(players).forEach(player => {
        promises.push(updatePlayer(player, decoded))
    });
    const results = await Promise.all(promises);
    return results;
}