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
  if (typeof this.configIpAddress === "undefined") {
    this.discover();
  }

  // TODO: validate config before using it
  // TODO: find the IP from name discovery if it isn't specified

  this.tv = new smartcast(this.ipAddress, this.authToken);

  // TODO: what if this.tv is invalid?
}

VizioSwitch.prototype.getPowerState = function (callback) {
  this.log("TODO: getPowerState");
  if (typeof this.configIpAddress === "undefined") {
    this.discover();
  }

  this.tv.power.currentMode().then((data) => {
    this.log("tv.power.currentMode() = ", data);
    callback(null, (data.ITEMS[0].VALUE == 1));
  });
}

VizioSwitch.prototype.getMuteState = function (callback) {
  this.log("TODO: getMuteState");
  if (typeof this.configIpAddress === "undefined") {
    this.discover();
  }

  this.tv.control.volume.getMuteState().then((data) => {
    this.log("tv.controle.volume.getMuteState() = ", data);
    callback(null, data.ITEMS[0].ENABLED == "TRUE");
  });
}

VizioSwitch.prototype.setMuteState = function (mute, callback) {
  this.log("TODO: setMuteState");
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
  this.log("TODO: getVolumeState");
  if (typeof this.configIpAddress === "undefined") {
    this.discover();
  }

  this.tv.control.volume.get().then((data) => {
    this.log("tv.controle.volume.get() = ", data);
    callback(null, data.ITEMS[0].VALUE);
  });
}

VizioSwitch.prototype.setVolumeState = function (volume, callback) {
  this.log("TODO: setVolumeState");
  if (typeof this.configIpAddress === "undefined") {
    this.discover();
  }

  this.tv.control.volume.set(volume).then((data) => {
    this.log("tv.controle.volume.set() = ", data);
    callback(null, (data.ITEMS[0].VALUE == volume));
  });
}

VizioSwitch.prototype.setPowerState = function (powerOn, callback) {
  this.log("TODO: setPowerState ", powerOn);
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

VizioSwitch.prototype.identify = function (callback) {
  this.log("identify");

  if (typeof this.configIpAddress === "undefined") {
    this.discover();
  }

  this.tv.control.volume.toggleMute();
  callback(); // success
}

VizioSwitch.prototype.discover = function () {
  // TODO: how do we handle more than one device found.
  smartcast.discover((device) => {
    if (this.name.localeCompare(device.name) == 0) {
      this.log("TODO: discover found device: ", device);
      this.tv = new smartcast(device.ip, this.authToken);
      this.model = device.model;
    } else {
      this.log("TODO: discover wrong name", device.name, "not", this.name);
    }
  });
  
  // Example output:
  // {
  //     ip: '192.168.0.131',
  //     name: 'Living Room',
  //     manufacturer: 'VIZIO',
  //     model: 'P65-C1'
  // }
}

VizioSwitch.prototype.getServices = function () {
  var informationService = new Service.AccessoryInformation();

  informationService
    .setCharacteristic(Characteristic.Manufacturer, "Vizio")
    .setCharacteristic(Characteristic.Model, this.model)
    .setCharacteristic(Characteristic.SerialNumber, "TODO Serial Number");

  var speakerService = new Service.Speaker(this.name);
  speakerService
                .addCharacteristic(new Characteristic.On())
                .on("get", this.getPowerState.bind(this))
                .on("set", this.setPowerState.bind(this));

  speakerService.addCharacteristic(new Characteristic.Volume())
            .on("get", this.getVolumeState.bind(this))
            .on("set", this.setVolumeState.bind(this));

  speakerService.getCharacteristic(Characteristic.Mute)
  .on("get", this.getMuteState.bind(this))
  .on("set", this.setMuteState.bind(this));

  return [informationService, speakerService];
}