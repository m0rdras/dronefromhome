var express = require('express'),
    arDrone = require('ar-drone'),
    fs = require('fs'),
    path = require('path'),
    ffmpeg = require('fluent-ffmpeg');

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


function sendStream(req, res) {
    var filePath = path.join(__dirname, 'demo.webm'),
        stat = fs.statSync(filePath),
        readStream;

    console.log('streaming ' + filePath + ' size: ' + stat.size);

    res.set({
        'Content-Type': 'video/webm',
        'Content-Length': stat.size
    });

    readStream = fs.createReadStream(filePath);
    readStream.on('data', function (data) {
        res.write(data);
    });

    readStream.on('end', function () {
        console.log('input stream finished');
        res.end();
    });
}



app.get('/', function (req, res) {
    res.render('index');
});


app.get('/stream', sendStream);


var server = app.listen(PORT);

console.log("Express server listening on port %s in %s mode", PORT, app.settings.env);
