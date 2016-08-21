var express = require('express');
var router = express.Router();// Import passport for authentication
var passport = require("passport");
// Import mongoose and models for DB interaction
var mongoose = require("mongoose");
var User = mongoose.model("User");
var Channel = mongoose.model("Channel");
var Tags = mongoose.model("Tag");
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

// Authenticatoin middleware to ensure a user is logged in before viewing routes
function isAuthenticated(req, res, next) {
	if (req.session.passport) {
		return next();
	} else {
		res.status(401).json("401 Error. Unauthorized. Please log in to continue");
	}
}

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
		res.status(200).json(req.user);
	}
);

// GET a user if they are logged in based on session
router.get("/api/login", function(req, res) {
	if (req.session.passport) {
		User.findOne({_id: req.session.passport.user}, function(err, user, message) {
			if (message) {
				console.log(message);
			}
			if (err) {
				res.status(400).json({
					msg: err
				});
			}
			if (!user) {
				res.status(200);
			}
			if (user) {
				res.status(200).json(user);
			}
		});
	} else {
		console.log("No user");
		res.status(200).json({msg: "Not signed in"});
	}
});

// Middleware function to get the current user given a user ID
router.param("userID", function(req, res, next, id) {
	User.findOne({_id: id}, function(err, user) {
		if (err) {
			console.log(err);
		} else if (user) {
			res.user = user;
			return next();	
		} else {
			console.log("No user found");
		}
		
	});
});

// POST a new user account
router.post("/api/users/", function(req, res) {
	User.findOne({username: req.body.username}, function(err, user) {
		//	If any errors are present
		if (err) {
			console.log("Error signing up: " + err);
			res.status(400).json(err);
		}
		// If the user already exists
		if (user) {
			console.log("User already exists");
			res.status(400).json({
				msg: "User already exists"
			});
		// If everything is ok and user can be created
		} else {
			console.log("Registering user: " + req.body.username);
			var user = new User();
			user.username = req.body.username;
			user.firstName = req.body.fName;
			user.lastName = req.body.lName;
			// Encrypts the password for safety
			user.setPassword(req.body.password);
			user.save(function(err) {
				if (err) {
					console.log(err);
				}
				res.status(201).json(user);
			});
		}
	});
});

// POST usernames for the users service
router.post("/api/users/:userID/addusername", isAuthenticated, function(req, res) {
	if (req.session.passport.user) {
		var user = res.user;
		if (!user) {
			console.log("No user matches session.");
			res.status(401).json({
				msg: "No user matches session"
			});
		}
		console.log("Adding username: " + req.body.username);
		if (!req.body.service) {
			res.status(422).json({
				msg: "Missing required parameters"
			})
		}
		if (req.body.service.toLowerCase() == "youtube") {
			user.youtubeUsername = req.body.username;
			user.save();
		} else if (req.body.service.toLowerCase() == "twitch") {
			user.twitchUsername = req.body.username;
			user.save();
		}
		res.status(201).json(user);
	} else {
		res.status(401).json({msg: "Not signed in"});
	}
});

// GET a logout request
router.get("/api/logout", function(req, res) {
	console.log("Logging out.");
	req.logout();
	req.session.destroy();
	res.status(200);
});

// Recursive helper function to get the current subs and their acitvities of the user
function getYTSubsRecursive(pageToken, currentChannels, size, index, user, callback) {
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
				getYTActivitiesRecursive(newChannel, 0, 0, user, function(channel) {
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
				getYTSubsRecursive(nextPage, currentChannels, size, 0, user, callback);
			}
		} else {
			callback(null);
		}
	});
}

// Recursive helper function to get the recent activities of the users subs
// Needs to be recursive due to YouTube's API happening in 50 result increments & promises
function getYTActivitiesRecursive(channel, stackSize, index, user, callback) {
	// Sets the date of activity retrieval to one week ago to only display relevent information
	var beforeDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
	beforeDate = beforeDate.toISOString();
	var id = channel.channelID;
	YouTube.activities.list({
		part: "snippet",
		channelId: id,
		maxResults: 50,
		publishedAfter: beforeDate
	}, function(err, data) {
		if (err) {
			console.log("Error: " + err);
		}
		if (data) {
			stackSize = data.items.length;
			var activities = data.items;
			activities.forEach(function(activity) {
				activity = activity.snippet;
				var newAct = new Activity();
				newAct.name = activity.title;
				newAct.user = user;
				newAct.date = activity.publishedAt;
				newAct.channelName = channel.name;
				newAct.channelID = channel._id;
				// Sets the expiration date of the activitiy to one week from when it was created
				var expDate = new Date(activity.publishedAt);
				expDate = expDate.getTime() + 1000 * 60 * 60 * 24 * 7;
				expDate = new Date(expDate);
				newAct.expireAt = expDate;
				newAct.save();
				channel.activities.push(newAct);	
				index++;
			});
		}
		if (stackSize <= index) {
			callback(channel);
		}
	});
}

