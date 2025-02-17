var express = require('express');
var router = express.Router();
const userModel = require("./users");
const postModel = require("./post");
const storyModel = require("./story");
const commentModel = require("./comment");
const messageModel = require("./messages");
const notifyModel = require("./notification");
const passport = require('passport');
const localStrategy = require('passport-local');
const upload = require('./multer');
const uploadStory = require('./multer2');

passport.use(new localStrategy(userModel.authenticate()));


router.get('/', function (req, res) {
  let user = false;
  res.render('index', { user, footer: false });
});

router.get('/login', function (req, res) {
  let user = false;
  res.render('login', { user, footer: false });
});

router.get('/feed', isLoggedIn, async function (req, res) {
  const post = await postModel.find().populate([{ path: 'user' }, { path: 'comment', populate: { path: "commentUser" } }]);
  const story = await storyModel.find().populate('user');
  const notification = await notifyModel.find();
  story.forEach(async (elem) => {
    if (((Date.now() - elem.date) / (24 * 60 * 60 * 1000)) > 1) {
      const profile = await userModel.findOne({ _id: elem.user._id });
      profile.story.splice(profile.story.indexOf(elem._id), 1);
      profile.save();
      await storyModel.findOneAndDelete({ _id: elem._id });
    }
  })
  notification.forEach(async (elem) => {
    if (((Date.now() - elem.date) / (24 * 60 * 60 * 1000)) > 7) {
      await notifyModel.findOneAndDelete({ _id: elem._id });
    }
  })
  const user = await userModel.findOne({ username: req.session.passport.user }).populate('following');
  res.render('feed', { post, user, footer: true });
});

router.get('/profile', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate('posts savedPost story');
  res.render('profile', { user, footer: true });
});

router.get('/profile/otherUser/:username', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate('posts');
  const otherUser = await userModel.findOne({ username: req.params.username }).populate('posts');
  if (user._id === otherUser._id) {
    res.render('profile', { user, footer: true });
  }
  else {
    res.render('otherprofile', { otherUser, user, footer: true });
  }

});

router.get('/search', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user })
  res.render('search', { user, footer: true });
});

router.get('/notification', isLoggedIn, async function (req, res) {
  try {
    const user = await userModel.findOne({ username: req.session.passport.user });
    if (!user) {
      return res.status(401).json({ error: "User not found or not logged in" });
    }
    const notifications = await notifyModel.aggregate([
      {
        $match: { user: user._id }
      },
      {
        $unwind: "$messageData"
      },
      {
        $lookup: {
          from: 'users',
          localField: 'messageData.profile',
          foreignField: '_id',
          as: 'profileData'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData'
        }
      },
      {
        $lookup: {
          from: 'posts',
          localField: 'messageData.post',
          foreignField: '_id',
          as: 'postData'
        }
      },
      {
        $lookup: {
          from: 'comments',
          localField: 'messageData.comment',
          foreignField: '_id',
          as: 'commentData'
        }
      },
      {
        $lookup: {
          from: 'posts',
          localField: 'commentData.post',
          foreignField: '_id',
          as: 'commentPost'
        }
      },
      {
        $lookup: {
          from: 'stories',
          localField: 'messageData.story',
          foreignField: '_id',
          as: 'storyData'
        }
      },
      {
        $group: {
          "_id": "$_id",
          "date": { $first: "$date" },
          "type": { $first: "$type" },
          "commentPost": { $last: "$commentPost" },
          "user": { $first: "$userData" },
          "comment": { $last: "$messageData.commentMessage" },
          "messageData": { $push: { "profileData": "$profileData", "commentData": "$commentData", "storyData": "$storyData", "postData": "$postData" } },
        }
      },
      {
        $sort: { date: -1 }
      }
    ]);
    res.render('notification', { user, notifications, footer: true });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get('/edit', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render('edit', { user, footer: true });
});

router.get('/messenger', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const senders = await messageModel.aggregate([
    {
      $match: {
        "user": user._id
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "sender"
      }
    },
    { $unwind: '$messages' },
    {
      $group: {
        "_id": "$_id",
        "user": { "$first": "$sender" },
        "date": { "$max": "$messages.date" },
        "messages": { "$push": "$messages" },
      }
    },
    {
      $sort: {
        "date": 1
      }
    }
  ]);
  res.render('messenger', { user, senders, footer: true });
});

router.get('/send/message/:id', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const sender = await userModel.findOne({ _id: req.params.id });
  let messages = await messageModel.findOne({ user: { $all: [user._id, sender._id] } });
  res.render('chatBox', { user, sender, messages, footer: false });
});

