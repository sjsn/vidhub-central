var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;
var mongoose = require("mongoose");
var User = mongoose.model("User");
var Channel = mongoose.model("Channel");
var Activitiy = mongoose.model("Activity");
var secret = require("./secret");
var YouTubeStrategy = require("passport-youtube-v3").Strategy;
var TwitchStrategy = require("passport-twitch").Strategy;
// For logging objects for debug
var util = require("util");

// Defines the passport localstrategy
passport.use("login", new LocalStrategy({
		passReqToCallback: true
	}, function(req, username, password, done) {
			User.findOne({username: username}, function(err, user) {
				if (err) {
					console.log("Error");
					return done(err, null, null);
				}
				// Returns if the user with that username wasn't found in the database
				if (!user) {
					return done(null, false, {
						message: "User not found"
					});
				}
				// Compares the password with the stored encrypted password
				if (!user.validatePassword(password)) {
					return done(null, false, {
						message: "User not found"
					});
				}
				// If everything matched, return the user object
				return done(null, user, null);
			});
		}
	)
);

// Defines the passport YouTube auth strategy
passport.use("youtube", new YouTubeStrategy({
		clientID: secret.youtube.ID,
		clientSecret: secret.youtube.secret,
		// Just for testing. Change when live
		callbackURL: "http://localhost:8080/api/auth/youtube"
	},
	function(accessToken, refreshToken, profile, done) {
		// Compares the twitch profile name with the users registered profile name
		var search = {
			youtubeUsername: profile.displayName
		};

		//Finds the current user and if gets the relevant channel information
		User.findOne(search, function(err, user) {
			if (err) {
				return done(err, null);
			}
			if (!user) {
				return done(null, false, {
					message: "User not found"
				})
			}
			if (!user.youtubeAccessToken || user.youtubeAccessToken != accessToken) {
				user.youtubeAccessToken = accessToken;
				// console.log("Saving user in psprt: " + user);
				user.save(function(err, user) {
					if (err) {
						return done(err, null);
					}
					return done(null, user);
				});
			}
			return done(null, user);
		});
	}
));

// Defines the passport Twitch auth strategy
passport.use("twitch", new TwitchStrategy({
		clientID: secret.twitch.ID,
		clientSecret: secret.twitch.secret,
		// Just for testing. Change when live
		callbackURL: "http://localhost:8080/api/auth/twitch",
		scope: "user_read"
	},
	function(accessToken, refreshToken, profile, done) {
		console.log("access tokem from passport: " + accessToken)
		// Compares the twitch profile name with the users registered profile name
		var search = {
			twitchUsername: profile.displayName
		};

		//Finds the current user and if gets the relevant channel information
		User.findOne(search, function(err, user) {
			if (err) {
				return done(err, null);
			}
			if (!user) {
				return done(null, false, {
					message: "User not found"
				})
			}
			if (!user.twitchAccessToken || user.twitchAccessToken != accessToken) {
				user.twitchAccessToken = accessToken;
				user.save(function(err, user) {
					if (err) {
						return done(err, null);
					}
					return done(null, user);
				});
			}
			return done(null, user);
		});
	}
));

// Handles serializing user for passport
passport.serializeUser(
	function(user, next) {
	  	next(null, user.id);
	}
);

// Handles deserializing user for passport
passport.deserializeUser(
	function(id, next) {
		User.findById(id, function (err, user) {
	    	if (err) { 
	    		return next(err); 
	    	}
	    	next(null, user);
	  	});
	}
);
