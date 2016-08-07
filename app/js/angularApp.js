"use strict";

// Initiates the angular app
var app = angular.module("VidHub", ["ui.router", "ui.bootstrap", "ngAnimate"]);

// Page router
app.config(["$stateProvider", "$urlRouterProvider", 
	function($stateProvider, $urlRouterProvider) {

		$stateProvider.state(
			"home", {
				url: "/",
				templateUrl: "partials/home.html",
				controller: "HomeCtrl"
			}
		).state(
			"favorites", {
				url: "/favorites",
				templateUrl: "partials/favorites.html",
				controller: "FavCtrl"
			}
		).state(
			"channels", {
				url: "/channels",
				templateUrl: "partials/channels.html",
				controller: "ChannelsCtrl"
			}
		).state(
			"categories", {
				url: "/categories",
				templateUrl: "partials/categories.html",
				controller: "CategoriesCtrl"
			}
		).state(
			"account", {
				url: "/account",
				templateUrl: "partials/account.html",
				controller: "AccountCtrl"
			}
		);


		$urlRouterProvider.otherwise("/");

}]);

// Handles manipulation of all of the user info
app.factory("user", ["$http", function($http){
	var data = [];

	return {
		signIn: function(userInfo) {

		},
		getYoutube: function() {

		},
		getTwitch: function() {

		},
		getChannels: function() {

		}
	};
}]);

app.factory("channelService", [function() {

	var data = [];

	// Helper function to get the index of the given channel
	var getChannelIndex = function(channel) {
		return _.findLastIndex(data, channel);
	};

	return {
		setChannels: function(channels) {
			data = channels;
		},
		getChannels: function() {
			return data;
		},
		favorite: function(channel) {
			var count = 0;
			for (var i = 0; i < data.length; i++) {
				if (data[i].favorite == true) {
					count += 1;
				}
			};
			var index = getChannelIndex(channel);
			if (count <= 10 || data[index].favorite) {
				data[index].favorite = !data[index].favorite;
			} else {
				console.log("Too many favorites");
			}
		},
		addTag: function(channel, tag) {
			if (tag) {
				var index = getChannelIndex(channel);
				if (tag.charAt(0) == "#") {
					tag.splice(1);
				}
				tag = tag.split(" ");
				tag = tag.join("");
				data[index].tags.push("#" + tag.toLowerCase());
				data.newTag = "";
			}
		},
		deleteTag: function(channel, tag) {
			var index = getChannelIndex(channel);
			var tagIndex = _.findLastIndex(data[index].tags, tag);
			data[index].tags.splice(tagIndex, 1);
		}
	};

}]);

// Controller for the top-level index page
// Global scope to know when a user is signed in
app.controller("MainCtrl", ["$scope", "channelService", function($scope, channelService) {

	$scope.isSignedIn = true;

	// Temp variable holding fake channel data
	channelService.setChannels([
		{name: "PewDiePie", subscribers: 40000000, service: "YouTube", favorite: true, tags: ["#minecraft", "#horror", "#gaming"]},
		{name: "Yogscast", subscribers: 10000, service: "YouTube", favorite: false, tags: ["#minecraft", "#gta", "#gaming"]},
		{name: "Sips", subscribers: 125, service: "YouTube", favorite: false, tags: []},
		{name: "Grubby", subscribers: 23415, service: "Twitch", favorite: false, tags: []},
		{name: "collegedropouts", subscribers: 123535, service: "YouTube", favorite: true, tags: []},
		{name: "sam", subscribers: 87654, service: "YouTube", favorite: false, tags: []},
		{name: "david", subscribers: 623465, service: "YouTube", favorite: true, tags: []},
		{name: "erica", subscribers: 4325, service: "YouTube", favorite: false, tags: []},
		{name: "prankvprank", subscribers: 72454, service: "YouTube", favorite: true, tags: []},
		{name: "caseyneistat", subscribers: 345221, service: "Twitch", favorite: false, tags: ["#vlog", "#cool"]},
		{name: "boardguy420", subscribers: 2346347, service: "YouTube", favorite: true, tags: []},
		{name: "brodiesmith21", subscribers: 234647, service: "YouTube", favorite: false, tags: ["#vlog", "#frisbee", "#sports"]},
		{name: "waterisgood", subscribers: 245, service: "YouTube", favorite: false, tags: []},
		{name: "sciencerulez", subscribers: 135245, service: "YouTube", favorite: true, tags: ["#science", "#education"]},
		{name: "hotsnews", subscribers: 23452, service: "Twitch", favorite: true, tags: []},
		{name: "Alphadog", subscribers: 6542, service: "YouTube", favorite: false, tags: []},
		{name: "UWEdu", subscribers: 13241, service: "Twitch", favorite: false, tags: []},
		{name: "BinDer", subscribers: 90, service: "YouTube", favorite: false, tags: []},
		{name: "Personify", subscribers: 13, service: "YouTube", favorite: true, tags: []}		
	]);
	console.log(channelService.getChannels());

}]);

// Controller for the home page
app.controller("HomeCtrl", ["$scope", function($scope) {

}]);

// Controller for the favorites page
app.controller("FavCtrl", ["$scope", "user", "channelService", function($scope, user, channelService) {

	$scope.channels = channelService.getChannels();

	$scope.areFavorites = function() {
		var exists = false;
		_.each($scope.channels, function(channel) {
			if (!exists && channel.favorite) {
				exists = true;
			}
		});
		return exists;
	};

	// Handles favoriting/unvfavoriting a channel
	// Can only have 10 favorites at a time
	$scope.favorite = function(channel) {
		channelService.favorite(channel);
	};

	// Formats and adds the given tag to the given channel
	$scope.addTag = function(channel, tag) {
		channelService.addTag(channel, tag);
	};

	// Deletes the given tag from the given channel
	$scope.deleteTag = function(channel, tag) {
		channelService.deleteTag(channel, tag);
	};

}]);

// Controller for the channel list page
app.controller("ChannelsCtrl", ["$scope", "user", "channelService",  function($scope, user, channelService) {

	// Gets array of all channels
	$scope.channels = channelService.getChannels();

	// Handles favoriting/unvfavoriting a channel
	// Can only have 10 favorites at a time
	$scope.favorite = function(channel) {
		channelService.favorite(channel);
	};

	// Formats and adds the given tag to the given channel
	$scope.addTag = function(channel, tag) {
		channelService.addTag(channel, tag);
	};

	// Deletes the given tag from the given channel
	$scope.deleteTag = function(channel, tag) {
		channelService.deleteTag(channel, tag);
	};

}]);

// Controller for the categories page
app.controller("CategoriesCtrl", ["$scope", "user", function($scope, user) {

}]);

// Controller for the account page
app.controller("AccountCtrl", ["$scope", "user", function($scope, user) {

}]);
