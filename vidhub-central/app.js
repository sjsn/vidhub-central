var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
// For user authentication
var passport = require("passport");

var app = express();

// Mongoose setup
var mongoose = require("mongoose");
// Import models
require("./models/Users");
require("./models/Channels");
require("./models/Tags");
require("./models/Activities");
mongoose.Promise = global.Promise;
// Establish a connection with the database
mongoose.connect("mongodb://localhost/vidhubcentral");

// Import authentication (passport) packages
require("./api_config/passport.js");
// Sets passport functions as middleware
app.use(passport.initialize());

// API directory
var routes = require("./routes/index");

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Sets a custom static path for partials
app.use('/partials', express.static(__dirname + '/views/partials'));

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint
app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
