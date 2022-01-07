let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let playerSchema = new Schema ({
    name: {type: String, required: true},
    //tracking_obj has all the clue names in a map to integers -1, 0, 1 depending on what we know.
    tracking_obj: {type: Map, required: true},
    number_cards: {type: Number, required: true},
    //requests is an array of arrays following the general format [[Suspect, Weapon, Room]]
    requests: {type: Array, required: true},
    user: {type: Schema.Types.ObjectId, ref: 'User', required: true}
})

module.exports = mongoose.model('Player', playerSchema)