$(document).ready(function() {
  // Enable WEBMIDI.js and trigger the onEnabled() function when ready
  WebMidi
    .enable()
    .then(onEnabled)
    .catch(err => alert(err));

  var ips = ["10.42.0.113","10.42.0.19","10.42.0.42","10.42.0.212"];
  var endpoint = "http://" + ips[0] + "/json";
  var info =  {};
  $("#ips").val(ips.join("\n"));

  $(document).on('change keyup paste', '#ips', (function() {
    ips = $(this).val().split(/,|\n/);
    endpoint = "http://" + ips[0] + "/json";
    getInfo();
  }));

  $("#ips").change();

  function getInfo(){
    $.ajax({
      dataType: "json",
      url: endpoint,
      method: "GET",
      success: function(data){
        info = data;
        console.log(info);
        printSummary(data);
      },
      contentType: 'application/json'
    });
  }



  function printSummary(info) {
    fxIndex = info['state']['seg'][0]['fx'];
    updateFx(fxIndex);

    palIndex = info['state']['seg'][0]['pal'];
    updatePal(palIndex);

    return null;
  }

  function updatePal(index){
    if(index == null){
      value = `Macro sent last`
    }else{
      value = `${index}: ${info['palettes'][index]}`
    }
    
    $("#pal").val(value);
    console.log(`Palette ${value}`);
  }

  function updateFx(index){
    if(index == null){
      value = `Macro sent last`
    }else{
      value = `${index}: ${info['effects'][index]}`
    }
  
    $("#fx").val(value);
    console.log(`FX ${value}`);
  }

  function rescale(value, newMax=255) {
    return parseInt(newMax*value)
  }

  function translateBool(value){
    if(value == 0 ){
      return false;
    }else{
      return true;
    }
  }

  var colorValues = [100, 0, 0, 0, 0, 0, 0, 0, 0]

  var colorMap = {
    19: 0,
    20: 1,
    21: 2,
    23: 3,
    24: 4,
    25: 5,
    27: 6,
    28: 7,
    29: 8
  }

  var rotaryMap = {
    '14': 'bri',
    '17': 'transition'
  }

  var segmentRotaryMap = {
    '15': 'sx',
    '16': 'ix'
  }

  function rotaryControl(command,value){
    change = {}
    mapping = segmentRotaryMap[command];

    if(mapping){
      change[mapping] = rescale(value)
      return {seg: change};
    }

    mapping = rotaryMap[command];
    if(mapping){
      change[mapping] = rescale(value);
      return change;
    }

    if (command in colorMap){

      colorValues[colorMap[command]] = Math.round(rescale(value));
      console.log(colorValues);

      state = {
        seg: {
          col: [
            colorValues.slice(0,3),
            colorValues.slice(3,6),
            colorValues.slice(6,9)
          ]
        }
      }
      return state;
    }else{
      return null;
    }
  }

  var effects = {
    105: '~-',
    106: '~',
    46: 0,
    47: 2,
    48: 3,
    49: 12,
    50: 16,
    51: 23,
    52: 41,
    53: 44,
    54: 72,
    55: 129,
    56: 134,
    57: 93,
    58: 21
  }

  var booleanTriggers = {
    108: 'on',
    104: 'rb'
  }

  // Unfortunately only taargets the primary segment
  // var segmentBooleanTriggers = {
  //   109: 'frz'
  // }

  var macros = {
    63: [
      {
        tt: 0,
        seg:{
          col: [[255,255,255],[0,0,0],[0,0,0]],
          fx: 0
        }
      },
      {
        tt: 2,
        seg:{
          col: [[0,0,0],[0,0,0],[0,0,0]],
          fx: 0
        }
      }
    ]
  }

  function triggerControl(command, value){
    if(command in effects){
      mapping = effects[command];
      updateFx(mapping);
      return {seg: {fx: mapping}};
    }

    if(command in booleanTriggers){
      var change = {};
      mapping = booleanTriggers[command];
      change[mapping] = translateBool(value);
      return change;
    }

    // if(command in segmentBooleanTriggers){
    //   var change = {};
    //   mapping = segmentBooleanTriggers[command];
    //   change[mapping] = translateBool(value);
    //   return {seg: change, 'udpn.send': true};
    // }

    return null;
  }

  // function constructState(command, value){
  //   return rotaryControl(command,value) || triggerControl(command);
  // }

  // Function triggered when WEBMIDI.js is ready
  function onEnabled() {

    // Display available MIDI input devices
    if (WebMidi.inputs.length < 1) {
      $("#device").val("No device detected.");
    } else {
      $("#device").val(WebMidi.inputs[0].name);
    }

    const mySynth = WebMidi.inputs[0];
    
    mySynth.channels[1].addListener("noteon", e => {
      var value = e.rawData[1] - 12; // reset back down to Zero-index
      if(value <= 70){
        state =  {
          seg: {pal: value}
        }
        updatePal(value);
        return sendRequest(state, false);
      }
      return null;
    });

    

    mySynth.channels[1].addListener("controlchange", e => {
      console.log `${e.type}`;
      console.log `${e.value}`;
      console.log `${e}`;
      var index = e.rawData[1];
      var rawValue = e.rawData[2];

      // diagnostic request for state
      if(index == 85){
        return getInfo();
      }

      var state = rotaryControl(index, e.value);
      if (state){
        return sendRequest(state, e.value != 0);
      }

      state = triggerControl(index, rawValue);
      if (state){
        return sendRequest(state, false);
      }

      if(index in macros){
        updateFx();
        updatePal();
        
        states = macros[index];
        sendRequest(states[0], false);
        setTimeout(function() {
          sendRequest(states[1], false);
        }, 50)
      }
    });

    var inProgress = false;
    var requestCompletion = [];

    function sendRequest(state, wait){
      
      if (!wait || (!inProgress && wait)){
        inProgress = true;

        $.each(ips, function(index, ip) {
          var address = "http://" + ips[index] + "/json";

          $.ajax({
            dataType: "json",
            url: address,
            data: JSON.stringify(state),
            method: "POST",
            beforeSend: function(){
              requestCompletion[index] = 0;
            },
            complete: function(){
              requestCompletion[index] = 1;
              if (requestCompletion.every( e  => e == 1)){
                inProgress = false
              }
            },
            contentType: 'application/json'
          });
        });
      } else {
        console.log('network requests in progress, skipping');
      }
    }

  }
})