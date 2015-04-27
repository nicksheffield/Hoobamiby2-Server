var mem = require('./memory');
var _ = require('lodash');

module.exports = function(io, socket) {
	// public properties
	this.roomName = '';
	this.host = {};
	this.judge = {};
	this.players = [];
	this.blackCard = {};
	this.submissions = {};
	this.expansions = [];
	this.started = false;
	this.ended = false;
	this.reveal = false;
	this.chosen = false;
	this.timeoutSeconds = 10;
	this.minPlayers = 2;
	this.scoreLimit = 3;

	// private properties
	var cards = require('../expansions/default');
	var usedWhites = [];
	var usedBlacks = [];
	var destroyTimer = null;
	var self = this;

	this.generateRoomName = function(len) {
		// any letters in here MUST be lowercase. Uppercase will be IMPOSSIBLE to match
		var chars = ['1','2','3','4','5','6','7','8','9',
		             'a','b','c','d','e','f','g','h','j','k'];
		var roomName;

		// generate a room name and check if it's already in use.
		// if so, do it again.
		// keep going until it's not in use
		do {
			roomName = '';

			for (var i = 0; i < len; i++) {
				roomName += chars[parseInt(Math.random() * chars.length)];
			}

		} while (mem.games[roomName] !== undefined);

		this.roomName = roomName;
	};

	this.getWhites = function(n) {
		var hand = [];

		n = n ? n : 1;

		for (var i = 0; i < n; i++) {
			var card;

			do {
				card = _.sample(cards.whites);
			} while (usedWhites.indexOf(card) != -1);

			usedWhites.push(card);
			hand.push(card);
		}

		return hand;
	};

	this.getBlack = function() {
		var card;

		do {
			card = _.sample(cards.blacks);
		} while (usedWhites.indexOf(card) != -1);

		usedBlacks.push(card);
		return card;
	};

	this.newBlack = function() {
		this.blackCard = this.getBlack();
	};

	this.announceUpdate = function() {
		this.announceToPlayers('gameUpdate', self);
	};

	this.announceToPlayers = function(event, data) {
		if (this.players.length > 0) {
			if (io.sockets.adapter.rooms[this.roomName] !== undefined) {
				process.stdout.write("announcing to players in room " + this.roomName + "... ");
				io.sockets.in(this.roomName).emit(event, data);
				process.stdout.write("done\n");
			} else {
				console.log('would have announced game, but no room');
			}
		}
	};

	// maybe not using
	this.emitToHost = function(event, data) {
		io.to(this.host.socketID).emit(event, data);
	};

	// not using
	this.endRound = function() {

	};

	this.chooseNewHost = function() {
		console.log('choosing host');
		var player = _.sample(this.players);

		player.isHost = true;
		player.emitUpdate();

		this.host = player;

		this.announceUpdate();
	};

	this.nextJudge = function() {

		this.judge.isJudge = false;

		this.judge.emitUpdate();

		var index = 0;
		
		_.forEach(this.players, function(player, i){
			if(player.socketID == self.judge.socketID){
				index = i;
			}
		});

		if(index >= this.players.length - 1){
			index = 0;
		}else{
			index++;
		}

		this.judge = this.players[index];
		this.judge.isJudge = true;

		this.judge.emitUpdate();
	};

	this.addPlayer = function(player) {
		this.players.push(player);

		console.log('adding player');
		// tell the user what room they're in
		player.room = this.roomName;

		if (this.players.length === 1) {
			this.chooseNewHost();
			console.log('host chosen');
		}

		clearTimeout(destroyTimer);
		console.log('stopped timer');
	};

	this.removePlayer = function(socketID) {
		var wasHost = mem.findPlayer(socketID).isHost;

		this.players = _.reject(this.players, function(p) {
			return p.socketID == socketID;
		});

		delete this.submissions[socketID];

		if (this.players.length === 0) {

			clearTimeout(destroyTimer);
			console.log('started timer');
			destroyTimer = setTimeout(function() {
				mem.deleteGame(self);
			}, self.timeoutSeconds * 1000);

		} else if (wasHost) {
			this.chooseNewHost();
		}
	};

	this.dealCards = function(player) {
		// if the player has less than 10 cards
		if (player.whiteCards.length < 10) {

			// then count how many new cards until they have 10
			var count = 10 - player.whiteCards.length;

			var newCards = this.getWhites(count);

			// and give them that many cards
			player.whiteCards = player.whiteCards.concat(newCards);
		}
	};
};