var passport = require("passport");
var mongoose = require("mongoose");
var User = mongoose.model("User");

module.exports.authRestrict = function(req, res, next) {
	if (req.isUnAuthenticated()) {
		return req.json(403, 
			{message: 'Access denied, please log in'}
		);
	}
    next();
};
