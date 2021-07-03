let mongoose = require('mongoose');

let Schema = mongoose.Schema;

let UserSchema = new Schema(
    {
        username: {type: String, required: true},
        password: {type: String, required: true}
    }
);



//Virtual for user url
UserSchema
.virtual('url')
.get(function () {
  return '/database/user/' + this._id;
});

module.exports = mongoose.model('User', UserSchema);