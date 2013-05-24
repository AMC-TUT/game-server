// note, io.listen(<port>) will create a http server for you
var _ = require('underscore')._,
    redis = require('redis');

var client = redis.createClient();

var io = require('socket.io').listen(9002);

io.enable('browser client minification'); // send minified client
io.enable('browser client etag'); // apply etag caching logic based on version number
io.enable('browser client gzip'); // gzip the file
// io.set('log level', 0); // reduce logging
io.set('transports', ['websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling']); // supported transport methods
io.set('origins', '*:*'); // allow cross origin messaging

var Room = io.sockets.on('connection', function(socket) {

  // local vars
  var joinedRoom = null;
  var clientRole = null; // as default, game is manager
  var maxClients = 0;
  var name = null;

  socket.on('connect', function() {
    // socket.broadcast.emit('user connected');
  });

  socket.on('disconnect', function() {
    if (clientRole === 'manager' && !_.isNull(joinedRoom)) {
      socket.broadcast.to(joinedRoom).emit('managerDisconnected', true);
    } else {
      if(!_.isNull(joinedRoom)) {
        io.sockets.in(joinedRoom).emit('clientLeftTheRoom', {
          name: name,
          socketId: socket.id
        });
      }

    }
  });

  socket.on('subscribe', function(data, fn) {
    // console.log(io.transports[socket.id].name); // connection type, eg. websocket

    // if manager (game)
    if (!_.isUndefined(data.clientRole) && data.clientRole === 'manager') {

      socket.join(data.room);

      // data to local (socket) vars
      joinedRoom = data.room; // string (client id)
      clientRole = data.clientRole; // MANAGER || CLIENT
      maxClients = data.maxClients; // int

      // set maxClients count in Redis
      client.set('game-server:'+data.room+':maxClients', data.maxClients, redis.print);
      // Expire in 8 hours
      client.expire('game-server:'+data.room+':maxClients', 28800000);

      // callback
      fn({
        'room': data.room
      });

    } else if (!_.isUndefined(data.clientRole) && data.clientRole === 'client') { // if client

      var result = {};

      name = data.name;
      clientRole = data.clientRole;

      // check that room exists
      if (!io.sockets.clients(data.room).length) {
        result = {
          'code': 404,
          'msg': 'Pelihuonetta ei löydy'
        };
      } else {

        client.get('game-server:'+data.room+':maxClients', function (err, reply) {
          if (err) {
              console.log("Get Redis error: " + err);
          } else {
            maxClients = parseInt(reply, 10);
            console.log('Redis maxClients: ' + maxClients);

            // room maxClients count
            if (io.sockets.clients(data.room).length > maxClients) {
              result = {
                'code': 403,
                'msg': 'Pelihuone on täynnä'
              };
            } else {
              // join to the room
              socket.join(data.room);

              joinedRoom = data.room;
              name = data.name;

              io.sockets.in(joinedRoom).emit('clientJoinedToRoom', {
                name: name,
                socketId: socket.id
              });

              result = {
                'code': 200,
                'msg': 'Liityit pelihuoneeseen'
              };
            }

          }
        });


      }

      fn(result);

    } else { // with no role
      // join to the room
      socket.join(data.room);

      joinedRoom = data.room;
      name = data.name;

      io.sockets.in(joinedRoom).emit('clientJoinedToRoom', {
        name: name,
        socketId: socket.id
      });

      // callback
      fn({
        'code': 200,
        'msg': 'Liityit pelihuoneeseen'
      });

    }
  });

  /* control message from client to game & from game to clients */
  socket.on('c', function(data) {

    console.log(name + ' ' + joinedRoom);

    if (_.isNull(joinedRoom)) {
      return false;
    }

    // add from value
    if (clientRole === 'client') {
      // send control message to game
      io.sockets.socket(joinedRoom).emit('c', socket.id, data.obj);
    } else {
      // Emitting an event to all clients in a particular room
      // io.sockets.in('room').emit('event_name', data)
      // send control message to all clients
      io.sockets.in(joinedRoom).emit('c', null, data.obj);
    }

  });

  /* unsubscribe message */
  socket.on('unsubscribe', function(data) {
    io.sockets.in(joinedRoom).emit('clientLeftTheRoom', {
      name: name,
      socketId: socket.id
    });
    socket.leave(data.room);
  });

});
