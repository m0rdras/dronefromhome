'use strict';

var HORIZONTAL_SPEED = 0.3,
    VERTICAL_SPEED = 0.8;

module.exports = {
    // w
    87: function (client, state) {
        if (state) { client.front(HORIZONTAL_SPEED); } else { client.front(0.0); }
    },
    // s
    83: function (client, state) {
        if (state) { client.back(HORIZONTAL_SPEED); } else { client.back(0.0); }
    },
    // a
    65: function (client, state) {
        if (state) { client.left(HORIZONTAL_SPEED); } else { client.left(0.0); }
    },
    // d
    68: function (client, state) {
        if (state) { client.right(HORIZONTAL_SPEED); } else { client.right(0.0); }
    },
    // space
    32: function (client, state) {
        if (state) { client.land(); }
    },
    // shift
    16: function (client, state) {
        if (state) { client.takeoff(); }
    },
    // c
    67: function (client) {
        client.stop();
    },
    // f
    70: function (client, state) {
        if (state) { client.animate('flipLeft', 15); }
    },
    // right arrow
    39: function (client, state) {
        if (state) { client.clockwise(VERTICAL_SPEED); } else { client.clockwise(0.0); }
    },
    // left arrow
    37: function (client, state) {
        if (state) { client.counterClockwise(VERTICAL_SPEED); } else { client.counterClockwise(0.0); }
    },
    // up arrow
    38: function (client, state) {
        if (state) { client.up(VERTICAL_SPEED); } else { client.up(0.0); }
    },
    // down arrow
    40: function (client, state) {
        if (state) { client.down(VERTICAL_SPEED); } else { client.down(0.0); }
    }
};