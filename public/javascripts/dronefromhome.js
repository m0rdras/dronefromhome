/*jshint browser:true */
/*global Avc:true, YUVWebGLCanvas: true, Size: true, Uint8Array: true, WebSocket: true, ArrayBuffer: true, Node: true */
(function (window, document) {
    'use strict';
    var socket,
        avc,
        canvas,
        webGLCanvas,
        enabled,
        keys = {};


    function handleDecodedFrame(buffer, width, height) {
        var lumaSize = width * height,
            chromaSize = lumaSize >> 2;
        webGLCanvas.YTexture.fill(buffer.subarray(0, lumaSize));
        webGLCanvas.UTexture.fill(buffer.subarray(lumaSize, lumaSize + chromaSize));
        webGLCanvas.VTexture.fill(buffer.subarray(lumaSize + chromaSize, lumaSize + 2 * chromaSize));
        webGLCanvas.drawScene();
    }

    function setupAvc() {
        avc = new Avc();
        avc.configure({
            filter: 'original',
            filterHorLuma: 'optimized',
            filterVerLumaEdge: 'optimized',
            getBoundaryStrengthsA: 'optimized'
        });
        avc.onPictureDecoded = handleDecodedFrame;
    }

    function handleNalUnits(message) {
        avc.decode(new Uint8Array(message.data));
    }

    function setupCanvas(div) {
        var width = div.attributes.width ? div.attributes.width.value : 640,
            height = div.attributes.height ? div.attributes.height.value : 360;

        canvas = document.createElement('canvas');

        canvas.width = width;
        canvas.height = height;
        canvas.style.backgroundColor = "#333333";
        div.appendChild(canvas);

        webGLCanvas = new YUVWebGLCanvas(canvas, new Size(width, height));
    }

    function onKeyDown(event) {
        var key = (event || window.event).keyCode;
        if (!keys.hasOwnProperty(key) || keys[key] === 0) {
            keys[key] = 1;
            socket.send(JSON.stringify({ type: 'keydown', data: key }));
        }
    }

    function onKeyUp(event) {
        var key = (event || window.event).keyCode;
        keys[key] = 0;
        socket.send(JSON.stringify({ type: 'keyup', data: key }));
    }

    function onMouseMove(event) {
        var movementX = event.movementX ||
                event.mozMovementX ||
                event.webkitMovementX ||
                0,
            movementY = event.movementY ||
                event.mozMovementY ||
                event.webkitMovementY ||
                0;

        if (enabled && movementX !== 0) {
            socket.send(JSON.stringify({ type: 'mouseX', data: movementX }));
        }
        if (enabled && movementY !== 0) {
            socket.send(JSON.stringify({ type: 'mouseY', data: movementY }));
        }
    }

    function onFullscreenChange() {
        if (document.webkitFullscreenElement === canvas ||
                document.mozFullscreenElement === canvas ||
                document.mozFullScreenElement === canvas) {
            canvas.requestPointerLock = canvas.requestPointerLock ||
                canvas.mozRequestPointerLock ||
                canvas.webkitRequestPointerLock;
            canvas.requestPointerLock();
        }
    }

    function onPointerLockChange() {
        if (document.mozPointerLockElement === canvas ||
                document.webkitPointerLockElement === canvas) {
            console.log("Pointer Lock was successful.");
            enabled = true;
        } else {
            console.log("Pointer Lock was lost.");
            enabled = false;
        }
    }

    function onPointerLockError() {
        console.log("Error while locking pointer.");
        enabled = false;
    }

    function clearKeys() {
        var key;
        for (key in keys) {
            if (keys.hasOwnProperty(key) && keys[key] === 1) {
                onKeyUp({ keyCode: key });
            }
        }
    }

    function lockPointer() {
        canvas.requestFullscreen = canvas.requestFullscreen    ||
            canvas.mozRequestFullscreen ||
            canvas.mozRequestFullScreen ||
            canvas.webkitRequestFullscreen;
        canvas.requestFullscreen();
    }

    function handleNavData(msg) {
        var navData = JSON.parse(msg.data), value, td;

        for (value in navData) {
            if (navData.hasOwnProperty(value)) {
                td = document.querySelector('#' + value);
                if (td instanceof Node) {
                    td.innerHTML = navData[value];
                }
            }
        }
    }

    function onServerMessage(msg) {
        if (msg.data instanceof ArrayBuffer) {
            handleNalUnits(msg);
        } else {
            handleNavData(msg);
        }
    }

    window.DroneFromHome = function (div) {
        setupCanvas(div);
        setupAvc();

        socket = new WebSocket(
            'ws://' +
                window.document.location.hostname + ':' +
                window.document.location.port
        );
        socket.binaryType = 'arraybuffer';
        socket.onmessage = onServerMessage;

        socket.onopen = function () {
            document.addEventListener('keydown', onKeyDown, false);
            document.addEventListener('keyup', onKeyUp, false);
            document.addEventListener('mousemove', onMouseMove, false);
        };

        window.onblur = clearKeys;

        document.addEventListener('fullscreenchange', onFullscreenChange, false);
        document.addEventListener('mozfullscreenchange', onFullscreenChange, false);
        document.addEventListener('webkitfullscreenchange', onFullscreenChange, false);

        document.addEventListener('pointerlockchange', onPointerLockChange, false);
        document.addEventListener('mozpointerlockchange', onPointerLockChange, false);
        document.addEventListener('webkitpointerlockchange', onPointerLockChange, false);

        document.addEventListener('pointerlockerror', onPointerLockError, false);
        document.addEventListener('mozpointerlockerror', onPointerLockError, false);
        document.addEventListener('webkitpointerlockerror', onPointerLockError, false);

        canvas.addEventListener('click', lockPointer, false);
    };
}(window, document));