router.post('/send/message', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const sender = await userModel.findOne({ _id: req.body.senderid });
  const chat = await messageModel.findOne({ user: { $all: [user._id, sender._id] } });
  if (!chat) {
    const message = await messageModel.create({
      user: [user._id, sender._id],
    })
    user.chats.push(message._id);
    sender.chats.push(message._id);
    await user.save();
    await sender.save();
    if (req.body.type === "SEND") {
      message.messages.push({
        sender: user._id,
        message: req.body.message
      });
    }
    else if (req.body.type === "GET") {
      message.messages.push({
        sender: sender._id,
        message: req.body.message
      });
    }
    await message.save();
  }
  else {
    if (req.body.type === "SEND") {
      chat.messages.push({
        sender: user._id,
        message: req.body.message
      });
    }
    else if (req.body.type === "GET") {
      chat.messages.push({
        sender: sender._id,
        message: req.body.message
      });
    }
    await chat.save();
  }
  res.json("ok");
});

router.get('/story/view/:id', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const story = await storyModel.findById(req.params.id);
  if (story.status_view.indexOf(user._id) === -1) {
    story.status_view.push(user._id);
  }
  await story.save();
});

router.get('/like/story/:id', isLoggedIn, async function (req, res) {
  try {
    const story = await storyModel.findOne({ _id: req.query.story });

    if (!story) {
      return res.status(404).json({ error: "Story not found" });
    }

    const user = await userModel.findOne({ username: req.session.passport.user });
    if (!user) {
      return res.status(401).json({ error: "User not found or not logged in" });
    }

    if (story.status_likes.indexOf(user._id) === -1) {
      story.status_likes.push(user._id);
      await story.save();
      return res.json('liked');
    } else {
      story.status_likes.splice(story.status_likes.indexOf(user._id), 1);
      await story.save();
      return res.json('like removed');
    }
  } catch (error) {
    console.error("Error liking story:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get('/list/:data', isLoggedIn, async function (req, res) {
  const title = req.query.title;
  const id = req.query.id;
  let list = [];
  const user = await userModel.findOne({ username: req.session.passport.user });
  if (title === "follower") {
    let profile = await userModel.findOne({ _id: id }).populate("follower");
    list = profile.follower;
  }
  if (title === "following") {
    let profile = await userModel.findOne({ _id: id }).populate("following");
    list = profile.following;
  }
  if (title === "post_likes") {
    let post = await postModel.findOne({ _id: id }).populate("likes");
    list = post.likes;
  }
  if (title === "comment_likes") {
    let comment = await commentModel.findOne({ _id: id }).populate("likes");
    list = comment.likes;
  }
  if (title === "story_likes") {
    let story = await storyModel.findOne({ _id: id }).populate("status_likes");
    list = story.status_likes;
  }
  if (title === "views") {
    let story = await storyModel.findOne({ _id: id }).populate("status_view");
    list = story.status_view;
  }
  res.render('list', { user, list, title, footer: true });
});

router.get('/follow/:id', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const otherUser = await userModel.findOne({ _id: req.params.id });
  // check if already follow
  if (otherUser.follower.indexOf(user._id) === -1) {
    user.following.push(otherUser._id);
    otherUser.follower.push(user._id);
  }
  else {
    user.following.splice(user.following.indexOf(otherUser._id), 1);
    otherUser.follower.splice(otherUser.follower.indexOf(user._id), 1);
  }
  // saving data
  user.save();
  otherUser.save();
  res.json({
    follow: otherUser.follower.indexOf(user._id),
    following: otherUser.following.length,
    follower: otherUser.follower.length,
    follow_back: user.follower.indexOf(otherUser._id),
  })
});

router.get('/upload', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user })
  res.render('upload', { user, footer: true });
});

router.get('/comment/:data', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const post = await postModel.findById(req.params.data);
  const comment = await commentModel.find({ post: post._id }).populate('post commentUser');
  res.render('comment', { user, comment, post, footer: true });
});

router.get('/username/:username', isLoggedIn, async function (req, res) {
  const regex = new RegExp(`${req.params.username}`, 'i');
  const user = await userModel.find({ username: regex });
  if (user.findIndex(x => x.username === req.session.passport.user) >= 0) {
    user.splice(user.findIndex(x => x.username === req.session.passport.user), 1);
  }
  res.json(user);
});

router.get('/chat/user/:username', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const regex = new RegExp(`${req.params.username}`, 'i');
  const senders = await messageModel.aggregate([
    {
      $match: {
        "user": user._id
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "sender"
      }
    },
    { $unwind: '$messages' },
    {
      $group: {
        "_id": "$_id",
        "user": { "$first": "$sender" },
        "date": { "$max": "$messages.date" },
        "messages": { "$push": "$messages" },
      }
    },
    {
      $match: {
        "user.username": regex
      }
    },
    {
      $sort: {
        "date": 1
      }
    }
  ]);
  res.json(senders);
});

router.get('/post/show/:data', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate('posts');
  const userData = await userModel.findOne({ _id: req.query.user });
  const post = await postModel.findOne({ _id: req.query.post });
  res.render('post', { user, userData, post, footer: true });
});

router.post("/register", function (req, res, next) {
  const userData = new userModel({
    username: req.body.username,
    email: req.body.email,
    name: req.body.name,
  });
  userModel.register(userData, req.body.password)
    .then(function (registerdUser) {
      passport.authenticate('local')(req, res, function () {
        res.redirect('/profile');
      });
    })
});

