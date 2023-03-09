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
      },
      contentType: 'application/json'
    });
  }

  var colors = {
    '46': 19, //bisexual
    '47': 30, //drywet
    '48': 41 //magred
  }

  var rotaryMap = {
    'volumecoarse': 'bri',
    '3':            'sx',
    '9':            'ix'
  }

  var effects = {
    '46': {fx: 0},
    '47': {fx: 2}
  }

  function rescale(value, newMax=255) {
    return parseInt(newMax*value)
  }

  function rotaryControl(command,value){
    change = {}
    mapping = rotaryMap[command] || rotaryMap[command.replace('controller','')];
    if(mapping){
      change[mapping] = rescale(value);
      return {seg: change};
    }else{
      return null;
    }
  }

  function triggerControl(command){
    mapping = effects[command.replace('controller','')];
    if(mapping){
      return {seg: mapping};
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
        return sendRequest(state, false);
      }
      return null;
    });

    var inProgress = false;

    mySynth.channels[1].addListener("controlchange", e => {
      console.log `${e.subtype}`;
      console.log `${e.value}`;

      var state = rotaryControl(e.subtype, e.value);
      if (state){
        return sendRequest(state, e.value != 0);
      }

      state = triggerControl(e.subtype);
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