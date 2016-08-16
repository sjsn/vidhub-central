var express = require('express');
var router = express.Router();// Import passport for authentication
var passport = require("passport");
// Import mongoose and models for DB interaction
var mongoose = require("mongoose");
var User = mongoose.model("User");
var Channel = mongoose.model("Channel");
var Tag = mongoose.model("Tag");
var Activity = mongoose.model("Activity");
var secret = require("../api_config/secret");
// External API configuration
var TwitchAPI = require("twitch-api");
var YouTube = require("youtube-api");

/*****************
* Authentication *
*****************/

// POST a login attempt
router.post("/api/login", passport.authenticate("login", 
	{failureRedirect: "/api/login",
	failureFlash: true}),
	function(req, res) {
		console.log("Successfully logged in: " + req.user);
		if (req.error) {
			res.status(400).json({
				msg: req.error
			});
		}
		res.user = req.user;
		res.status(200).json(req.user);
	}
);

// GET a user if they are logged in based on session
router.get("/api/login", function(req, res) {
	if (req.session.passport) {
		User.findOne({_id: req.session.passport.user}, function(err, user) {
			if (err) {
				res.status(400).json({
					msg: err
				});
			}
			if (!user) {
				res.status(200);
			}
			if (user) {
				res.user = user;
				res.status(200).json(user);
			}
		});
	} else {
		console.log("No user");
		res.status(200).json({msg: "Not signed in"});
	}
});

// POST a new user account
router.post("/api/users/", function(req, res) {
	User.findOne({username: req.query.username}, function(err, user) {
		//	If any errors are present
		if (err) {
			console.log("Error signing up: " + err);
			res.status(400).json(err);
		}
		// If the user already exists
		if (user) {
			console.log("User already exists");
			res.status(401).json({
				msg: "User already exists"
			});
		// If everything is ok and user can be created
		} else {
			console.log("Registering user: " + req.query.username);
			var user = new User();
			user.username = req.query.username;
			if (req.query.name) {
				user.name = req.query.name;
			} else {
				user.name = "";
			}
			// Encrypts the password for safety
			user.setPassword(req.query.password);
			user.save(function(err) {
				if (err) {
					res.status(400).json({
						msg: err
					});
				}
				res.user = user;
			});
		}
	});s

});

// GET a logout
router.get("/api/logout", function(req, res) {
	console.log("Logging out.");
	req.logout();
	req.session.destroy();
	console.log(req.session);
	res.status(200);
});

// Helper function to get the list of all the channels the user is subscribed to
function getYTSubs(profile) {
	var channels = [];
	// An array of the users subscriptions as subscription opbjects
	var channelItems = profile.subscriptions.list({
		part: "snippet"
	}).items;
	for(var i = 0; i < channelItems.length; i++) {
		var curChannel = channelItems[i].snippet;
		var channel = new Channel();
		channel.name = curChannel.channelTitle;
		channel.channelID = curChannel.channelId;
		channel.type = "Youtube";
		// May ommit subscriber count if it's too difficult to get
		// channel.subscribers = curChannel;
		channels.push(channel);
	}
	// Add the activities of the users subscriptions to the relevent channels
	channels = getYTActs(profile, channels);
	return channels;
};

// Helper function to get the list of all the activty the users' subscritions are doing
function getYTActs(profile, channels) {
	// Gets the last 100 activities
	var actItems = profile.activities.list({
		part: "snippet",
		maxResults: ""
	}).items;
	for (var i = 0; i < actItems.length; i++) {
		var curActivity = actItems[i].snippet;
		var activity = new Activity();
		activity.name = curActivity.description;
		activity.date = curActivity.publishedAt;
		// Slow way of doing this. Look into less complexity
		for (var j = 0; j < channels.length; j++) {
			if (channels[j].name == curActivity.channelTitle) {
				activity.channel = channels[j];
				channels[j].acitivities.push(activity);
			}
		}
		activity.save(function(err) {
			if (err) {
				console.log(err);
			}
		})
	}
	return channels;
}

