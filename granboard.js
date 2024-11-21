var debug = require('debug')('kcapp-granboard:board');
var noble = require('@abandonware/noble');

/** List containing all the messages send by the board. Used to translate to score and multiplier values. */
const BOARD = ["4.0@", "8.0@", "3.3@", "3.4@", "3.5@", "3.6@", "2.3@", "2.4@", "2.5@", "2.6@",
                                  "1.2@", "1.4@", "1.5@", "1.6@", "0.1@", "0.3@", "0.5@", "0.6@", "0.0@", "0.2@",
                                  "0.4@", "4.5@", "1.0@", "1.1@", "1.3@", "4.4@", "2.0@", "2.1@", "2.2@", "4.3@",
                                  "3.0@", "3.1@", "3.2@", "4.2@", "9.1@", "9.0@", "9.2@", "8.2@", "10.1@", "10.0@",
                                  "10.2@", "8.3@", "7.1@", "7.0@", "7.2@", "8.4@", "6.1@", "6.0@", "6.3@", "8.5@",
                                  "11.1@", "11.2@", "11.4@", "8.6@", "11.0@", "11.3@", "11.5@", "11.6@", "6.2@", "6.4@",
                                  "6.5@", "6.6@", "7.3@", "7.4@", "7.5@", "7.6@", "10.3@", "10.4@", "10.5@", "10.6@",
                                  "9.3@", "9.4@", "9.5@", "9.6@", "5.0@", "5.3@", "5.5@", "5.6@", "5.1@", "5.2@", "5.4@", "4.6@", "BTN@", "OUT@"];

const VALUES = ["25-2", "25-0", "20-0", "20-3", "20-1", "20-2", "1-0", "1-3", "1-1", "1-2",
                                    "18-0", "18-3", "18-1", "18-2", "4-0", "4-3", "4-1", "4-2", "13-0", "13-3",
                                    "13-1", "13-2", "6-0", "6-3", "6-1", "6-2", "10-0", "10-3", "10-1", "10-2",
                                    "15-0", "15-3", "15-1", "15-2", "2-0", "2-3", "2-1", "2-2", "17-0", "17-3",
                                    "17-1", "17-2", "3-0", "3-3", "3-1", "3-2", "19-0", "19-3", "19-1", "19-2",
                                    "7-0", "7-3", "7-1", "7-2", "16-0", "16-3", "16-1", "16-2", "8-0", "8-3",
                                    "8-1", "8-2", "11-0", "11-3", "11-1", "11-2", "14-0", "14-3", "14-1", "14-2",
                                    "9-0", "9-3", "9-1", "9-2", "12-0", "12-3", "12-1", "12-2", "5-0", "5-3", "5-1", "5-2", "BTN", "OUT"];
                                  
/** Service containing board characteristics */
const SERVICE_SCORING = "442f15708a009a28cbe1e1d4212d53eb";
/** Characteristic to subscribe to throw notifications */
const CHARACTERISTIC_THROW_NOTIFICATIONS = "442f15718a009a28cbe1e1d4212d53eb";

/**
 * Translate the given message
 * @param {string} message - Message sent by board
 */
function translate(message) {
    for (let i = 0; i < BOARD.length+1; i++) {
            if (i == BOARD.length) {
              return "ERROR";
            } else if (BOARD[i] === message) {
              return VALUES[i];
            }
    }
}

/**
 * Start scanning for the board
 */
exports.startScan = () => {
  debug("Started scanning for board");
  noble.startScanning();
}

/**
 * Connect to the dart board
 * This method will add a callback to the discover method for bluetooth,
 * and check all peripherals found until it finds one matching the UUID
 * we are looking for
 *
 * @param {string} uuid - UUID of smartboard to connect to
 * @param {function} callback - Callback when dart is thrown
 */
exports.connect = (uuid, callback) => {
  this.discoverCallback = (peripheral) => {
    if (peripheral.uuid === uuid) {
      callback(peripheral);
      debug("Found device, stopped scanning");
      noble.stopScanning();
      this.peripheral = peripheral;
    }
  };
  noble.on('discover', this.discoverCallback);
}

/**
 * Initialize the dart board, by setting up notification listeners
 * for darts thrown, and button presses
 *
 * @param {object} - Peripheral object to initialize
 * @param {int} - Number next to the board button
 * @param {function} - Callback when dart is thrown
 * @param {function} - Callback when button is pressed
 */
exports.initialize = (peripheral, buttonNumber, throwCallback, playerChangeCallback) => {
  peripheral.connect((error) => {
    if (error) {
      debug(`ERROR: ${error}`);
    }
    debug(`Connected to ${peripheral.advertisement.localName} (${peripheral.uuid})`);

    // Get the scoring service
    peripheral.discoverServices([SERVICE_SCORING], (error, services) => {
      if (error) {
        debug(`ERROR: ${error}`);
      }

      var scoringService = services[0];
      scoringService.discoverCharacteristics([CHARACTERISTIC_THROW_NOTIFICATIONS], (error, characteristics) => {
        if (error) {
          debug(`ERROR: ${error}`);
        }
        
        // Subscribe to throw notifications
        var throwNotifyCharacteristic = characteristics[0];
        throwNotifyCharacteristic.subscribe((error) => {
          if (error) {
            debug(`ERROR: ${error}`);
          }
          debug('Subscribed to throw notifications!');
        });

        throwNotifyCharacteristic.on('data', (data, isNotification) => {
          var rawValue = data.toString();
          var value = translate(rawValue);
          if (value == "BTN") {
            playerChangeCallback();
          } else if (value == "ERROR") {
            debug(`Message from board could not be translated: ${rawValue}`);
          } else {
              var dart = {
                score: parseInt(value.split("-")[0]),
                multiplier: parseInt(value.split("-")[1])
              };
              throwCallback(dart);
          }
        });
        this.throwNotifyCharacteristic = throwNotifyCharacteristic;
      });
    });
  });
}

/**
 * Disconnect from the connected peripheral
 * @param {object} - Connected peripheral
 * @param {function} - Callback onces disconnected
 */
exports.disconnect = (peripheral, callback) => {
  debug(`Removing 'discover' callback`);
  noble.removeListener('discover', this.discoverCallback);

  if (this.throwNotifyCharacteristic) {
    this.throwNotifyCharacteristic.unsubscribe((error) => {
      if (error) {
        debug(`ERROR: ${error}`);
      }
      debug(`Unsubscribed from throw notifications`);
    });
  }
  if (this.buttonCharacteristic) {
    this.buttonCharacteristic.write(new Buffer([0x02]), true, (error) => {
      if (error) {
        debug(`ERROR: ${error}`);
      }
      debug(`Disabled listening on characteristic ${CHARACTERISTIC_BUTTON}`);
      peripheral.disconnect((error) => {
        if (error) {
          debug(`ERROR: ${error}`);
        }
        debug(`Disconnected from ${peripheral.advertisement.localName}`);
        if (callback) {
          callback();
        }
      });
    });
  }
}

function interrupt() {
  if (this.peripheral) {
    debug("Caught interrupt signal, Disconnecting...");

    this.disconnect(() => {
      process.exit();
    });

    // Give the board 3 seconds to disconnect before we die....
    setTimeout(() => {
      process.exit();
    }, 3000);
  } else {
    process.exit();
  }
}

/**
 * Configure the smartboard module
 */
module.exports = () => {
  process.on('SIGINT', interrupt.bind(this));
  return this;
};
