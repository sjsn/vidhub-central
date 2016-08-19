"use strict";

// Initiates the angular app
var app = angular.module("VidHub", ["ui.router", "ui.bootstrap", "ngAnimate", "angular.filter"]);

// Page router
app.config(["$stateProvider", "$urlRouterProvider", 
	function($stateProvider, $urlRouterProvider) {

		$stateProvider.state(
			"home", {
				url: "/",
				templateUrl: "./partials/forms.ejs",
				controller: "FormCtrl",
				resolve: {
					"loginPromise": [
						"userAuth", function(userAuth) {
							return userAuth.checkLogin();
						}
					]
				}
			}
		)
		.state(
			"feed", {
				url: "/feed",
				templateUrl: "./partials/feed.ejs",
				controller: "FeedCtrl",
				resolve: {
					"feedPromise": [
						"channelService" , function(channelService) {
							return channelService.getAllActivities();
						}
					]
				}
			}
		)
		.state(
			"favorites", {
				url: "/favorites",
				templateUrl: "./partials/favorites.ejs",
				controller: "FavCtrl",
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
		checkLogin: function() {
			return $http.get("/api/login").then(function(res) {
				if (res.data) {
					data = res.data;
				}
			}, function(err) {
				console.log(err);
			});
		},
		isLoggedIn: function() {
			return data.username != undefined;	
		},
		login: function(username, password) {
			return $http({
				url: "/api/login/",
				method: "POST",
				data: {username: username, password: password}
			});
		},
		logout: function() {
			$http.get("/api/logout").then(function() {
				data = {};
			});
		},
		register: function(fName, lName, username, password) {
			return $http({
				url: "/api/users",
				method: "POST",
				data: {fName: fName, lName: lName, username: username, password: password}
			});
		},
		setUser: function(user) {
			angular.copy(user, data);
		},
		getUser: function(user) {
			return data;
		},
		addUsername: function(username, service) {
			return $http({
				url: "/api/users/" + data._id + "/addusername",
				method: "POST",
				data: {username: username, service: service}
			});
		}
	};
}]);

app.factory("channelService", ["$http", function($http) {

	var data = [];

	// Helper function to get the index of the given channel
	var getChannelIndex = function(channel) {
		return _.findLastIndex(data, channel);
	};

	return {
		setChannels: function() {
			$http.get("/api/channels").then(function(res) {
				data = res.data;
			});
		},
		getChannels: function() {
			return data;
		},
		getActivities: function(id) {
			return $http.get("/api/channels/" + id + "/activities");
		},
		favorite: function(channel) {
			$http.post("/api/channels/" + channel._id + "/favorite")
			.then(function() {
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
			});
		},
		addTag: function(channel, tag) {
			if (tag) {
				// Formats tag to keep them all uniform
				if (tag.charAt(0) == "#") {
					tag.splice(1);
				}
				tag = tag.split(" ");
				tag = tag.join("");
				tag = "#" + tag.toLowerCase();
				$http({
					url: "/api/channels/" + channel._id + "/tags",
					method: "POST",
					data: {tag: tag}
				}).then(function() {
					var index = getChannelIndex(channel);
					data[index].tags.push(tag);
					data.newTag = "";
				});
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
						return category.name == tag;
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
			return $http.get("/api/activities");
		},
	};

}]);

app.controller("MainCtrl", ["$scope", "channelService", "userAuth", "$http",
	function($scope, channelService, userAuth, $http) {

	$scope.isSignedIn = function() {					
		return userAuth.isLoggedIn();
	};

	// Easy tag-click navigation
	$scope.tagClick = function(tag) {
		$scope.clickedTag = tag;
	};

}]);

// Controller for the top-level index page
// Global scope to know when a user is signed in
app.controller("FormCtrl", ["$scope", "channelService", "userAuth", "$http", "loginPromise",
	function($scope, channelService, userAuth, $http, loginPromise) {

	$scope.isSignedIn = function() {					
		return userAuth.isLoggedIn();
	};

	$scope.toggleLogin = true;

	$scope.login = function() {
		$scope.invalidCred = false;
		$scope.noAccount = false;
		if (username && password) {
			userAuth.login($scope.username, $scope.pass).then(function(res) {
				var user = res.data;
				if (user.username) {
					userAuth.setUser(user);
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
		if ($scope.fName && $scope.lName && $scope.username && $scope.pass && ($scope.pass == $scope.confpass)) {
			userAuth.register($scope.fName, $scope.lName, $scope.username, $scope.pass).then(function(res) {
				if (res.data) {
					$scope.toggleLogin = true;
					$scope.actCreatedMsg = true;
					$scope.invalidCred = false;
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
app.controller("FeedCtrl", ["$scope", "channelService", "userAuth", "feedPromise", function($scope, channelService, userAuth, feedPromise) {

	if (!feedPromise.msg) {
		$scope.activities = feedPromise.data;
	}

	if (userAuth.getUser().channels) {
		channelService.setChannels();
	}

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
		channelService.getActivities(channel._id).then(function(res) {
			var modalInstance = $uibModal.open({
				animation: true,
				templateUrl: "./partials/channelListModal.ejs",
				controller: "ModalCtrl",
				size: "lg",
				resolve: {
					channel: function() {
						return channel;
					},
					activities: function() {
						return res.data.activities;
					}
				}
			});
		});
	};

}]);

app.controller("ModalCtrl", ["$scope", "$uibModalInstance", "channel", "activities", function($scope, $uibModalInstance, channel, activities) {

	$scope.channel = channel;
	$scope.activities = activities;
	$scope.close = function() {
		$uibModalInstance.dismiss('cancel')
	};

}]);

// Controller for the categories page
app.controller("CategoriesCtrl", ["$scope", "userAuth", "channelService", function($scope, userAuth, channelService) {

	$scope.categories = channelService.getCategories();
	console.log($scope.categories);

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

	$scope.areCats = function() {
		var exists = false;
		_.each($scope.categories, function(category) {
			if (!exists && category) {
				exists = true;
			}
		});
		return exists;
	};

}]);

// Controller for the account page
app.controller("AccountCtrl", ["$scope", "userAuth", function($scope, userAuth) {
	
	$scope.user = userAuth.getUser();

	$scope.logout = function() {
		userAuth.logout();
	};

	$scope.error = false;
	$scope.addUsername = function(username, service) {
		$scope.error = false;
		if (username && service) {
			userAuth.addUsername(username, service).then(function(res) {
				var user = res.data;
				if (!user) {
					$scope.error = true;
				} else {
					$scope.user = user;
					userAuth.setUser(user);
				}
			});
		} else {
			$scope.error = true;
		}
	};

}]);
