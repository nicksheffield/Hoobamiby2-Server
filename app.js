// ----------------------------------------------------------------------------
// Dependencies
// ----------------------------------------------------------------------------
var requireDir = require('require-dir');
var io = require('socket.io')(8001);


// ----------------------------------------------------------------------------
// Error handler
// ----------------------------------------------------------------------------
process.on('uncaughtException', function(exception) {
	console.log(exception);
});


// ----------------------------------------------------------------------------
// Events
// ----------------------------------------------------------------------------
var events = requireDir('./events');


// ----------------------------------------------------------------------------
// Socket.connect
// ----------------------------------------------------------------------------
io.on('connection', function(socket) {
	console.log('connected', socket.id);

	// if there's an error, log it instead of just crashing
	socket.on('error', function(err) {
		console.error(err.stack);
	});

	// load events
	for (var name in events) {
		events[name](io, socket);
	}
});


console.log('----------------------------------------------');
console.log('|                                            |');
console.log('|    Hoobamiby 2: http://localhost:8001/     |');
console.log('|                                            |');
console.log('----------------------------------------------');