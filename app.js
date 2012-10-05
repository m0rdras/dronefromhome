var express = require('express'),
    arDrone = require('ar-drone');

var client = arDrone.createClient();

var app = module.exports = express();

var PORT = 8088;



app.configure(function () {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.set('view options', {
        layout: false
    });
    app.use(express.favicon());
    app.use(express.compress());
    app.use(express.static(__dirname + '/public'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
});

app.configure('development', function () {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function () {
    app.use(express.errorHandler());
});



var server = app.listen(PORT);

console.log("Express server listening on port %s in %s mode", PORT, app.settings.env);
