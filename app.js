'use strict';

var express = require('express'),
    arDrone = require('ar-drone'),
    fs = require('fs'),
    path = require('path'),
    http = require('http'),
    Parser = require('./src/PaVEParser.js'),
    app = express(),
    server = http.createServer(app),
    WebSocketServer = require('ws').Server,
    wss = new WebSocketServer({server: server});

var PORT = 8088,
    SPEED = 0.5,
    MOUSE_THRESHOLD = 2,
    CONTROL_TIME = 10;

var tcpVideoStream, p, client;

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
    91: function () { client.down(SPEED); },
    // f
    70: function () { client.animate('flipLeft', 15); }
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

var handleKey = function (key) {
    console.log('Got keystroke: ' + key);
    if (actionMap.hasOwnProperty(key)) {
        actionMap[key].apply();
    }
};

var handleMouseMove = function (x, y) {
    if (x < -MOUSE_THRESHOLD) {
        console.log('clockwise');
        client.clockwise(0.5);
    } else if (x > MOUSE_THRESHOLD) {
        console.log('counter-clockwise');
        client.counterClockwise(0.5);
    }

    if (y < -MOUSE_THRESHOLD) {
        console.log('up');
        client.up(0.5);
    } else if (y > MOUSE_THRESHOLD) {
        console.log('down');
        client.down(0.5);
    }
};

var handleClientMessage = function (data, flags) {
    var msg = JSON.parse(data);
//    console.log('message received: ' + data);

    switch (msg.type) {
    case 'key':
        handleKey(msg.data);
        break;
    case 'mouseX':
        handleMouseMove(msg.data, 0);
        break;
    case 'mouseY':
        handleMouseMove(0, msg.data);
        break;
    default:
        console.log('unknown message type: ' + msg.type);
    }
};

wss.on('connection', function (socket) {
    console.log('client connected');

    tcpVideoStream = new arDrone.Client.PngStream.TcpVideoStream({timeout: 4000});
    p = new Parser();

    p.on('data', function (data) {
        socket.send(data, { binary: true });
    });

    tcpVideoStream.connect(function () {
        tcpVideoStream.pipe(p);
    });

    socket.on('message', handleClientMessage);
});

client = arDrone.createClient();
var application = server.listen(PORT);

console.log("DroneFromHome server listening on port %s in %s mode", PORT, app.settings.env);
