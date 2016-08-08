var express = require('express');
var router = express.Router();
// Import passport for authentication
var passport = require("passport");
// Import mongoose and models for DB interaction
var mongoose = require("mongoose");
var User = mongoose.model("User");
var Channel = mongoose.model("Channel");
var Tag = mongoose.model("Tag");
var Activity = mongoose.model("Activity");

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', { title: 'Express' });
});

// Stopped at Mean Authentication -> Configuring API End Points

module.exports = router;
