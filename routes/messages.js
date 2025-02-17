const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
  user:[{type: mongoose.Schema.Types.ObjectId, ref: 'user'}],
  messages:[
    {
       sender:{type: mongoose.Schema.Types.ObjectId, ref: 'user'},
       message:String,
       date: {
        type:Date,
        default: Date.now
       }
    }
  ]
})

module.exports = mongoose.model('message', messageSchema);