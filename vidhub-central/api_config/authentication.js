var passport = require("passport");
var mongoose = require("mongoose");
var User = mongoose.model("User");

var sendJSONresponse = function(res, status, content) {
	res.status(status);
	res.json(content);
}

// Creates a user
module.exports.register = function(req, res) {
	// Check to see if all fields are entered
	if (!req.body.username || !req.body.name || !req.body.password) {
		sendJSONresponse(res, 400, {
			success: false,
			message: "Missing required fields."
		});
	} else {

		// Instantiates a new user
		var user = new User();

		// Adds the non-protected fields to the model
		user.channels = [];
		user.username = req.body.username;
		user.name = req.body.name;
		// Hashes and adds the fields to the model using the User field
		user.setPassword(req.body.password);

			// Saves the complete model to the database
		user.save(function(err) {
			if (err) {
				return res.json({
					success: false,
					message: "Username in use"
				});
			}
			var token = user.generateJwt();
			res.status(200);
			res.json({
				success: true,
				token: token,
				msg: "Successfully created a new user"
			})
		});
	}

};

// Logs a user in
module.exports.login = function(req, res) {

	// Throws error if required fields are blank
	if (!req.body.username || !req.body.password) {
		sendJSONresponse(res, 400, {
			message: "Missing required fields."
		});
		return;
	}

	passport.authenticate('local', function(err, user, info) {
		// If Passport throws/catches an error
		if (err) {
			res.status(404).json(err);
			return;
		// If a user is found
		} else if (user) {
			res.redirect("/profiles/" + )
		// If a user is not found
		} else {
			res.status(401).json({
				info: info
			});
		}
	})(req, res);
};
