![logo](https://raw.githubusercontent.com/wiki/kcapp/smartboard/images/logo.png)
# smartboard
Integration of 
[Unicorn Smartboard](https://www.unicornsmartboard.com/smartboard.html)
&
[Granboard](https://granboards.com)
into kcapp

## Usage

To launch the service first download the dependancies with:

```
npm install
```

Then you can launch the default configuration with a Unicorn Smartboard with:

```
npm start
```

To connect to a remote kcapp server with an additional Granboard issue something like:

```
NODE_ENV="gran" UUID="f6a83f1136d3" PORT=443 KCAPP_API="remoteserver.net" PROTOCOL="https" node kcapp-smartboard
```

For detailed information and usage, see the [Wiki](https://github.com/kcapp/smartboard/wiki)

For additional information on the Granboard protocol, see [ESP32-GranBoard-Client)](https://github.com/SoftCyD/ESP32-GranBoard-Client)


### Environment variables

`KCAPP_API` Defines the server name, default: localhost <br>
`PORT` Defines the server port, default: 3000 <br>
`PROTOCOL` Defines the server protocol, default: http <br>
`UUID` Can be defined if you want to use another UUID than the one provided in the kcapp venue settings. e.g. =f6a83f1136d3 <br>
`NODE_ENV` Can be used to select which board ist installed: =prod if you want to connect a Unicorn Smartboard / =gran if you want to connect a Granboard <br>
`DEBUG` Can be used to display debug messages: =kcapp* will display all messages from kcapp services. <br>


### Connect
```javascript
const smartboard = require('./smartboard')();

// Start scanning for the board
smartboard.startScan();
// Register a connect callback, which will be called once board has been found, and connection has been established
smartboard.connect(board-uuid, (peripheral) => {
    // Initialize the board and register callbacks
    smartboard.initialize(peripheral, config.smartboard_button_number,
        (dart) => {
            // Dart throw callback
        },
        () => {
            // Button pressed callback
        }
    );
});
```

#### Values
`dart` object returned contains the following
```javascript
const dart = {
  score: int ,
  multiplier: int
};
```
`score` wil be the value of the field, correctly shifted to account for board rotation
`mulitplier` will be one the following
```
0 - single (thin)
1 - single (fat)
2 - double
3 - triple
```

### Disconnect
```javascript
smartboard.disconnect(peripheral, () => {
    // Disconnected
});
```

## Troubleshooting

On Linux it might be necessary to issue the following command:

```
sudo setcap cap_net_raw+eip $(eval readlink -f `which node`)
```

On the Pi the bluetooth module might be blocked. To unblock issue:

```
rfkill block bluetooth
rfkill unblock bluetooth
```

