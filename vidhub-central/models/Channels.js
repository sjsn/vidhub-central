// Import mongoose
var mongoose = require("mongoose");

// The Channels model
var ChannelSchema = new mongoose.Schema({
	name: String,
	channelID: String,
	type: String,
	favorite: {type: Boolean, default: false},
	tags: [{
		type: mongoose.Schema.Types.ObjectId, 
		ref: "Tag"
	}],
	activities: [{
		type: mongoose.Schema.Types.ObjectId, 
		ref: "Activity"
	}],
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Users"
	}
});

// Handles a user favoriting/unvfavoriting a channel
ChannelSchema.methods.updateFavorite = function(cb) {
	this.favorite = !this.favorite;
	this.save(cb);
};

// Handles updating channel subscriber information
ChannelSchema.methods.updateSubs = function(newCount, cb) {
	this.subscribers = newCount;
	this.save(cb);
};

// Handles adding a new tag to the channel
ChannelSchema.methods.addTag = function(tag, cb) {
	this.tags.push(tag);
	this.save(cb);
};

// Binds the schema to the model
mongoose.model("Channel", ChannelSchema);
