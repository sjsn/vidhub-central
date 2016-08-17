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
// For logging objects for debug
var util = require("util");

/*****************
* Authentication *
*****************/

// POST a login attempt
router.post("/api/login", passport.authenticate("login", 
	{failureRedirect: "/api/login",
	failureFlash: true}),
	function(req, res) {
		console.log("Successfully logged in: " + req.user.username);
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
			user.firstName = req.query.fName;
			user.lastName = req.query.lName;
			// Encrypts the password for safety
			user.setPassword(req.query.password);
			user.save(function(err) {
				if (err) {
					res.status(400).json({
						msg: err
					});
				}
			});
			res.user = user;
			res.status(200);
		}
	});s

});

// POST usernames for the users service
router.post("/api/users/addusername", function(req, res) {
	if (req.session.passport.user) {
		User.findOne({_id: req.session.passport.user}, function(err, user) {
			// Error handling
			if (err) {
				console.log("Error adding username" + err);
				res.status(400).json(err);
			}
			if (!user) {
				console.log("No user matches session.");
				res.status(401).json({
					msg: "No user matches session"
				});
			}
			console.log("Adding username: " + req.query.username);
			if (!req.query.service) {
				res.status(422).json({
					msg: "Missing required parameters"
				})
			}
			if (req.query.service.toLowerCase() == "youtube") {
				user.youtubeUsername = req.query.username;
				user.save();
			} else if (req.query.service.toLowerCase() == "twitch") {
				user.twitchUsername = req.query.username;
				user.save();
			}
			res.user = user;
			res.status(200);
		});
	} else {
		res.status(401).json({msg: "Not signed in"});
	}
});

// GET a logout
router.get("/api/logout", function(req, res) {
	console.log("Logging out.");
	req.logout();
	req.session.destroy();
	console.log(req.session);
	res.status(200);
});

// Recursive helper function to get the current subs and their acitvities of the user
function getYTSubsRecursive(pageToken, currentChannels, size, index, callback) {
	YouTube.subscriptions.list({
		part: "snippet",
		mine: true,
		maxResults: 50,
		order: "alphabetical",
		pageToken: pageToken
	}, function(err, data) {
		if (err) {
			return console.log("Error: " + err);
		}
		if (data) {
			size += data.items.length;
			var ready = false;
			var nextPage = data.nextPageToken;
			if (!nextPage) {
				size = size % 50;
			}
			var channels = data.items;
			channels.forEach(function(channel) {
				var newChannel = new Channel();
				channel = channel.snippet;
				newChannel.name = channel.title;
				newChannel.channelID = channel.resourceId.channelId;
				newChannel.type = "YouTube";
				getYTActivitiesRecursive(newChannel, 0, 0, function(channel) {
					index++;
					console.log("index: " + index);
					newChannel = channel;
					currentChannels.push(newChannel);
					if (index == size && !nextPage) {
						callback(currentChannels);
					}
				});
			});
			if (nextPage) {
				getYTSubsRecursive(nextPage, currentChannels, size, 0, callback);
			}
		} else {
			callback(null);
		}
	});
}

// Recursive helper function to get the recent activities of the users subs
function getYTActivitiesRecursive(channel, stackSize, index, callback) {
	// Sets the date of activity retrieval to one week ago to only display relevent information
	var beforeDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
	beforeDate = beforeDate.toISOString();
	var id = channel.channelID;
	YouTube.activities.list({
		part: "snippet",
		channelId: id,
		publishedAfter: beforeDate
	}, function(err, data) {
		if (err) {
			console.log("Error: " + err);
		}
		if (data) {
			stackSize = data.items.length;
			var activities = data.items;
			activities.forEach(function(activity) {
				var newAct = new Activity();
				activity = activity.snippet;
				newAct.name = activity.title;
				newAct.date = activity.publishedAt;
				newAct.channel = channel;
				newAct.save();
				channel.activities.push(newAct);
				index++;
			});
		}
		if (stackSize == index) {
			callback(channel);
		}
	});
}

// Helper function to save the channels and update the user in the db
function saveChannels(channels, user) {
	for (var i = 0; i < channels.length; i++) {
		channels[i].user = user;
		channels[i].save(function(err, channel) {
			if (err) {
				console.log(err);
			}
		});
		user.channels.push(channels[i]);
	}
	user.save();
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
		// Call any Youtube API endpoint with 'YouTube.<method>'
		YouTube.authenticate({
			type: "oauth",
			token: req.user.youtubeAccessToken
		});
		var channels = [];
		// Gets all channels that the user is subscribed to
		getYTSubsRecursive(null, [], 0, 0, function(userChannels) {
			channels = userChannels;
			console.log("Last Channels (Needs to be below 'M' to pass): " + channels[channels.length - 1]);
			var user = req.user;
			// Adds all channels to the database
			if (channels) {
				user = saveChannels(channels, user);
			}
			console.log("User: " + user);
			res.user = user;
			res.status(200);
		});
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
		console.log("Gathering Twitch information")
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
router.get("/api/channels", function(req, res) {
	if (req.session.passport) {
		User.findOne({_id: req.session.passport.user}, function(err, user) {
			Channel.find({user: user._id}, function(err, channels) {
				res.channels = channels;
				res.status(200).json({channels: channels});
			});
		});
	} else {
		res.status(401).json({msg: Unauthorized});
	}
});

// Middleware to get the current channel given a channel id
router.param("channelID", function(req, res, next, id) {
	Channel.findOne({_id: id}, function(err, channel) {
		res.channel = channel;
		return next();
	});
});

// GET a list of a channels activities
router.get("/api/channels/:channelID/activities", function(req, res) {
	Activity.find({channel: res.channel._id}, function(err, activities) {
		if (err) {
			console.log(err);
		}
		res.activities = activities;
		res.status(200).json({activities: activities});
	});
});

// GET a list of ALL recent activity
router.get("/api/activities", function(req, res) {
	// Recursively get all channel activity
});

module.exports = router;
