let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let playerSchema = new Schema ({
    name: {type: String, required: true},
    tracking_array: {type: Array, required: true},
    number_cards: {type: Number, required: true},
    user: {type: Boolean, required: true},
    requests: {type: Array, required: true}
})

module.exports = mongoose.model('Player', playerSchema)