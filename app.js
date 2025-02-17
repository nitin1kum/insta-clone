var http = require('http');
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const expressSession = require('express-session');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const passport = require('passport');
var debug = require('debug')('insta:server');
const { Server } = require('socket.io');
const userModel = require("./routes/users");
const postModel = require("./routes/post");
const storyModel = require("./routes/story");
const commentModel = require("./routes/comment");
const messageModel = require("./routes/messages");
const notifyModel = require("./routes/notification");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

const httpServer = http.createServer(app);

// Setting port
var port = process.env.PORT || '3000';
app.set('port', port);

// Create Server
const io = new Server(httpServer);

// Socket io connection
io.on('connection', socket => {
  socket.on('message', (data) => {
    io.emit('message', data);
  });
  socket.on('followed', async (data) => {
    const user = await userModel.findById(data.userId);
    const profile = await userModel.findById(data.profileId);
    await notifyModel.updateOne({
      $and: [{ messageData: { $elemMatch: { profile: user._id } } },
      { type: data.type },]
    },
      {
        $set: {
          user: profile._id,
          type: data.type,
          date: Date.now(),
          messageData: [{ profile: user._id }]
        }
      },
      { upsert: true })
    let index = profile.following.indexOf(user._id);
    let newData = {
      profile: profile.username,
      user: user,
      alreadyFollow: index === -1 ? false : true
    }
    io.emit('followed', newData);
  });
  socket.on('commented', async (data) => {
    const user = await userModel.findById(data.user);
    const post = await postModel.findById(data.post).populate('user');
    await notifyModel.create({
      user: post.user._id,
      type: data.type,
      messageData: [
        { profile: user._id },
        { post: post._id },
        { commentMessage: data.comment }
      ]
    })
    let newData = {
      profile: user,
      post: post,
      user: post.user.username,
      comment: data.comment,
    }
    io.emit('commented', newData);
  })
  socket.on('post_like', async (data) => {
    const user = await userModel.findById(data.user);
    const post = await postModel.findById(data.post).populate('user');
    await notifyModel.updateOne({
      $and: [{ messageData: { $elemMatch: { profile: user._id } } },
      { messageData: { $elemMatch: { post: post._id } } },
      { type: data.type },]
    },
      {
        $set: {
          user: post.user._id,
          type: data.type,
          date: Date.now(),
          messageData: [
            { profile: user._id },
            { post: post._id }
          ]
        }
      },
      { upsert: true })
    let newData = {
      profile: user,
      post: post,
      user: post.user.username,
    }
    io.emit('post_like', newData);
  })
  socket.on('comment_like', async (data) => {
    const user = await userModel.findById(data.user);
    const comment = await commentModel.findById(data.comment).populate('commentUser post');
    await notifyModel.updateOne({
      $and: [
        { messageData: { $elemMatch: { profile: user._id } } },
        { messageData: { $elemMatch: { comment: comment._id } } },
        { type: data.type },
      ]
    },
      {
        $set: {
          user: comment.commentUser._id,
          type: data.type,
          date: Date.now(),
          messageData: [
            { profile: user._id },
            { comment: comment._id }
          ]
        }
      },
      { upsert: true })
    let newData = {
      profile: user,
      post: comment.post,
      comment: comment.comment,
      user: comment.commentUser.username,
    }
    io.emit('comment_like', newData);
  })
  socket.on('story_like', async (data) => {
    const user = await userModel.findById(data.user);
    const story = await storyModel.findById(data.story).populate('user');
    await notifyModel.updateOne({
      $and: [{ messageData: { $elemMatch: { profile: user._id } } },
      { messageData: { $elemMatch: { story: story._id } } },
      { type: data.type },]
    },
      {
        $set: {
          user: story.user._id,
          type: data.type,
          date: Date.now(),
          messageData: [
            { profile: user._id },
            { story: story._id }
          ]
        }
      },
      { upsert: true })
    let newData = {
      profile: user,
      media: story.status_media,
      media_type: story.media_type,
      user: story.user.username,
    }
    io.emit('story_like', newData);
  })
  socket.on('connected', (data) => {
    let newData = {
      name: data,
      activity: 'online'
    }
    io.emit('connected', newData);
  })
  socket.on('disconnected', (data) => {
    let newData = {
      name: data,
      activity: 'offline'
    }
    io.on('disconnect', () => {
      io.emit('disconnected', newData);
    })
  })
});


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(expressSession({
  resave: false,
  saveUninitialized: false,
  secret: "hey hey"
}));


app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser(usersRouter.serializeUser());
passport.deserializeUser(usersRouter.deserializeUser());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT,(()=>{
  console.log("Server is listning at http://localhost:"+ PORT);
}))


