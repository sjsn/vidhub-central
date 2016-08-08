// Imports mongoose
var mongoose = require("mongoose");

// The tags model
var TagSchema = new mongoose.Schema({
	name: String,
	channel: {
		type: mongoose.Schema.Types.ObjectId, 
		ref: "Channel"
	}
});

// Binds the model to the schema
mongoose.model("Tag", TagSchema);
