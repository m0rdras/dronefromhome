var express = require('express'),
    arDrone = require('ar-drone'),
    fs = require('fs'),
    path = require('path'),
    ffmpeg = require('fluent-ffmpeg'),
    http = require('http');

var client = arDrone.createClient();

var app = module.exports = express(),
    server = http.createServer(app),
    io = require('socket.io').listen(server);

var PORT = 8088;


app.configure(function () {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.set('view options', {
        layout:false
    });
    app.use(express.favicon());
    app.use(express.compress());
    app.use(express.static(__dirname + '/public'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
});

app.configure('development', function () {
    app.use(express.errorHandler({ dumpExceptions:true, showStack:true }));
});

app.configure('production', function () {
    app.use(express.errorHandler());
});


function sendStream(req, res) {
    var pngStream = client.createPngStream();

    pngStream.pause = function () {
    };
    pngStream.destroy = function () {
    };

    pngStream.once('data', function (data) {
        var imgdata = data.toString('base64');
        console.log('sending image');
        res.send({ base64image:imgdata });
    });
}


app.get('/', function (req, res) {
    res.render('index');
});

app.get('/stream', sendStream);

io.sockets.on('connection', function (socket) {
    //setInterval(function() {
    //  console.log("Emitting some heartbeat");
    //  socket.emit('heartbeat', "test");
    //}, 1000);
    socket.on('command', function (data) {
        console.log(data);
        if (data == 87) {
            console.log("w pushed");
            client.front(0.5);
        }
        if (data == 83) {
            console.log("s pushed");
            client.back(0.5);
        }
        if (data == 65) {
            console.log("a pushed");
            client.left(0.5);
        }
        if (data == 68) {
            console.log("d pushed");
            client.right(0.5);
        }
        if (data == 32) {
            console.log("SPACE pushed");
            client.land();
        }
        if (data == 16) {
            console.log("SHIFT pushed");
            client.takeoff();
        }
        if (data == 67) {
            console.log("c pushed");
            client.stop();
        }
        if (data == 81) {
            console.log("q pushed");
            client.up(0.5);
        }
        if (data == 91) {
            console.log("e pushed");
            client.down(0.5);
        }
    });
});

var application = server.listen(PORT);

console.log("Express server listening on port %s in %s mode", PORT, app.settings.env);
