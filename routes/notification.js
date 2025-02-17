const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema({
    user: {type: mongoose.Schema.Types.ObjectId, ref:'user'},
    type: String,
    messageData:[{
        profile: {type: mongoose.Schema.Types.ObjectId, ref:'user'},
        post: {type: mongoose.Schema.Types.ObjectId, ref:'post'},
        comment: {type: mongoose.Schema.Types.ObjectId, ref:'comment'},
        story: {type: mongoose.Schema.Types.ObjectId, ref:'story'},
        commentMessage:String,
    }],
    date:{
        type: Date,
        default: Date.now,
    }
});

module.exports = mongoose.model('notification', notificationSchema);