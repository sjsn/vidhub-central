var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;
var mongoose = require("mongoose");
var User = mongoose.model("User");

// Defines the passport localstrategy
passport.use("login", new LocalStrategy({
		passReqToCallback: true
	}, function(req, username, password, done) {
			User.findOne({username: username}, function(err, user) {
				if (err) {
					return done(err, null);
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
				return done(null, user);
			});
		}
	)
);

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
