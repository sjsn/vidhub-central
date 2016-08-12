"use strict";

// Initiates the angular app
var app = angular.module("VidHub", ["ui.router", "ui.bootstrap", "ngAnimate"]);

// Page router
app.config(["$stateProvider", "$urlRouterProvider", 
	function($stateProvider, $urlRouterProvider) {

		$stateProvider.state(
			"home", {
				url: "/",
				templateUrl: "./partials/forms.ejs",
				controller: "FormCtrl"
			}
		)
		.state(
			"feed", {
				url: "/feed",
				templateUrl: "./partials/feed.ejs",
				controller: "FeedCtrl"
			}
		)
		.state(
			"favorites", {
				url: "/favorites",
				templateUrl: "./partials/favorites.ejs",
				controller: "FavCtrl"
			}
		).state(
			"channels", {
				url: "/channels",
				templateUrl: "./partials/channels.ejs",
				controller: "ChannelsCtrl"
			}
		).state(
			"categories", {
				url: "/categories",
				templateUrl: "./partials/categories.ejs",
				controller: "CategoriesCtrl"
			}
		).state(
			"account", {
				url: "/account",
				templateUrl: "./partials/account.ejs",
				controller: "AccountCtrl"
			}
		);

		$urlRouterProvider.otherwise("/");

}]);

