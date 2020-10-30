/**
 * @type {Error} ArgsAmountError
 */
class ArgsAmountError {
    /**
     * @param {string} errorMessage
     * @return {Error}
     */
    constructor (errorMessage){
        return new Error(errorMessage);
    }
}

/**
 * @type {Object} CommandProfile - describes a command profile
 * @property {string[]} options - array describing what each option is
 * @property {string} command - string to format with the options
 */
class CommandProfile {
    /**
     * @param {Object} obj
     * @param {string} obj.command - the un-formatted string
     * @param {string[]} obj.options - names of the arguments
     */
    constructor (obj){
        obj && Object.assign(this, obj);
    }
}

/**
 * Creates a command string with the profile and options given
 * @param {CommandProfile} profile - the command to use
 * @param {string[]} options - array describing the replacement variables in the command
 * @return {string}
 */
function createCommand(profile, options){
    let command = profile.command;
    if (profile.options.length !== options.length) {
        throw new ArgsAmountError("Incorrect amount of arguments passed, expected " + profile.options.length + ", " + options.length + "were given");
    }
    // "..." is the ES6 operator to iterate through each value in the array and pass it as a parameter
    command = formatString(command, ...options);
    return command;
}

/**
 * Formats a string in a C-like syntax
 * @param {string} format - the string to format
 * @param {arguments} arguments - the arguments to replace the `{n}` in the string
 * @return {string}
 */
function formatString(format) {
    let args = Array.prototype.slice.call(arguments, 1);
    return format.replace(/{(\d+)}/g, function(match, number) {
        return typeof args[number] != 'undefined'
            ? args[number]
            : match
            ;
    });
}

module.exports = {
    ArgsAmountError,
    CommandProfile,
    createCommand,
    formatString
};