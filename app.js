// ----------------------------------------------------------------------------
// Contoso Node Web App
// ----------------------------------------------------------------------------

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var compression = require('compression');
var RedisStore = require('connect-redis')(session);
var debug = require('debug')('contosonode');
var uuid = require('node-uuid');
var routes = require('./routes/index');
var os = require('os');

var app = express();

// ----------------------------------------------------------------------------
// Application Insights integration
// ----------------------------------------------------------------------------
if (process.env.APPINSIGHTS_KEY) {
  var AppInsights = require('applicationinsights');
  var appInsights = new AppInsights({
    instrumentationKey: process.env.APPINSIGHTS_KEY
  });
  appInsights.trackAllHttpServerRequests("favicon");
  appInsights.trackAllUncaughtExceptions();
}

// ----------------------------------------------------------------------------
// view engine setup
// ----------------------------------------------------------------------------
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('view cache', false);
app.locals.pretty = true;

// ----------------------------------------------------------------------------
// Log customizations
// ----------------------------------------------------------------------------
logger.token('correlationId', function getCorrelationId(req) {
  return req.correlationId ? req.correlationId : undefined;
});
app.use(logger(':method :url :status :response-time ms - :res[content-length] :correlationId'));

// ----------------------------------------------------------------------------
// Middleware
// ----------------------------------------------------------------------------
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(compression());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ----------------------------------------------------------------------------
// Generate a correlation ID
// ----------------------------------------------------------------------------
app.use(function (req, res, next) {
  // TODO: Should there be a header set?
  req.correlationId = uuid.v4();  
  next();
});

// ----------------------------------------------------------------------------
// General page view variables
// ----------------------------------------------------------------------------
app.use(function (req, res, next) {
  req.app.locals.correlationId = req.correlationId;
  req.app.locals.serverName = os.hostname();
  if (process.env.APPINSIGHTS_KEY) {
    req.app.locals.appInsightsKey = process.env.APPINSIGHTS_KEY;  
  }  
  next();
});

// ----------------------------------------------------------------------------
// homepage and user routes
// ----------------------------------------------------------------------------
app.use('/', routes);

// ----------------------------------------------------------------------------
// error handlers
// ----------------------------------------------------------------------------
app.use(function(req, res, next) {
    // catch 404 and forward to error handler
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// production error handler : no stacktraces leaked to user
app.use(function(err, req, res, next) {
    if (req && req.app && req.app.settings && req.app.settings.dataclient && req.app.settings.runtimeConfig) {
      var config = req.app.settings.runtimeConfig;
      var dc = req.app.settings.dataclient;
      if (config.logging.errors && err.status !== 403) {
        dc.insertErrorLogEntry(req, err);
      }
    }
    console.error(err.stack);
    if (res.headersSent) {
      return next(err);
    }
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {},
        title: err.status === 404 ? 'Not Found' : '#appfail',
        user: req.user,
        skipAadLayout: true
    });
});

module.exports = app;
