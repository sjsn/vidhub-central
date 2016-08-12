var express = require('express');
var router = express.Router();// Import passport for authentication
var passport = require("passport");
// Import mongoose and models for DB interaction
var mongoose = require("mongoose");
var User = mongoose.model("User");
var Channel = mongoose.model("Channel");
var Tag = mongoose.model("Tag");
var Activity = mongoose.model("Activity");

/*****************
* Authentication *
*****************/

// POST a login attempt. Redirects to homepage if success
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

// POST a new user account
router.post("/api/users/", function(req, res) {
	User.findOne({username: req.body.username}, function(err, user) {
		//	If any errors are present
		if (err) {
			console.log("Error signing up: " + err);
			res.redirect("/#/");
		}
		// If the user already exists
		if (user) {
			console.log("User already exists");
			res.redirect("/#/");
		// If everything is ok and user can be created
		} else {
			console.log("Registering user: " + req.body.username);
			var user = new User();
			user.username = req.body.username;
			if (req.name) {
				user.name = req.body.name;
			} else {
				user.name = "";
			}
			// Encrypts the password for safety
			user.setPassword(req.body.password);
			user.save(function(err) {
				if (err) {
					res.status(400).json({
						msg: err
					});
				}
				res.user = user;
				res.status(200).redirect("/#/");
			});
		}
	});

});

// GET a logout
router.get("/api/logout", function(req, res) {
	req.logout();
	res.redirect("/api/login");
});

// GET the current users account
// router.get("api/users/:uid", function(user, req, res) {
// 	console.log(req.user);
// });

// DELETE a users account

/*******************
* User Information *
*******************/


/***********
* Channels *
***********/

// GET a list of the profiles channels

module.exports = router;
