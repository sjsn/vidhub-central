// Imports mongoose
var mongoose = require("mongoose");

// The activities model
var ActivitySchema = new mongoose.Schema({
	name: String,
	date: Date,
	channel: {
		type: mongoose.Schema.Types.ObjectId, 
		ref: "Channel"
	}
});

// Binds the schema to the model
mongoose.model("Activity", ActivitySchema);
