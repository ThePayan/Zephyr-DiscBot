const colors = require('colors');

colors.enable();

const logger = {
    info: (msg) => console.log(`[INFO]`.blue, msg),
    warn: (msg) => console.warn(`[WARN]`.yellow, msg),
    error: (msg, err) => console.error(`[ERROR]`.red, msg.red, err || ''),
    debug: (msg) => console.debug(`[DEBUG]`.green, msg.yellow),
    
    // Custom method for the specific startup message
    loggedIn: (tag) => console.log(`[RUNNING]`.green, `Logged in as`.magenta, tag.yellow)
};

module.exports = logger;
