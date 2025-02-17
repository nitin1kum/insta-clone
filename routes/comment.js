const mongoose = require('mongoose');

const commentSchema = mongoose.Schema({
  commentUser:{type: mongoose.Schema.Types.ObjectId, ref: 'user'},
  post:{type: mongoose.Schema.Types.ObjectId, ref: 'post'},
  likes:[{type: mongoose.Schema.Types.ObjectId, ref: 'user'}],
  date:{
    type: Date,
    default: Date.now
  },
  comment: String,
})

module.exports = mongoose.model('comment', commentSchema);