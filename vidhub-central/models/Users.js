// For interaction with mongodb
var mongoose = require("mongoose");
// For encrypting user passwords
var crypto = require("crypto");
// My secret for JWT
var secret = require("../api_config/secret");

// The User model
var UserSchema = new mongoose.Schema({
	username: {
		type: String,
		unique: true,
		required: true
	},
	firstName: {
		type: String,
		required: true
	},
	lastName: {
		type: String,
		required: true
	},
	salt: {
		type: String,
		required: true
	},
	hash: {
		type: String,
		required: true
	},
	channels: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: "Channel"
	}],
	// YouTube and Twitch credentials
	youtubeUsername: String,
	youtubeAccessToken: String,
	twitchUsername: String,
	twitchAccessToken: String
});

// Saves user password as an encrypted hash + salt for security
UserSchema.methods.setPassword = function(password) {
	this.salt = crypto.randomBytes(16).toString("hex");
	this.hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64).toString("hex");
};

// // Validates user password for logging in
UserSchema.methods.validatePassword = function(password) {
	var hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64).toString("hex");
	return this.hash == hash;
};

// Binds the schema to the model
mongoose.model("User", UserSchema);
