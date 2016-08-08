// For interaction with mongodb
var mongoose = require("mongoose");
// For encrypting user passwords
var crypto = require("crypto");
// For generating a user session
var jwt = require("jsonwebtoken");
// My secret for JWT
var secret = require("../api_config/secret.js");

// The User model
var UserSchema = new mongoose.Schema({
	username: {
		type: String,
		unique: true,
		required: true
	},
	name: {
		type: String,
		required: true
	},
	hash: String,
	salt: String,
	channels: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: "Channel"
	}]
});

// Saves user password as an encrypted hash + salt for security
UserSchema.methods.setPassword = function(password) {
	this.salt = crypto.randomBytes(16).toString("hex");
	this.hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64).toString("hex");
};

// Validates user password for logging in
UserSchema.methods.validatePassword = function(password) {
	var hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64).toString("hex");
	return this.hash == hash;
};

// For keeping user log in stored in a session
UserSchema.methods.generateJwt = function() {
	var expiration = new Date();
	// Keeps the user signed in for a week
	expiration.setDate(expiration.getDate() + 7);

	return jwt.sign({
		_id: this._id,
		username: this.username,
		name: this.name,
		exp: parseInt(expiration.getTime() / 1000),
	}, SECRET());
};

// Binds the schema to the model
mongoose.model("User", UserSchema);
