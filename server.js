// server.js
// where your node app starts

// init project
require('dotenv').config();
var _ = require('lodash');
var express = require('express');
var bodyParser = require('body-parser');
var Big = require('big.js');
var app = express();
var form = require('express-form'),
    field = form.field;
var session = require('express-session');
app.use(bodyParser.urlencoded({ extended: true }));

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(session({ secret: process.env.SECRET }));
app.use(express.static('public'));

var hbs = require('hbs');
hbs.registerHelper('expForm', function(bign) { 
	var n = new Big(bign);
	if(n.c.length > 6) {
		return n.toPrecision(6) 
	} else {
		return n.toString();
	}
});
hbs.registerHelper('length', function(array) { return array.length });
hbs.registerHelper('timetill', function(date) {
	var parsedDate;
	if(typeof date != 'Date') {
		parsedDate = new Date(date);
	} else {
		parsedDate = date;
	}
	var millis = parsedDate - new Date();
	if(millis > 60 * 60 * 1000) {
		return Math.floor(millis / 1000 / 60 / 60) + ' hours';
	} else {
		return Math.floor(millis / 1000 / 60) + ' minutes';
	}
});
hbs.registerHelper('contains', function (list, item) {
	return list.includes(item);
});
hbs.registerHelper('not', bool => !bool);
app.set('view engine', 'hbs');

// init  db
var low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
 
const adapter = new FileSync('./.data/testdb.json', {
	defaultValue: {voters: [], strikes: [], polls: []},
	serialize: (db) => JSON.stringify(db),
	deserialize: (string) => JSON.parse(string, function (k, v) {
		var bign;
		try {
			bign = new Big(v);
			return bign;
		} catch (error) {
			return v
		}
	})
})
const db = low(adapter);
db._.mixin({
    sortWith : function(arr, customFn) {
        return _.map(arr).sort(customFn)
    }
}); 

db.defaults({voters: [], strikes: [], polls: []})
  .write();
                                                  
// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (req, res) {
	console.log(req.session.error);
  res.render('index', {
	  strikes: db.get('strikes').sortWith((a, b) => new Big(a.number).cmp(new Big(b.number))).reverse().value(),
	  polls: db.get('polls').sortBy(['deadline']).value(),
	  error: 'error' in req.session ? req.session.error : false 
	  })
  req.session.error = false;
});

app.post('/captain', 
	form(
		field("target").trim().required(),
		field("other").trim(),
		field("cause").trim().required(),
		field("number").trim().required().isInt().toInt(),
		field("power").trim().required().isInt().toInt(),
		field("password").required()
	),
	function (req, res) {
		var form = req.form;
		if (!form.isValid) {
			req.session.error = form.errors.toString();
		} else if(form.password === process.env.ADMINPASS) { //Replace with process.env
			if(form.target === 'other') {
				addStrike(form.other, form.number, form.power);
			} else {
				addStrike(form.target, form.number, form.power);
			}
		} else {
			req.session.error = "Incorrect password.";
		}
		res.redirect('/');
	}
);

app.post('/class', 
	form(
		field("target").trim().required(),
		field("other").trim(),
		field("cause").trim().required(),
		field("number").trim().required().isInt().toInt(),
		field("power").trim().required().isInt().toInt(),
		field("requestor").trim().required()
	),
	function (req, res) {
		var form = req.form;
		if (!form.isValid) {
			req.session.error = form.errors.toString();
		} else {
			if(form.target === 'other') {
				addPoll(form.other, form.cause, form.requestor, form.number, form.power);
			} else {
				addPoll(form.target, form.cause, form.requestor, form.number, form.power);
			}
		}
		res.redirect('/');
	}
);

app.post('/vote/:id', 
	form(
		field("voter").trim().required(),
		field("id").trim().required()
	),
	function (req, res) {
		var form = req.form;
		if (!form.isValid) {
			req.session.error = form.errors.toString();
		} else {
			var poll = db.get('polls').find({ id: req.params.id });
			if(!poll.get('votes').value().includes(form.voter) && db.get('voters').value().includes(form.voter)) {
				poll.get('votes').push(form.voter).write();
				if(poll.get('votes').value().length >= 8) {
					var pollVal = poll.value();
					addStrike(pollVal.name, pollVal.total, 0);
					db.get('polls').remove({ id: req.params.id }).write();
				}
			} else if(db.get('voters').value().includes(form.voter)) {
				req.session.error = "Already voted.";
			} else {
				req.session.error = "Invalid voting id. Ask Ethan if you don't have one.";
			}
		}
		res.redirect('/');
	}
);

function addStrike(name, number, power) {
	var target = db.get('strikes').find({ name: name }).value();
	if(target) {
		db.get('strikes').find({ name: name }).set('number', target.number.plus(new Big(number).times(new Big(10).pow(power)))).write(); 
	} else {
		db.get('strikes').push({name: name, number: new Big(number).times(new Big(10).pow(power))}).write();
	}
}

function addPoll(name, cause, requestor, number, power) {
	var total = new Big(number).times(new Big(10).pow(power));
	var deadline = new Date();
	deadline.setDate(deadline.getDate() + 1);
	db.get('polls').push({name: name, total: total, cause: cause, requestor: requestor, votes: [], deadline: deadline, id: 'b' + Math.floor((1 + Math.random()) * 0x10000) }).write(); //TODO replace with actual uuid
}

// listen for requests :)
var listener = app.listen(8000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
