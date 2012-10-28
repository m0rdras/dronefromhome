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
    VIDEO_TIMEOUT = 4000,
    SPEED = 0.1,
    MOUSE_THRESHOLD = 2;

var client = arDrone.createClient(),
    paveParser = new Parser(),
    tcpVideoStream = new arDrone.Client.PngStream.TcpVideoStream({timeout: VIDEO_TIMEOUT});

client.disableEmergency();

var actionMap = {
    // w
    87: function (state) {
        if (state) { client.front(SPEED); } else { client.back(SPEED); }
    },
    // s
    83: function (state) {
        if (state) { client.back(SPEED); } else { client.front(SPEED); }
    },
    // a
    65: function (state) {
        if (state) { client.left(SPEED); } else { client.right(SPEED); }
    },
    // d
    68: function (state) {
        if (state) { client.right(SPEED); } else { client.left(SPEED); }
    },
    // space
    32: function (state) {
        if (state) { client.land(); }
    },
    // shift
    16: function (state) {
        if (state) { client.takeoff(); }
    },
    // c
    67: function (state) {
        client.stop();
    },
    // q
    81: function (state) {
        if (state) { client.up(SPEED); } else { client.down(SPEED); }
    },
    // e
    91: function (state) {
        if (state) { client.down(SPEED); } else { client.up(SPEED); }
    },
    // f
    70: function (state) {
        if (state) { client.animate('flipLeft', 15); }
    }
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

var handleKey = function (key, state) {
    console.log('Got keystroke: ' + key + ' state: ' + state);
    if (actionMap.hasOwnProperty(key)) {
        actionMap[key].apply(this, [ state ]);
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

var connectVideo = function (socket) {
    paveParser.removeAllListeners();

    paveParser.on('data', function (data) {
        socket.send(data, { binary: true });
    });

    tcpVideoStream.connect(function () {
        tcpVideoStream.pipe(paveParser);
    });

    tcpVideoStream.on('error', function () {
        connectVideo(socket);
    });
};

wss.on('connection', function (socket) {
    console.log('client connected');

    connectVideo(socket);

    socket.on('message', handleClientMessage);

    client.on('navdata', function (navdata) {
        socket.send(JSON.stringify(navdata.demo));
    });
});

wss.on('close', function () {
    paveParser.removeAllListeners();
    client.removeAllListeners();
});

var application = server.listen(PORT);

console.log("DroneFromHome server listening on port %s in %s mode", PORT, app.settings.env);
