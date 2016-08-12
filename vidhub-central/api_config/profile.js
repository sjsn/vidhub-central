var passport = require("passport");
var mongoose = require("mongoose");
var User = mongoose.model("User");

// Allows for reading of API if user is logged in and accesses their own account
module.exports.profileRead = function(req, res) {

	// If no user ID exists in the JWT return a 401
	if (!req.payload._id) {
		res.status(401).json({
			"message" : "UnauthorizedError: Accessing a private profile"
		});
	} else {
		// Otherwise continue
		User.findById(req.payload._id).exec(function(err, user) {
			res.status(200).json(user);
		});
	}

};