// Handles authentication and manipulation of all of the user info
app.factory("userAuth", ["$http", "$window", function($http, $window){

	var data = {};

	return {
		isLoggedIn: function() {
			return false;
		},
		login: function(username, password) {
			return $http({
				url: "/api/login/",
				method: "POST",
				params: {username: username, password: password}
			});
		},
		register: function(name, username, password) {
			return $http({
				url: "/api/users",
				method: "POST",
				params: {name: name, username: username, password: password}
			});
		},
		setUser: function(user) {
			data = user;
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
			if (count <= 11 || data[index].favorite) {
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
		},
		getCategories: function() {
			var categories = [];
			_.each(data, function(channel) {
				_.each(channel.tags, function(tag) {
					var index = _.findIndex(categories, function(category) {
						return category.name == "" + tag;
					});
					if (index == -1) {
						categories.push({name: tag, channels: [channel]})
					} else {
						categories[index].channels.push(channel);
					}
				});
			});
			return categories;
		},
		getAllActivities: function() {
			var activities = [];
			_.each(data, function(channel) {
				_.each(channel.activities, function(activity) {
					activities.push({name: activity.name, date: activity.date, channel: channel});
				})
			});
			return activities;
		},
	};

}]);

app.controller("MainCtrl", ["$scope", "channelService", "userAuth", "$http",
	function($scope, channelService, userAuth, $http) {
	$scope.isSignedIn = function() {
			return userAuth.isLoggedIn();
	};

	// Temp variable holding fake channel data
	channelService.setChannels([
		{name: "PewDiePie", subscribers: 40000000, service: "YouTube", favorite: true, tags: ["#minecraft", "#horror", "#gaming"], activities: [{name: "made a video", date: "1/1/16"}, {name: "livestreamed", date: "2/2/16"}]},
		{name: "Yogscast", subscribers: 10000, service: "YouTube", favorite: false, tags: ["#minecraft", "#gta", "#gaming"], activites: []},
		{name: "Sips", subscribers: 125, service: "YouTube", favorite: false, tags: [], activities: []},
		{name: "Grubby", subscribers: 23415, service: "Twitch", favorite: false, tags: [], activities: []},
		{name: "collegedropouts", subscribers: 123535, service: "YouTube", favorite: true, tags: [], activities: []},
		{name: "sam", subscribers: 87654, service: "YouTube", favorite: false, tags: [], activities: []},
		{name: "david", subscribers: 623465, service: "YouTube", favorite: true, tags: [], activities: []},
		{name: "erica", subscribers: 4325, service: "YouTube", favorite: false, tags: [], activities: []},
		{name: "prankvprank", subscribers: 72454, service: "YouTube", favorite: true, tags: [], activities: []},
		{name: "caseyneistat", subscribers: 345221, service: "Twitch", favorite: false, tags: ["#vlog", "#cool"], activities: []},
		{name: "boardguy420", subscribers: 2346347, service: "YouTube", favorite: true, tags: [], activities: []},
		{name: "brodiesmith21", subscribers: 234647, service: "YouTube", favorite: false, tags: ["#vlog", "#frisbee", "#sports"], activities: []},
		{name: "waterisgood", subscribers: 245, service: "YouTube", favorite: false, tags: [], activities: []},
		{name: "sciencerulez", subscribers: 135245, service: "YouTube", favorite: true, tags: ["#science", "#education"], activities: []},
		{name: "hotsnews", subscribers: 23452, service: "Twitch", favorite: true, tags: [], activities: []},
		{name: "Alphadog", subscribers: 6542, service: "YouTube", favorite: false, tags: [], activities: []},
		{name: "UWEdu", subscribers: 13241, service: "Twitch", favorite: false, tags: [], activities: []},
		{name: "BinDer", subscribers: 90, service: "YouTube", favorite: false, tags: [], activities: []},
		{name: "Personify", subscribers: 13, service: "YouTube", favorite: true, tags: [], activities: []}
	]);

	// Easy tag-click navigation
	$scope.tagClick = function(tag) {
		$scope.clickedTag = tag;
	};

}]);

// Controller for the top-level index page
// Global scope to know when a user is signed in
app.controller("FormCtrl", ["$scope", "channelService", "userAuth", "$http",
	function($scope, channelService, userAuth, $http) {

	$scope.toggleLogin = true;

	$scope.login = function() {
		console.log("login?");
		$scope.invalidCred = false;
		$scope.noAccount = false;
		if (username && password) {
			userAuth.login($scope.username, $scope.pass).then(function(res) {
				console.log(res.user);
				if (res.user) {
					userAuth.setUser(res.user);
					$scope.isSignedIn = true;
				} else {
					$scope.noAccount = true;
				}
			});
		} else {
			$scope.invalidCred = true;
		}
	};

	$scope.register = function() {
		$scope.taken = false;
		$scope.invalidCred = true;
		if ($scope.name && $scope.username && $scope.pass && ($scope.pass == $scope.confpass)) {
			userAuth.register($scope.name, $scope.username, $scope.pass).then(function(res) {
				console.log(res.user);
				if (res.user) {
					userAuth.serUser(res.user);
					$scope.isSignedIn = true;
				} else {
					$scope.taken = true;
				}
			});
		} else {
			$scope.invalidCred = true;
		}
	};

}]);

// Controller for the home feed
app.controller("FeedCtrl", ["$scope", "channelService", function($scope, channelService) {
	$scope.activities = channelService.getAllActivities();
}]);

// Controller for the favorites page
app.controller("FavCtrl", ["$scope", "userAuth", "channelService", function($scope, userAuth, channelService) {

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
app.controller("ChannelsCtrl", ["$scope", "userAuth", "channelService", "$uibModal",  function($scope, userAuth, channelService, $uibModal) {

	// Gets array of all channels
	$scope.channels = channelService.getChannels();

	// Handles favoriting/unvfavoriting a channel
	// Can only have 12 favorites at a time
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

	$scope.openModal = function(channel) {
		var modalInstance = $uibModal.open({
			animation: true,
			templateUrl: "./partials/channelListModal.ejs",
			controller: "ModalCtrl",
			size: "lg",
			resolve: {
				channel: function() {
					return channel;
				}
			}
		});
	};

}]);

app.controller("ModalCtrl", ["$scope", "$uibModalInstance", "channel", function($scope, $uibModalInstance, channel) {

	$scope.channel = channel;
	$scope.close = function() {
		$uibModalInstance.dismiss('cancel')
	};

}]);

// Controller for the categories page
app.controller("CategoriesCtrl", ["$scope", "userAuth", "channelService", function($scope, userAuth, channelService) {

	$scope.categories = channelService.getCategories();

	// Handles favoriting/unvfavoriting a channel
	// Can only have 12 favorites at a time
	$scope.favorite = function(channel) {
		channelService.favorite(channel);
	};

	// Opens page with a search item to handle tag click navigation
	if ($scope.clickedTag != undefined) {
		var tag = $scope.clickedTag;
		tag = tag.slice(1);
		$scope.searchTerm = tag;
	}

}]);

// Controller for the account page
app.controller("AccountCtrl", ["$scope", "userAuth", function($scope, userAuth) {
	
}]);