router.post('/login', passport.authenticate('local', {
  successRedirect: '/feed',
  failureRedirect: '/login'
}), function (req, res) {
  res.render('upload', { footer: true });
});

router.get('/story/:id', isLoggedIn, async function (req, res) {
  try {
    const requestedUserId = req.params.id;
    if (requestedUserId === "-1") return res.redirect("/feed");
    const user = await userModel.findOne({ username: req.session.passport.user });

    if (!user) {
      return res.render("/login");
    }

    // Convert ObjectIds to strings for comparison
    const userId = user._id.toString();
    const followingIds = user.following.map(id => id.toString());

    // Check if the requested ID is the user's own ID or belongs to someone they follow
    if (requestedUserId === userId || followingIds.includes(requestedUserId)) {
      const stories = await storyModel.find({ user: requestedUserId }).populate("user");
      let nextId = -1;
      let prevId = -1;

      if (requestedUserId === userId && followingIds.length > 0) {
        nextId = followingIds[0];
      }
      else if (followingIds.includes(requestedUserId)) {
        const idx = followingIds.indexOf(requestedUserId);
        if (idx + 1 < followingIds.length) nextId = followingIds[idx + 1];
        if (idx - 1 >= 0) prevId = followingIds[idx - 1];
        else if (idx - 1 == -1) prevId = userId;
      }
      if (stories.length === 0) return res.redirect("/feed");
      return res.render('story', { user, stories, nextId, prevId, footer: false });
    } else {
      return res.redirect('/feed');
    }
  } catch (error) {
    console.error("Error fetching stories:", error);
    return res.redirect("/feed");
  }
});

router.get('/upload/story', isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render('addStory', { user, footer: false });
});

router.post('/upload/story/:type', isLoggedIn, uploadStory.single('story-image'), async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const story = await storyModel.create({
    status_media: req.file.filename,
    status_caption: req.body.story_caption,
    user: user._id,
    media_type: req.params.type
  })
  user.story.push(story._id);
  await user.save();
  res.redirect('/feed')
});

router.get('/logout', function (req, res, next) {
  req.logout(function (err) {
    if (err) { return next(err); }
    else { res.redirect('/login'); }
  });
});

router.get('/delete/:id', isLoggedIn, async function (req, res, next) {
  await postModel.findOneAndDelete({ _id: req.params.id });
  res.redirect('/profile');
});

router.get('/like/post/:imf', isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const post = await postModel.findOne({ _id: req.query.post });

  // If already liked the post then remove user like else add the like

  if (post.likes.indexOf(user._id) === -1) {
    post.likes.push(user._id);
  }
  else {
    post.likes.splice(post.likes.indexOf(user._id), 1);
  }
  await post.save();
  res.json({
    likes: post.likes.length,
    liked: post.likes.indexOf(user._id)
  });


});

router.get('/like/comment/:imf', isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const comment = await commentModel.findOne({ _id: req.params.imf });

  // If already liked the comment then remove user like else add the like

  if (comment.likes.indexOf(user._id) === -1) {
    comment.likes.push(user._id);
  }
  else {
    comment.likes.splice(comment.likes.indexOf(user._id), 1);
  }
  await comment.save();
  res.json({
    likes: comment.likes.length,
    liked: comment.likes.indexOf(user._id)
  });


});

router.get('/save/post/:imf', isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const post = await postModel.findOne({ _id: req.query.post });

  // If already liked the post then remove user like else add the like

  if (user.savedPost.indexOf(post._id) === -1) {
    user.savedPost.push(post._id);
  }
  else {
    user.savedPost.splice(user.savedPost.indexOf(post._id), 1);
  }
  await user.save();
  res.json({
    saved: user.savedPost.indexOf(post._id)
  });


});

router.post('/update', isLoggedIn, upload.single('dp'), async function (req, res, next) {
  const user = await userModel.findOneAndUpdate({ username: req.session.passport.user },
    { username: req.body.username, name: req.body.name, bio: req.body.bio },
    { new: true });
  if (req.file) {
    user.profileImage = req.file.filename;
    await user.save();
  }

  res.redirect('/profile');
});

router.post('/comment/post/:id', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const post = await postModel.findOne({ _id: req.params.id });
  const comment = await commentModel.create({
    commentUser: user._id,
    post: post._id,
    comment: req.body.comment
  })
  post.comment.push(comment._id);
  post.save();
  res.status(200).send(comment);
});

router.post('/upload/:type', isLoggedIn, upload.single('image'), async function (req, res, next) {
  let post;
  const user = await userModel.findOne({ username: req.session.passport.user });
  if (req.params.type === 'video') {
    post = await postModel.create({
      image: req.file.filename,
      caption: req.body.caption,
      user: user._id,
      type: req.params.type
    });
  }
  else {
    post = await postModel.create({
      image: req.file.filename,
      caption: req.body.caption,
      user: user._id,
      type: req.params.type
    });
  }

  user.posts.push(post._id);
  await user.save();
  res.redirect('/profile');
});

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  else {
    res.redirect('/login');
  }
}

module.exports = router;
