let Player = require('../models/player');
const { body,validationResult } = require('express-validator');
const { find } = require('../models/player');

// Add player to database
exports.add_player_post = async(req,res,next) => {
    
    const errors = validationResult(req);

    let player = new Player({
        name: req.body.name,
        tracking_array: req.body.tracking_array,
        number_cards: req.body.number_cards,
        user: req.body.user,
        requests: req.body.requests
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
    let player = await Player.findById(req.body._id);
    if (player == null) {
        return res.json({message: 'no record'});
    }
    Player.findByIdAndRemove(req.body._id).then(() => {
        return res.json({message: 'delete successful'})
    })
    
}

//Start game - should check whether card amounts add up to 18, and if not return a error
exports.start_game_get = async(req,res,next) => {
    let players = await Player.find();
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
    let board = await Player.find();
    res.json(board);
}

// should return player list of names for use in add move form..
exports.add_move_get = async(req,res,next) => {
    let board = await Player.find();
    res.json(board);
}

//should add a move and update the database accordingly
exports.add_move_post = async(req,res,next) => {
    
    let playerid = req.body.playerId;
    let request = req.body.request;
    let cardshown = req.body.cardshown;
    let all_no = req.body.all_no;

    // this will change the status quo to where it should be.
    let player = await Player.findById(playerid);
    
    if (cardshown >= 0 && all_no === false){
        player.tracking_array[cardshown] = 1;
    } else if(all_no === true){
        for (let i =0; i<3; i++){
            player.tracking_array[request[i]] = -1;
        }
    } else {
        player.requests[player.requests.length]= request;
    }

    let updated = await Player.findByIdAndUpdate(
        player._id, player, { new: true });
    
    //update all players based on new info.

    let updateAll = await updateAllPlayers();
    res.json({message: updateAll});
}

//should delete all users from database
exports.end_game_get = async(req,res,next) => {
    let message = await Player.collection.drop();
    return res.json({message});
}

//send board summary in JSON on get
exports.board_summary_get = async(req,res,next) => {
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
    let board = await Player.find();
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
const updatePlayer = async (updated) => {

    let yeses = await getFullYesList();
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
    console.log(updated);

    updated.requests.forEach(request => {
        let ultimateRequest = [];
        let yes = false;
        console.log(request)
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
        console.log(ultimateRequest);
        
    })
        
    updated.requests = requests;
    console.log('updated requests');
    console.log(updated.requests)
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
const getFullYesList = async() => {
    
    let allPlayers = await Player.find();
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
const updateAllPlayers = async() => {
    let players = await Player.find();
    let promises = [];
    Array.from(players).forEach(player => {
        promises.push(updatePlayer(player))
    });
    const results = await Promise.all(promises);
    return results;
}