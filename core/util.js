const fs = require("fs");

/**
 * Cuts up a string into an array on new line chars
 * @param {string} string
 * @return {string[]}
 */
let diceUp = function (string){
    return string.split("\n");
}

/**
 * Returns the value after the ":" symbol of a string
 * @param {string} string
 * @return {string}
 */
let getValue = function (string){
    return string.substring(string.indexOf(":"))
}

/**
 * Generates a random string of the desired length
 * @param length
 * @return {string}
 */
let generateString = function (length){
    let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return generateSet(length, characters)
}

/**
 * Generates a random string of the desired length
 * @param length
 * @return {string}
 */
let generateNumber = function (length){
    let characters = "0123456789";
    return Util.generateSet(length, characters)
}

/**
 * Generates a random string of characters from a set
 * @param {number} length
 * @param {string} set - string defining what the output string will be composed of
 * @return {string}
 */
let generateSet = function (length, set){
    let result           = '';
    let setLength = set.length;
    for ( let i = 0; i < length; i++ ) {
        result += set.charAt(Math.floor(Math.random() * setLength));
    }
    return result;
}

/**
 * @param {String} streamKey
 * @return {Promise<void>}
 */
function makeVOD(streamKey) {
    return new Promise((resolve) => {
        let actualPath = "./video_database/live/" + streamKey;
        let vodPath = "./video_database/video/" + streamKey;
        let dir = fs.readdirSync(actualPath);
        let files = dir.filter((file) => isSegmentFile(file));
        for (let i = 1; i <= files.length; i++) {
            // Get the file and the extension
            let file = files[i - 1].split(".");
            let fileExtension = "." + file[file.length - 1];
            // Make sure the directory exists
            if (!fs.existsSync(vodPath)) fs.mkdirSync(vodPath);
            // Define the source and destination
            let source = actualPath + "/" + files[i - 1];
            let destination = vodPath + "/index" + fileExtension;
            console.log("Making vod from", source, "to", destination);
            // Copy the vod from the live folder to the vod folder
            // WARN This is not working, the destination file does not play
            fs.copyFile(source, destination, (err) => {
                if (err) console.error(err);
                console.log("Done copying vod to", destination);
                // Delete the live file
                fs.unlink(actualPath + "/" + files[i - 1], () => {
                    console.log("Deleted origin vod", source);
                });
                if (i === files.length){
                    resolve();
                }
            });
        }
    });
}

/**
 * @param {String} str
 */
let isSegmentFile = (str) => str.endsWith(".mp4") || str.endsWith(".png");

module.exports = {
    diceUp,
    generateNumber,
    generateString,
    getValue,
    generateSet,
    makeVOD
};