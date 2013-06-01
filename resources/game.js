// settings
var soketti = {
  address: 'amc.pori.tut.fi:8081',
  room: null,
  clientId: null,
  maxClients: 30
};

// socket object
var socket = null;

// player list
var players = [];

soketti.init = function() {

  "use strict";

  socket = io.connect(soketti.address);
  console.log('socket server address: ' + soketti.address);

  // http://socket.io/#how-to-use
  // https://github.com/LearnBoost/socket.io/wiki/Rooms
  socket.on('connecting', function(client) {
    console.log('connecting to server');
  });

  socket.on('connect_failed', function(reason) {
    console.error('unable to connect to server', reason);
  });

  socket.on('connect', function() {
    console.log('connected to server');
    // set clientId
    soketti.clientId = socket.socket.sessionid;
  });

  socket.on('clientLeftTheRoom', function(data) {
    console.log('socketId ' + data.socketId + ' poistui huoneesta - ' + data.name);
    $('.message').text('Pelaaja ' + data.name + ' poistui pelistä');

    players = _.filter(players, function(player) {
      return player.id !== data.socketId;
    });

    // update player count
    $('.count').text(players.length);
  });

  socket.on('clientJoinedToRoom', function(data) {
    console.log('socketId ' + data.socketId + ' liittyi huoneeseen - ' + data.name);
    $('.message').text('Pelaaja ' + data.name + ' liittyi peliin');

    var exists = _.find(players, function(player) {
      return data.socketId === player.id;
    });
    if (!exists) {
      players.push({
        id: data.socketId,
        name: data.name,
        score: 0
      });
    }

    // update player count
    $('.count').text(players.length);
  });

  // receive control message
  socket.on('c', function(from, data) {
    if (!_.isNull(from) && _.isObject(data)) {
      var player = _.find(players, function(player) {
        return player.id === from;
      });

      // place to handle game control messages
      console.log(player);
      console.log(data);
    }
  });

  finalizeRoom();
};

function finalizeRoom() {
  if (_.isNull(soketti.clientId)) { //Not yet connected to server
    setTimeout(finalizeRoom, 500);
  } else {
    socket.emit('subscribe', {
      maxClients: soketti.maxClients,
      room: soketti.clientId,
      clientRole: 'manager'
    }, function(data) {
      if (_.isObject(data)) {
        $('.message').text(data.msg);

        // set for global var
        soketti.room = data.room;
        // push room id to url

        // if not yeat
        if ($('.qrcode a').length === 0) {

          var pathname = window.location.pathname;
          var host = window.location.host;
          var protocol = window.location.protocol;

          var clientUrl = protocol + '//' + host + pathname.replace(/\/$/, '') + '/client/?room=' + soketti.room;

          // short url
          var glUrl = "https://www.googleapis.com/urlshortener/v1/url",
            params = JSON.stringify({
              "longUrl": clientUrl,
              "key": "AIzaSyBdhX1T_3kNk8WFXNzTpnBshi6vg3GKlWU"
            });

          var jqxhr = $.ajax(glUrl, {
            type: "POST",
            contentType: "application/json",
            data: params
          });

          jqxhr.done(function(data, textStatus, jqXHR) {
            $('.short-url').text(data.id);
          });

          jqxhr.fail(function(jqXHR, textStatus, errorThrown) {
            console.log("error loading url from goo.gl");
          });

          // fetch qr code for clients
          // https://google-developers.appspot.com/chart/infographics/docs/qr_codes

          var $a = $('<a />').attr({
            href: clientUrl,
            target: '_blank'
          });

          var $img = $('<img />').attr({
            alt: 'QR Code',
            src: 'https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=' + clientUrl
          });

          // development
          $a.append($img).appendTo('.qrcode');
          // production
          // $('.qrcode').append($img);

        } // qrcode a length

      }
    });
  }
}

// Avoid `console` errors in browsers that lack a console.
(function() {
  var method;
  var noop = function() {};
  var methods = [
      'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
      'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
      'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
      'timeStamp', 'trace', 'warn'
  ];
  var length = methods.length;
  var console = (window.console = window.console || {});

  while (length--) {
    method = methods[length];

    // Only stub undefined methods.
    if (!console[method]) {
      console[method] = noop;
    }
  }



  // init socket connection
  soketti.init();

  // socket.emit('c', { room: soketti.slug, obj : { key: 'value' } });

}());
