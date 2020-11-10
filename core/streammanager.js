const {generateNumber, GrowList, FixedList} = require("./util.js");
const {CommandProfile, createCommand} = require('./commandparser.js')
const execa = require('execa');
let profiles = require("../config/profiles.json").profiles;

/**
 * @type {Object} StreamManager
 * @property {StreamList[]} StreamLists
 * @property {number[]} UsedPorts
 * @property {GrowList} UsedTranscoders
 * @property {number[]} FreeTranscoders
 */
class StreamManager {
    constructor() {
        this.StreamLists = [];
        this.UsedPorts = [];
        this.UsedTranscoders = new GrowList(0);
        this.FreeTranscoders = [];
    }

    async CreateNewStream(streamId){
        let port = this.GetUniquePort();
        let profile = new CommandProfile(profiles["FFmpeg-transcode-720p"]);
        let command = createCommand(profile, [port, streamId, streamId + "_playlist"]);
        let transcoder = execa.command(command);
        console.log(transcoder.stdout);
    }

    /**
     * Returns a unique port not used by this StreamManager
     * @return {number}
     * @constructor
     */
    GetUniquePort() {
        let port = parseInt(generateNumber(4));
        if (port < 4000 || 8000 < port || this.UsedPorts.includes(port)){
            port = this.GetUniquePort();
        }
        return port;
    }

    /**
     * Returns the StreamPath matching the specified id
     * @param {string} streamId - the identifier of the stream
     * @return {?StreamPath}
     */
    GetStreamPath(streamId){
        for (let i = 0; i < this.StreamLists.length; i++){
            let currentList = this.StreamLists[i];
            let foundPath = currentList.GetStreamPath(streamId);
            if (foundPath !== null) return foundPath;
        }
    }
}

/**
 * @type {Object} StreamList
 * @property {number} Port
 * @property {FixedList} StreamPaths - list containing all the StreamPaths
 * @property {number} Capacity - maximum amount of StreamPaths this list can have
 */
class StreamList {
    /**
     *
     * @param {number} capacity - limit to the amount of StreamPath
     */
    constructor(capacity) {
        this.Port = 0;
        this.StreamPaths = new FixedList(capacity);
    }

    /**
     * Adds a StreamPath to the list
     * @param {StreamPath} streamPath
     * @return {boolean} - returns false if this StreamList is full
     */
    Add(streamPath){
        return this.StreamPaths.Add(streamPath);
    }

    /**
     * @param {string} streamId
     * @return {?StreamPath}
     * @constructor
     */
    GetStreamPath(streamId){
        for (let i = 0; i < this.StreamPaths.length; i++){
            let currentStream = this.StreamPaths.Items[i];
            if (currentStream.StreamId === streamId){
                return currentStream;
            }
        }
    }

    /**
     * Returns true if the list is full
     * @return {boolean}
     */
    isFull(){
        return this.StreamPaths.isFull();
    }
}

/**
 * @type {Object} StreamPath
 * @property {string} StreamId - the identifier of the stream, this is used to find the stream using the StreamManager
 * @property {string} Path - Describes the path of this stream
 * @property {boolean} Alive - Determines if this path is still alive
 */
class StreamPath {
    constructor() {
        this.StreamId = "";
        this.Path = "";
        this.Alive = false;
    }

    die(){
        this.Alive = false;
    }
}

module.exports = {
    StreamManager,
    StreamList,
    StreamPath
}