const mongoose = require('mongoose');

const postSchema = mongoose.Schema({
  image: String,
  caption: String,
  type: String,
  user:{type: mongoose.Schema.Types.ObjectId, ref: 'user'},
  likes:[{type: mongoose.Schema.Types.ObjectId, ref: 'user'}],
  date:{
    type: Date,
    default: Date.now
  },
  comment:[{type: mongoose.Schema.Types.ObjectId, ref: 'comment'}],
})

module.exports = mongoose.model('post', postSchema);