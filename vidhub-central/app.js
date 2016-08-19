var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
// For user authentication
var passport = require("passport");
var session = require("express-session");
var MongoStore = require("connect-mongo")(session);
var secret = require("./api_config/secret");

var app = express();
var flash = require("connect-flash");
app.use(flash());
// Rate Limiter
var RateLimit = require('express-rate-limit');
// Limiter for API
var apiLimiter = new RateLimit({
  windowMs: 60 * 1000, // Refresh count every limit
  max: 50, // Allow a maiximum of 50 requests
  delayMs: 0 // Limit happens instantly
});
// Limiter for front-end site
var siteLimiter = new RateLimit({
  windowMs: 60 * 1000, // Refresh count every limit
  max: 100, // Allow a maiximum of 100 requests
  delayMs: 0 // Limit happens instantly
});

// Mongoose setup
var mongoose = require("mongoose");
// Import models
require("./models/Users");
require("./models/Channels");
require("./models/Tags");
require("./models/Activities");
mongoose.Promise = global.Promise;
// Establish a connection with the database
var db = "mongodb://localhost/vidhubcentral"
mongoose.connect(db);

// Session setup
app.use(session({
  secret: secret.SECRET,
  name: "vidhubcen_sess",
  resave: false,
  saveUninitialized: true,
  maxAge: (1000 * 60 * 60 * 24 * 7),
  store: new MongoStore({url: db})
}));

// Import authentication (passport) packages
require("./api_config/passport.js");
// Sets passport functions as middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes for client-side content
var routes = require("./routes/index");
// Routes for API
var apiRoutes = require("./routes/api");

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

// Main app endpoint (front-end of app)
app.use('/', siteLimiter, routes);
// API endpoints
app.use("/", apiLimiter, apiRoutes);

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

app.use(function(err, req, res, next) {
  if (err.name === "UnauthorizedError") {
    res.status(401);
    res.json({
      message: err.name + ": " + err.message
    });
  }
});

module.exports = app;
