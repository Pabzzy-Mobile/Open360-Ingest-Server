const fs = require("fs");

Util = {}

// TODO: Make this some kind of object that also writes a m3u8 file

/**
 * @callback writeChunkCallback
 * @param {ErrnoException|null} err
 */

/**
 *
 * @param videoChunk {string}
 * @param videoChunkCount {number}
 * @param options {Object}
 * @param options.path {string}
 * @param callback {writeChunkCallback}
 */
Util.writeVideoChunk = function (videoChunk, videoChunkCount, options, callback){
    fs.writeFile(options.path + "_" + videoChunkCount + ".ts", videoChunk, callback);
}

module.exports = Util;