// Helper function to save the channels and update the user in the db
// Needs to be recursive due to YouTube's API happening in 50 result increments & promises
function saveChannels(channels, user, done) {
	for (var i = 0; i < channels.length; i++) {
		channels[i].user = user;
		channels[i].save(function(err, channel) {
			if (err) {
				console.log(err);
			}
		});
		user.channels.push(channels[i]);
	}
	user.save(function(err, user) {
		if (err) {
			console.log(err);
		}
		done(user);
	});
}

// GET the youtube authorization information and relevent channel data
router.get("/api/auth/youtube", isAuthenticated, passport.authenticate("youtube"),
	function(req, res) {
		// Establishes a connection with YouTube's API
		// Call any Youtube API endpoint with 'YouTube.<method>'
		YouTube.authenticate({
			type: "oauth",
			token: req.user.youtubeAccessToken
		});
		var channels = [];
		// Gets all channels that the user is subscribed to
		getYTSubsRecursive(null, [], 0, 0, req.session.passport.user, function(userChannels) {
			// Adds all channels to the database
			if (userChannels) {
				saveChannels(userChannels, req.user, function(user) {
					res.redirect("/#/feed");
				});
			}
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
router.get("/api/auth/twitch", isAuthenticated, passport.authenticate("twitch"),
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

/***********
* Channels *
***********/

// GET a refresh of all information (May take a little while... Lots of promises)
router.get("/api/refresh", isAuthenticated, function(req, res) {
	var user = req.session.passport.user;
	// Deletes all the users current channels
	User.update({_id: user}, {$set: {channels: []}}, 
		function(err, user) {
			if (err) {
				console.log(err);
			}
			// Deletes the current added channels (also removes favorites/tags)

			// Deltes any current activities
			
			// Establishes a connection with YouTube's API
			// Call any Youtube API endpoint with 'YouTube.<method>'
			var ytKey = user.youtubeAccessToken;
			YouTube.authenticate({
				type: "oauth",
				token: req.user.youtubeAccessToken
			});
			var channels = [];
			// Gets all channels that the user is subscribed to
			getYTSubsRecursive(null, [], 0, 0, req.session.passport.user, function(userChannels) {
				// Adds all channels to the database
				if (userChannels) {
					saveChannels(userChannels, req.user, function(user) {
						res.status(201).json(user);
					});
				}
		});
	});
});

// Helper function to recursively get all of the tag names 
function getTagsRecursive(channels, stackSize, index, processed, user, callback) {
	if (stackSize >= index) {
		var temp = channels[index];
		var channel = {_id: temp.id, name: temp.name, favorite: temp.favorite,type: temp.type, tags: [], activities: temp.activities};
		Tags.find({channels: channel._id, user: user}, function(err, tags) {
			if (err) {
				console.log(err);
			}
			for (var i = 0; i < tags.length; i++) {
				tags[i] = tags[i].name;
			}
			// Changes the objectid's to tagnames
			channel.tags = tags;
			processed.push(channel);
			if (stackSize == index) {
				callback(processed);
			}
			getTagsRecursive(channels, stackSize, index + 1, processed, user, callback);
		});
	}
}

// Helper function to recursively get all of the activities
function getActivitiesRecursive(channels, stackSize, index, processed, user, callback) {
	if (stackSize >= index) {
		channel = channels[index];
		Activity.find({channelID: channel._id, user: user}, function(err, activities) {
			if (err) {
				console.log(err);
			}
			// Chanes the activity objectid's to activity names
			channel.activities = activities;
			processed.push(channel);
			if (stackSize == index) {
				callback(processed);
			}
			getActivitiesRecursive(channels, stackSize, index + 1, processed, user, callback);
		});
	}
};

// Middleware to get the current channel given a channel id
router.param("channelID", function(req, res, next, id) {
	Channel.findOne({_id: id, user: req.session.passport.user}, function(err, channel) {
		if (err) {
			console.log(err);
		}
		res.channel = channel;
		return next();
	});
});

// GET a list of the profiles channels
router.get("/api/channels", isAuthenticated, function(req, res) {
	var user = req.session.passport.user;
	Channel.find({user: user}, function(err, channels) {
		if (channels.length) {
			// Changes the tag objectid's to tag names			
			getTagsRecursive(channels, channels.length - 1, 0, [], user, function(processed) {
				// Changes the activities objectid's to activity names
				getActivitiesRecursive(processed, processed.length - 1, 0, [], user, function(results) {
					res.status(200).json({channels: results});
				});
			});
		} else {
			res.status(200).json({channels: []});
		}
	});
});

// GET all of the specific details about a specific channel
router.get("/api/channels/:channelID", isAuthenticated, function(req, res) {
	var user = req.session.passport.user;
	Channel.findOne({_id: res.channel._id, user: user}, function(err, channel) {
		// Changes the tag objectid's to tag names
		getTagsRecursive([channel], 0, 0, [], user, function(processed) {
			// Changes the activities objectid's to activity names
			getActivitiesRecursive([processed[0]], 0, 0, [], user, function(results) {
				res.status(200).json({channel: results[0]})
			});
		});
	});
});

// POST a favorite update
router.post("/api/channels/:channelID/favorite", isAuthenticated, function(req, res) {
	res.channel.updateFavorite(function(err, channel) {
		if (err) {
			console.log(err);
		}
		res.status(201).json(channel);
	}); 
});

/*************
* Activities *
*************/

// GET a list of ALL recent activity
router.get("/api/activities", isAuthenticated, function(req, res) {
	Activity.find({user: req.session.passport.user}).then(function(activities) {
		if (activities) {
			res.status(200).json({activities: activities});
		} else {
			res.status(200).json({activities: []});
		}
	});
});

/*******
* Tags *
*******/

// Helper function to get all of the channels associated with the tags
function getChannelsRecursive(tags, stackSize, index, processed, user, callback) {
	if (stackSize >= index) {
		tag = tags[index];
		Channel.find({tags: tag._id, user: user}, function(err, channels) {
			if (err) {
				console.log(err);
			}
			// Changes the channels activities to the activitiy names
			getActivitiesRecursive(channels, channels.length - 1, 0, [], user, function(results) {
				tag.channels = results;
				processed.push(tag);
				if (stackSize == index) {
					callback(processed);
				} else {
					getChannelsRecursive(tags, stackSize, index + 1, processed, user, callback);
				}
			});
		});
	}
}

// Middleware to get the tag given the tagID
router.param("tagID", function(req, res, next, id) {
	Tags.findOne({_id: id, user: req.session.passport.user}, function(err, tag) {
		res.tag = tag;
		return next();
	});
});

// GET a list of all channel tags
router.get("/api/tags", isAuthenticated, function(req, res) {
	var user = req.session.passport.user;
	Tags.find({user: user}).then(function(tags) {
		if (tags.length) {
			getChannelsRecursive(tags, tags.length - 1, 0, [], user, function(processed) {
				tags = processed;
				res.status(200).json({tags: tags});
			});
		} else {
			res.status(200).json({tags: []});
		}
	});
});

// POST a new tag
router.post("/api/tags", isAuthenticated, function(req, res) {
	var user = req.session.passport.user;
	Tags.findOne({name: req.body.tag, user: user}, function(err, tag) {
		if (err) {
			console.log(err);
		}
		// If tag exists
		if (tag) {
			console.log(req.body.channel);
			Channel.findOne({tags: tag._id, user: user, _id: req.body.channel._id}, function(err, channel) {
				if (err) {
					console.log(err);
				}
				if (channel) {
					console.log(channel);
					res.status(200).json({error: "Tag already exists"});
				} else {
					// If tag existed already
					channel = req.body.channel;
					Channel.findOne({_id: channel._id, user: user}, function(err, newChannel) {
						if (err) {
							console.log(err);
						}
						tag.channels.push(newChannel);
						newChannel.tags.push(tag);
						tag.save(function(err, tag) {
							if (err) {
								console.log(err);
							}
							newChannel.save(function(err, channel) {
								if (err) {
									console.log(err);
								}
								res.status(201).json("Tag added successfully");
							});
						});
					});
				}
			});
		} else {
			// If tag is brand new, create it
			var tag = new Tags();
			tag.name = req.body.tag;
			tag.user = req.session.passport.user;
			tag.channels.push(req.body.channel);
			Channel.findOne({_id: req.body.channel._id, user: user}, function(err, channel) {
				if (err) {
					console.log(err);
				}
				channel.tags.push(tag);
				tag.save(function(err, tag) {
					if (err) {
						console.log(err);
					}
					channel.save(function(err, channel) {
						if (err) {
							console.log(err);
						}
						res.status(201).json("Tag created successfully");
					})
				});
			});
		}
	});
});

// DELETE a given tag
router.delete("/api/tags/:tagID", isAuthenticated, function(req, res) {
	var tag = res.tag;
	var channel = req.body.channel;
	Channel.findOne({_id: channel._id}, function(err, channel) {
		if (err) {
			console.log(err);
		}
		tag.channels.remove(channel);
		channel.tags.remove(tag);
	});
});

/************
* Favorites *
************/

// GET a list of all favorite channels with usable activities/tags
router.get("/api/favorites", isAuthenticated, function(req, res) {
	var user = req.session.passport.user;
	Channel.find({favorite: true, user: user}, function(err, channels) {
		if (channels.length) {
			// Changes the tag objectid's to tagnames
			getTagsRecursive(channels, channels.length - 1, 0, [], user, function(processed) {
				channels = processed;
				// Changes the activity objectid's to activity names
				getActivitiesRecursive(channels, channels.length - 1, 0, [], user, function(results) {
					res.status(200).json({favorites: results});
				});
			});
		} else {
			res.status(200).json({favorites: []});
		}
	});
});

module.exports = router;
