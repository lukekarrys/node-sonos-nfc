# node-sonos-nfc

Originally forked from [ryanold's node-sonos-nfc](https://github.com/ryanolf/node-sonos-nfc). This is a rewrite with only the features I needed (no included HTTP API).

## Card reader setup

This program uses the [nfc-pcsc] library to read (and someday?) write to PC/SC compatible smart card readers. The library is tested with the ACR122U but _should_ work with any PC/SC compatible reader. Instructions here are mainly focused on ACR122U because that's what has been tested.

Make sure your card reader can be detected by your system by installing drivers as needed. For ACR122U on Ubuntu/Debian/Raspberry Pi OS:

```
$ sudo apt install libacsccid1
```

You also need to make sure your computer can speak PC/SC. In Ubuntu/Debian, install PC/SC libraries and daemon. You'll need to have a suitable build environment setup, e.g. have gcc installed. See the [node-pcsclite](https://github.com/pokusew/node-pcsclite) instructions if you have any issues.

```
$ sudo apt install libpcsclite1 libpcsclite-dev pcscd
```

If you're running a version of Linux, your computer may try to use the nfc kernel module to talk to tyour ACR122U. You don't want it to do this, so make sure the nfc and enabling modules are not loaded. In Ubuntu/Debian/Raspberry Pi OS, blacklist pn533, pn533_usb, nfc modules so that they don't hijack the card reader.

```
$ printf '%s\n' 'pn533' 'pn533_usb' 'nfc' | sudo tee /etc/modprobe.d/blacklist-nfc.conf
```

To make sure everything is square, it's probably a good idea to reboot. In Ubuntu/Debian/Raspberry Pi OS:

```
$ sudo reboot
```

## Run all the time

To run continuously and at boot, you'll want to run under some supervisor program. There are lots of options, like systemd (built-in already), supervisord, and pm2. I have found pm2, recommended by the author of Vinyl Emulator, to be very easy to use. To have pm2 spin-up sonos_nfc at boot and keep it
running, install pm2 globally:

```
$ sudo npm install -g pm2
```

and spin-up sonos_nfc and sonos-http-api:

```
$ pm2 start npm -- run start-all
```

Then, to configure your system to run the startup, follow the instructions given when you run

```
$ pm2 startup
```

e.g.

```
$ sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u pi --hp /home/pi
```

If you already have the http API running elsewhere, you can direct this program to that server via the `usersettings.json` and instead run just this program via `npm start`, so replace the `pm2 start` command above with

```
$ pm2 start npm -- start
```

## Debug

You can monitor the process output to see what's going on. If you're using pm2, you can see the process output via

```
$ pm2 log
```
