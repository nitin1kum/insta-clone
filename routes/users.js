const mongoose = require('mongoose');
const plm = require('passport-local-mongoose');
require("dotenv").config();

mongoose.connect(process.env.MONGODB_URI).then(()=>{
  console.log("Database connected")
}).catch((err)=>{
  console.log("error while connecting to db : ",err);
});

mongoose.connection.on('error',(err)=>{
  console.log(err)
})


const userSchema = mongoose.Schema({
  username: String,
  email: String,
  name: String,
  password: String,
  profileImage: {
    type: String,
    default: '126-1262807_instagram-default-profile-picture-png.png'
  },
  bio: String,
  posts:[{type: mongoose.Schema.Types.ObjectId, ref: 'post'}],
  savedPost:[{type: mongoose.Schema.Types.ObjectId, ref: 'post'}],
  follower:[{type: mongoose.Schema.Types.ObjectId, ref: 'user'}],
  following:[{type: mongoose.Schema.Types.ObjectId, ref: 'user'}],
  story: [{type: mongoose.Schema.Types.ObjectId, ref: 'story'}],
  chats: [{type: mongoose.Schema.Types.ObjectId, ref: 'message'}],
})

userSchema.plugin(plm);
module.exports = mongoose.model('user', userSchema);
