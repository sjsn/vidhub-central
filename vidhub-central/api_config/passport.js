var passport = require("passport");
var LocalStrategy = require("passport-local").Strategy;
var mongoose = require("mongoose");
var User = mongoose.model("User");

// Searches db for username/password
passport.use(new LocalStrategy(
	function(username, password, done) {
		User.findOne(function(err, user) {
			if (err) {
				done(err);
			}
			// If username not found
			if (!user) {
				return done(null, false, {
					message: "User not found"
				});
			}
			// If password doesn't match stored password
			if (!user.validatePassword(password)) {
				return done(null, false, {
					message: "User not found"
				});
			}
			// If everything matched return the user object
			return done(null, user);
		});
	}
));
