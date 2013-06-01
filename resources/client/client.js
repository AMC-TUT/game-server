var socket = null,
  questionId = 0,
  answer = 'foo',
  score = 0;

(function($) {

  "use strict";

  var soketti = {
    room: window.location.search.replace(/\?room=/, '').replace(/\/+$/, ''),
    clientRole: 'client',
    name: '',
    address: 'amc.pori.tut.fi:8081'
  };

  socket = io.connect(soketti.address, {
    'sync disconnect on unload': true
  });

  // http://socket.io/#how-to-use
  // https://github.com/LearnBoost/socket.io/wiki/Rooms
  socket.on('connecting', function(client) {
    console.log('connecting to server');
    $('.message').text('Muodostetaan yhteyttä palveluun...');
  });

  socket.on('connect_failed', function(reason) {
    console.error('unable to connect to server', reason);
    $('.message').text('Palveluun ei saada yhteyttä');
  });

  socket.on('connect', function() {
    console.log('connected to server');
    $('.message').text('Yhteys palveluun muodostettiin');

    // Rejoin the room when reconnecting is successful
    if (!_.isNull(soketti.room) && soketti.name !== '') { // not null then this is reconnection
      joinRoom();
    }
  });

  socket.on('reconnect', function() {
    $('.message').text('Yhteys palveluun muodostettiin uudelleen');
  });

  socket.on('reconnecting', function() {
    $('.message').text('Muodostetaan yhteyttä palveluun...');
  });

  socket.on('reconnect_failed', function() {
    $('.message').text('Palveluun ei saada yhteyttä');
  });

  socket.on('error', function(reason) {
    $('.message').text('Yhteys palveluun katkesi');
  });

  socket.on('managerDisconnected', function(data) {
    $('.message').text('Yhteys peliin katkesi');
  });

  socket.on('clientJoinedToRoom', function(data) {
    console.log('socketId' + data.socketId + ' liittyi huoneeseen - ' + data.name);
    $('.message').text('Pelaaja ' + data.name + ' liittyi peliin');
  });

  socket.on('clientLeftTheRoom', function(data) {
    console.log('socketId' + data.socketId + ' poistui huoneesta - ' + data.name);
    $('.message').text('Pelaaja ' + data.name + ' poistui pelistä');
  });

  // Bind event to Before user leaves page
  $(window).on('beforeunload onbeforeunload', function(e) {
    socket.emit('unsubscribe', {
      'room': soketti.room
    });
  });

  socket.on('c', function(from, data) {
    console.log(data);

    if (typeof data === 'object') {
      var json = JSON.stringify(data);
      $('.message').text(json);

      // question
      if (!_.isUndefined(data.answer)) {
        $('.btn').removeClass('disabled false true active');

        answer = data.answer;
        questionId = data.id;
      }

      if (!_.isUndefined(data.timeout)) {

        $('.btn').addClass('disabled');

        $('.btn.' + answer).addClass('true');

        setTimeout(function() {
          $('.btn').removeClass('false true');
        }, 1000);

        // reset
        questionId = 0;
        answer = 'foo';
      }

      if (!_.isUndefined(data.gameOver)) {
        $('.message').text('Peli päättyi. Sait ' + score + ' pistettä');
        // reset all
        score = 0;
        answer = 'foo';
        questionId = 0;
      }
    } // is obj
  });

  $('.btn').on('mousedown', function(event) { // touchstart
    var $btn = $(event.target).closest('.btn');
    if (!$btn.hasClass('disabled')) {
      $btn.addClass('active');
    }
  });

  $('.btn').on('mouseup', function(event) { // touchend touchcancel
    console.log('mouseup');

    var $btn = $(event.target).closest('.btn');
    console.log($btn);

    // class shifting
    $btn.removeClass('active'); // just to show effect

    if (!$btn.hasClass('disabled')) {

      $('.btn').addClass('disabled');
      $btn.removeClass('disabled');

      var btn = $btn.data('btn');
      var controlObj = {
        answer: btn,
        id: questionId
      };

      console.log(controlObj);
      socket.emit('c', {
        room: soketti.room,
        obj: controlObj
      });

      // correct answer
      if (btn === answer) {
        $btn.addClass('true');

        score += 1;

      } else {
        $btn.addClass('false');
      }

    }

    $('.btn').addClass('disabled');
  });

  $('.signin').fadeIn(function() {
    // do something when form is ready (visible)
  });

  $(document).on('submit', 'form', function(event) {
    event.preventDefault();

    var $form = $(event.target),
      $name = $form.find('.name'),
      text = $name.val();

    if (text.length === 0) {
      $name.addClass('error');
    } else {
      soketti.name = text;
      console.log(soketti);

      joinRoom();

      $name.removeClass('error');
      $('.signin').fadeOut(function() {
        $('.controller').fadeIn();
      });
    }
  });

  function joinRoom() {
    socket.emit('subscribe', {
      'room': soketti.room,
      clientRole: soketti.clientRole,
      name: soketti.name
    }, function(data) {
      if (_.isObject(data)) {
        $('.message').text(data.msg);
      }
    });
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
  }());

})(jQuery);
