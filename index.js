let smartcast = require('vizio-smart-cast');

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-vizio-smartcast", "SickleDisplay", VizioSwitch);
}

function VizioSwitch(log, config) {
  this.log = log;
  this.switchService = new Service.Switch(this.name);

  this.name = config["name"];
  this.authToken = config["authToken"];
  this.ipAddress = config["ipAddress"];
  this.model = ""
  this.mfg = ""

  if (typeof this.configIpAddress === "undefined") {
    this.discover();
  }

  this.tv = new smartcast(this.ipAddress, this.authToken);

  // TODO: what if this.tv is invalid?
}

VizioSwitch.prototype.getPowerState = function (callback) {
  if (typeof this.configIpAddress === "undefined") {
    this.discover();
  }

  this.tv.power.currentMode().then((data) => {
    callback(null, (data.ITEMS[0].VALUE == 1));
  });
}

VizioSwitch.prototype.getMuteState = function (callback) {
  if (typeof this.configIpAddress === "undefined") {
    this.discover();
  }

  this.tv.control.volume.getMuteState().then((data) => {
    callback(null, data.ITEMS[0].ENABLED == "TRUE");
  });
}

// Used for volume "power" right now
VizioSwitch.prototype.alwaysTrueState = function (callback) {
  if (typeof this.configIpAddress === "undefined") {
    this.discover();
  }
  callback(null, true)
}

VizioSwitch.prototype.setMuteState = function (mute, callback) {
  if (typeof this.configIpAddress === "undefined") {
    this.discover();
  }

  if (mute) {
    this.tv.control.volume.mute();
  } else {
    this.tv.control.volume.unmute();
  }

  callback(); // success
}

VizioSwitch.prototype.getVolumeState = function (callback) {
  if (typeof this.configIpAddress === "undefined") {
    this.discover();
  }

  this.tv.control.volume.get().then((data) => {
    callback(null, data.ITEMS[0].VALUE);
  });
}

VizioSwitch.prototype.setVolumeState = function (volume, callback) {
  if (typeof this.configIpAddress === "undefined") {
    this.discover();
  }

  this.tv.control.volume.set(volume).then((data) => {
    callback(null, (data.ITEMS[0].VALUE == volume));
  });
}

VizioSwitch.prototype.setPowerState = function (powerOn, callback) {
  if (typeof this.configIpAddress === "undefined") {
    this.discover();
  }

  if (powerOn) {
    this.tv.control.power.on()
  } else {
    this.tv.control.power.off()
  }
  callback(); // success
}

VizioSwitch.prototype.discover = function () {
  smartcast.discover((device) => {
    if (this.ipAddress.localeCompare(device.ip) == 0) {
      this.tv = new smartcast(device.ip, this.authToken);
      this.model = device.model;
      this.mfg = device.manufacturer
    } else {
      this.log("TODO: did not match config IP")
    }
  });
}

VizioSwitch.prototype.getServices = function () {
  var informationService = new Service.AccessoryInformation();
  informationService
      .updateCharacteristic(Characteristic.Manufacturer, this.mfg)
      .updateCharacteristic(Characteristic.Model, this.model);

  // Power is just a switch, not depending on volume
  var powerService = new Service.Switch(this.name + " power", "power")
  powerService
  .getCharacteristic(Characteristic.On)
                .on("get", this.getPowerState.bind(this))
                .on("set", this.setPowerState.bind(this));

  // Volume is a lightbulb since homekit doesnt properly support speakers
  var volumeService = new Service.Lightbulb(this.name + " volume");
  volumeService
                .addCharacteristic(new Characteristic.Brightness())
                .on('get', this.getVolumeState.bind(this))
                .on('set', this.setVolumeState.bind(this));
  // Without this always being "on" the device will not show volume percent
  volumeService
                .getCharacteristic(Characteristic.On)
                .on("get", this.alwaysTrueState.bind(this));

  // Mute is a switch since homekit doesnt properly support speakers
  var muteService = new Service.Switch(this.name + " speakers", "mute")
  muteService
                .getCharacteristic(Characteristic.On)
                .on("get", this.getMuteState.bind(this))
                .on("set", this.setMuteState.bind(this));

  return [informationService, powerService, volumeService, muteService];
}