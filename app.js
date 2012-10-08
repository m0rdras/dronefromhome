var express = require('express'),
    arDrone = require('ar-drone'),
    fs = require('fs'),
    path = require('path'),
    http = require('http');

var app = module.exports = express(),
    server = http.createServer(app),
    io = require('socket.io').listen(server);

var PORT = 8088,
    SPEED = 0.5,
    CONTROL_TIME = 10;

var currentImage = '';

var client = arDrone.createClient();
var pngStream = client.createPngStream();

pngStream.on('data', function (data) {
    currentImage = data.toString('base64');
    console.log('received image');
});

var actionMap = {
    // w
    87: function () { client.front(SPEED); },
    // s
    83: function () { client.back(SPEED); },
    // a
    65: function () { client.left(SPEED); },
    // d
    68: function () { client.right(SPEED); },
    // space
    32: function () { client.land(); },
    // shift
    16: function () { client.takeoff(); },
    // c
    67: function () { client.stop(); },
    // q
    81: function () { client.up(SPEED); },
    // e
    91: function () { client.down(SPEED); }
};

var control = {
    x: 0,
    y: 0,
    z: 0,
    rot: 0
};

app.configure(function () {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.set('view options', {
        layout: false
    });
    app.use(express.favicon());
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

app.get('/', function (req, res) {
    res.render('index');
});

app.get('/stream', function (req, res) {
    res.json({ base64image: currentImage });
});

io.sockets.on('connection', function (socket) {
    //setInterval(function() {
    //  console.log("Emitting some heartbeat");
    //  socket.emit('heartbeat', "test");
    //}, 1000);
    socket.on('command', function (data) {
        console.log('got drone command: ' + data);
        actionMap[data].apply();
    });

    socket.on('mouseX', function (data) {
        console.log('mouse x: ' + data);
        if (data < 0) {
            client.clockwise(0.5);
        } else {
            client.counterClockwise(0.5);
        }
        control.rot = CONTROL_TIME;
    });

    socket.on('mouseY', function (data) {
        console.log('mouse y: ' + data);

        if (data < 0) {
            client.up(0.5);
        } else {
            client.down(0.5);
        }
        control.z = CONTROL_TIME;
    });
});

var application = server.listen(PORT);

console.log("DroneFromHome server listening on port %s in %s mode", PORT, app.settings.env);
