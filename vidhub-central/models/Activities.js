// Imports mongoose
var mongoose = require("mongoose");

// The activities model
var ActivitySchema = new mongoose.Schema({
	name: String,
	date: Date,
	expireAt: Date,
	user: String,
	channelName: String,
	channelID: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Channel"
	}
});

// Sets the activity to auto-expire at the expireAt date
ActivitySchema.index({"expireAt": 1}, {expireAfterSeconds: 0});

// Binds the schema to the model
mongoose.model("Activity", ActivitySchema);
