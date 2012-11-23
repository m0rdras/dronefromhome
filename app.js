'use strict';

var express = require('express'),
    arDrone = require('ar-drone'),
    fs = require('fs'),
    path = require('path'),
    http = require('http'),
    Parser = require('./src/PaVEParser.js'),
    actionMap = require('./src/control.js'),
    app = express(),
    server = http.createServer(app),
    WebSocketServer = require('ws').Server,
    wss = new WebSocketServer({server: server});

var PORT = 8088,
    VIDEO_TIMEOUT = 4000,
    MOUSE_THRESHOLD = 2;

var client = arDrone.createClient(),
    paveParser,
    tcpVideoStream;

client.disableEmergency();
//client.config("video:video_codec", 131);
client.config('general:navdata_demo', 'FALSE');

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

var handleKey = function (key, state) {
    console.log('Got keystroke: ' + key + ' state: ' + state);
    if (actionMap.hasOwnProperty(key)) {
        actionMap[key].apply(this, [ client, state ]);
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

    switch (msg.type) {
    case 'keydown':
        handleKey(msg.data, true);
        break;
    case 'keyup':
        handleKey(msg.data, false);
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

var connectVideoStream = function () {
    tcpVideoStream.connect(function () {
        tcpVideoStream.pipe(paveParser);

    });
};

var connectVideo = function (socket) {
    paveParser = new Parser();
    tcpVideoStream = new arDrone.Client.PngStream.TcpVideoStream({timeout: VIDEO_TIMEOUT});

    paveParser.on('data', function (data) {
        try {
            socket.send(data, { binary: true });
        } catch (err) {
            console.log('error while sending video: ' + err);
        }
    });

    paveParser.on('error', function (err) {
        console.log('error while parsing video stream: ' + err);
        paveParser = new Parser();
        tcpVideoStream.end();
        connectVideoStream();
    });

    connectVideoStream();

    tcpVideoStream.on('error', function (err) {
        console.log('Error on TCPVideoStream: ' + err);
        tcpVideoStream.end();
        connectVideo(socket);
    });
};

wss.on('connection', function (socket) {
    console.log('client connected');

    client.animateLeds('blinkRed', 5, 2);

    socket.on('error', function (err) {
        console.log('socket error: ' + err);
        connectVideo(socket);
    });

    socket.on('message', handleClientMessage);

    socket.on('close', function () {
        paveParser.removeAllListeners();
        client.removeAllListeners();
    });

    client.on('navdata', function (navdata) {
        try {
            socket.send(JSON.stringify(navdata.demo));
        } catch (err) {
            console.log('error while sending navdata: ' + err);
        }
    });

    connectVideo(socket);
});


var application = server.listen(PORT);

console.log("DroneFromHome server listening on port %s in %s mode", PORT, app.settings.env);
