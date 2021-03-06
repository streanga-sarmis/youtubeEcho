'use strict';

const fs = require('fs');
const cookieSession = require('cookie-session');
const express = require('express');
const bodyParser = require('body-parser');
const yas = require('youtube-audio-stream');
const ytpl = require('ytpl');
const http = require('http');
const bcrypt = require('bcryptjs');
const validator = require('express-validator');
const passport = require('passport');
const session = require('express-session');
const LocalStrategy = require('passport-local').Strategy;


const ROOT_PATH = `${__dirname}/layouts/`;

const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use('/', express.static(ROOT_PATH));
app.use('/res', express.static(`${ROOT_PATH}res/`));
app.use(validator());

app.use(cookieSession({
	name: 'session',
	keys: ['key1'],
	maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// Express Session middleware
app.use(session({
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true,
}));

require('./pass')(passport);
app.use(passport.initialize());
app.use(passport.session());


app.use(function(req, res, next){
	if(req.user != null){
		req.session.email = req.user.email;
	}
	
	next();
});


app.get('/', (req, res) => {
  res.sendFile(`${ROOT_PATH}/login.html`);
});

app.get('/music', (req, res) => {

  var requestUrl = `https://www.youtube.com/watch?v=${req.query.id}`;

  yas(requestUrl).pipe(res);
});

app.get('/upage', (req, res) => {
	if(req.user == null){
		res.redirect('/login');
	}else{
		res.sendFile(`${ROOT_PATH}/upage.html`);
	}
});

app.get('/login', (req, res) => {
	if(req.user != null){
		res.redirect('/upage');
	}else{
		res.sendFile(`${ROOT_PATH}/login.html`);
	}
});

app.post('/login', (req, res, next) =>{	
	passport.authenticate('local', {
		successRedirect: '/upage',
		failureRedirect: '/login',
	})(req, res, next);
});

app.get('/logout', function(req, res){
  req.logout();
  req.session = null;
  res.redirect('/login')
});

app.get('/register', (req, res) =>{
  res.sendFile(`${ROOT_PATH}/register.html`);
});

app.post('/register', (req, res) => {
  res.sendFile(`${ROOT_PATH}/register.html`);
  let user = req.body.username;
  let pass = req.body.password1;
  let email = req.body.email;
  let fname = "First";
  let lname = "Last";
  let token = "123";
  
  
	req.checkBody('username', 'Username is required').notEmpty();
	req.checkBody('email', 'Email is required').notEmpty();
	req.checkBody('email', 'Email is not valid.').isEmail();
	req.checkBody('password1', 'Password is required').notEmpty();
	req.checkBody('password2', 'Passwords do not match').equals(req.body.password1);
	
	let errors = req.validationErrors();
	
	if(!errors){
			bcrypt.genSalt(5, (err, salt) => {
				bcrypt.hash(pass, salt, (err, hash) => {
					if(err){
						console.log(err);
						return;
					}else{
						pass = hash;
						let inputData = {username: user, password: pass, first_name: fname, last_name: lname, email:email, token: token};
						inputData = JSON.stringify(inputData);

						var request = new http.ClientRequest({
						host: "25.82.135.108", // change on for laptop
						port: 8080,
						path: "/TP/addUser",
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"Content-Length": Buffer.byteLength(inputData)
						}
					});
					request.end(inputData);
					
					request.on("response", response => {
					  console.log("STATUS: " + response.statusCode);
					});
				}
			});
		});
	}
});

app.get('/reqsgl', (req, res) => {
  let plid = req.query.id;

  ytpl(`${plid}`, (err, playlist) => {
    if(err){
      console.log(err);
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.send(playlist);
  });
});

app.get('/reqpl', (req, resp) => {
  let inputData = {email: req.session.email};
  inputData = JSON.stringify(inputData);

  let options = {
    host: "25.82.135.108", // change for laptop
    port: 8080,
    path: "/TP/getUserData",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(inputData)
    }
  }

  var request = new http.ClientRequest(options);
  
  request.end(inputData);

  let items = new Array();

  request.on('response', res => {

    res.on('data', chunk => {
      let data = JSON.parse(chunk);
      let playlists = data.playlists;

      console.log(playlists);
      let cheat = 0;
      playlists.forEach(item => {
        ytpl(item.link, (err, playlist) => {
          if(err){
            console.log(err);
            return;
          }
          console.log(playlist.title);
          ++cheat;
          items.push(
            {
              id: playlist.id, 
              title: playlist.title
            }
          );
          if(cheat == playlists.length){
            console.log(JSON.stringify(items));
            resp.send(JSON.stringify(items));
          }
        });
      });
    });
  });
});

  // loop here
  /*
  ytpl(`${plid}`, (err, playlist) => {
    if(err){
      console.log(err);
      return;
    }

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({
      "items":[
        {
          "id": "PLRBp0Fe2GpglkzuspoGv-mu7B2ce9_0Fn",
          "title": "💥 NCS: Indie Dance",
        },
        {
          "id": "PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj",
          "title": "Pop Music Playlist: Timeless Pop Hits (Updated Weekly 2018)",
        },
        {
          "id": "PLE9NBypnb2JnDYh7Z5OQAo9MjDj2Eef9m",
          "title": "Undertale Covers",
        },
      ]
    }));
  }
  */

app.post('/addPlaylist', (req, res) => {
  let inputData = {email: req.session.email, link: req.body.id};
  inputData = JSON.stringify(inputData);

  let options = {
    host: "25.82.135.108", // change for laptop
    port: 8080,
    path: "/TP/addPlaylistToUser",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(inputData)
    }
  }

  let request = new http.ClientRequest(options);
  request.end(inputData);
  
  request.on("response", response => {
    console.log("STATUS: " + response.statusCode);
  });
});

let server = app.listen(3000, () => {
  console.log('Listening on port 3000!');

  process.argv.forEach((val, index, array) => {
    if(val === "testing"){
      setInterval(process.exit(0), 3000);
    }
  });
});

// MUST BE CHANGED
// IMPLEMENT CLUSTER AND DOMAIN FOR HANDLING EXCEPTIONS
process.on('uncaughtException', err => console.log(err));