// Helper function to save the channels and update the user in the db
function saveChannels(channels, user) {
	for (var i = 0; i < channels.length; i++) {
		channel[i].user = req.user;
		channel[i].save(function(err, channel) {
			if (err) {
				console.log(err);
			}
			user.channels.push(channel);
		});
	}
	return user;
}

// GET the youtube authorization information and relevent channel data
router.get("/api/auth/youtube", passport.authenticate("youtube"), 
	function(req, res) {
		if (req.error) {
			console.log(req.error);
			res.status(400);
		}
		// Establishes a connection with YouTube's API
		// Call any Youtube API with 'YouTube.<method>'
		YouTube.authenticate({
			type: "oauth",
			token: req.user.youtubeAccessToken
		});
		// Gets all channels that the user is subscribed to
		var channels = getYTSubs(YouTube);
		var user = req.user;
		// Adds all channels to the database
		if (channels.length) {
			user = saveChannels(channels, user);
		}
		res.user = user;
		return res.user;
	}
);

// Helper function to get all of the users' twitch follows
function getTWChannels(Twitch, twitchAccess, user) {
	// Gets an array of all channel objects the user is following (maximum is 100)
	var channels = Twitch.getUserFollowedChannels(user.twitchUsername, {limit: 100}).follows;
	for (var i = 0; i < channels.length; i++) {
		var curChannel = chnannels[i];
		var channel = new Channel();
		channel.name = curChannel.display_name;
		channel.channelID = curChannel._id;
		channel.subscribers = curChannel.followers;
		channel.type = "Twitch";
		channels.push(channel);
	}
	channels = getTWActs(Twitch, twitchAccess, channels);
	return channels;
}

// Helper function to get the activity of all of ther users' twitch follwows
function getTWActs(Twitch, twitchAccess, channels) {
	// Gets an array of all stream activity of the users follows (maximum is 100)
	var streams = Twitch.getAuthenticatedUserFollowedStreams(twitchAccess, {limit: 100}).streams;
	var videos = Twitch.getAuthenticatedUserFollowedVideos(twitchAccess, {limit: 100}).videos;
	// Add stream activities
	for (var i = 0; i < streams.length; i++) {
		var stream = streams[i];
		var activity = new Activity();
		activity.name = "Streaming " + stream.game;
		activity.date = stream.created_at;
		// Slow way. Look into less complex way of doing this
		for (var j = 0; j < channels.length; j++) {
			if (channels[j].name == activity.channel.display_name) {
				activity.channel = channels[j];
				channels[j].activities.push(activity);
			}
		}
		activity.save(function(err) {
			if (err) {
				console.log(err);
			}
		});
	}
	// Add video activities
	for (i = 0; i < videos.length; i++) {
		var video = videos[i];
		var activity = new Activity();
		activity.name = "Posted a video: " + video.title;
		activity.date = video.recorded_at;
		// Slow way. Look into less complex way of doing this
		for (var j = 0; j < channels.length; j++) {
			if (channels[j].name == activity.channel.display_name) {
				activity.channel = channels[j];
				channels[j].activities.push(activity);
			}
		}
		activity.save(function(err) {
			if (err) {
				console.log(err);
			}
		});
	}
	return channels;
}

// GET the Twitch authorization information and relevent channel data
router.get("/api/auth/twitch", passport.authenticate("twitch"), 
	function(req, res) {
		if (req.error) {
			console.log(req.error);
			res.status(400);
		}
		// Establishes a connection with Twitch's API
		// Call Twitch API with Twitch.<method>, using twitchAccess 
		// as a param for meothods requring auth
		var Twitch = new TwitchAPI({
			clientId: secret.twitch.ID,
			clientSecret: secret.twitch.secret,
			// Just for testing. Change when live
			redirectUri: "http://localhost:8080//api/auth/twitch"
		});
		var twitchAccess = req.user.twitchAccessToken;
		var user = req.user;
		var channels = getTWChannels(Twitch, twitchAccess, user);
		if (channels.length) {
			if (channels.length) {
				user = saveChannels(channels, user);
			}
		}
		res.user = user;
	}
);

/*******************
* User Information *
*******************/


/***********
* Channels *
***********/

// GET a list of the profiles channels

module.exports = router;
