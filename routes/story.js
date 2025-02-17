const mongoose = require('mongoose');

const storySchema = mongoose.Schema({
  status_media:String,
  status_view:[{type: mongoose.Schema.Types.ObjectId, ref: 'user'}],
  status_likes:[{type: mongoose.Schema.Types.ObjectId, ref: 'user'}],
  status_caption:String,
  date: {type: Date, default: Date.now},
  user:{type: mongoose.Schema.Types.ObjectId, ref: 'user'},
  media_type:String
})

module.exports = mongoose.model('story', storySchema);