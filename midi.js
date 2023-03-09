$(document).ready(function() {
  // Enable WEBMIDI.js and trigger the onEnabled() function when ready
  WebMidi
    .enable()
    .then(onEnabled)
    .catch(err => alert(err));

  var ip = "10.42.0.113";
  var endpoint = "http://" + ip + "/json";
  var info =  {};
  $("#host").val(ip);

  $(document).on('change keyup paste', '#host', (function() {
    ip = $(this).val();
    endpoint = "http://" + ip + "/json";
    getInfo();
  }));

  $("#host").change();

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

  var rotaryMap = {
    '14': 'bri',
    '15': 'sx',
    '16': 'ix',
    '17': 'transition'
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

  function printSummary(info) {
    fxIndex = info['state']['seg'][0]['fx'];
    updateFx(fxIndex);


    palIndex = info['state']['seg'][0]['pal'];
    updatePal(palIndex);

    return null;
  }

  function updatePal(index){
    value = `${index}: ${info['palettes'][index]}`
    $("#pal").val(value);
    console.log(`Palette ${value}`);
  }

  function updateFx(index){
    value = `${index}: ${info['effects'][index]}`
    $("#fx").val(value);
    console.log(`FX ${value}`);
  }

  function rescale(value, newMax=255) {
    return parseInt(newMax*value)
  }

  function rotaryControl(command,value){
    change = {}
    mapping = rotaryMap[command];
    if(mapping){
      change[mapping] = rescale(value);
      return {seg: change};

    // color controls
    }else if (command in colorMap){

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

  function triggerControl(command){
    mapping = effects[command];
    if(command in effects){
      updateFx(mapping);
      return {seg: {fx: mapping}};
    }else{
      return null;
    }
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

    var inProgress = false;

    mySynth.channels[1].addListener("controlchange", e => {
      console.log `${e.type}`;
      console.log `${e.value}`;
      console.log `${e}`;
      var index = e.rawData[1];

      // diagnostic request for state
      if(index == 85){
        return getInfo();
      }

      var state = rotaryControl(index, e.value);
      if (state){
        return sendRequest(state, e.value != 0);
      }

      state = triggerControl(index);
      if (state){
        return sendRequest(state, false);
      }
    });

    function sendRequest(state, wait){
      if (!wait || (!inProgress && wait)){
        $.ajax({
          dataType: "json",
          url: endpoint,
          data: JSON.stringify(state),
          method: "POST",
          beforeSend: function(){
            inProgress = true;
          },
          complete: function(){
            inProgress = false;
          },
          contentType: 'application/json'
        });
      } else {
        console.log('network request in progress, skipping');
      }
    }

  }
})