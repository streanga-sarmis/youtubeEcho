'use strict';

const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const yas = require('youtube-audio-stream');
const ytpl = require('ytpl');
const http = require('http');
const bcrypt = require('bcryptjs');
const validator = require('express-validator');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;


const ROOT_PATH = `${__dirname}/layouts/`;

const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use('/', express.static(ROOT_PATH));
app.use('/res', express.static(`${ROOT_PATH}res/`));
app.use(validator());

require('./pass')(passport);

app.use(passport.initialize());
app.use(passport.session());


app.get('/', (req, res) => {
  res.sendFile(`${ROOT_PATH}/index.html`);
});

app.get('/music', (req, res) => {

  var requestUrl = `https://www.youtube.com/watch?v=${req.query.id}`;

  yas(requestUrl).pipe(res);
});

app.get('/upage', (req, res) => {
  res.sendFile(`${ROOT_PATH}/upage.html`);
});

app.get('/login', (req, res) => {
  res.sendFile(`${ROOT_PATH}/login.html`);
});

app.post('/login', (req, res, next) =>{
	passport.authenticate('local', {
		successRedirect: '/',
		failureRedirect: '/',
	})(req, res, next);
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
						host: "25.81.204.11", // change on for laptop
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

app.get('/reqpl', (req, res) => {
  let options = {
    host: "25.81.204.11", // change for laptop
    port: 8080,
    path: "/TP/getUserData",
    method: "POST",
    headers: {
      "Content-Type": "application/json"
      //"Content-Length": Buffer.byteLength(inputData)
    }
  }

  var request = new http.request(options, res => {
    console.log(`Status: ${res.statusCode}`);
    let items = new Array();

    res.on('data', chunk => {
      console.log(`Body: ${chunk}`);
      let data = JSON.parse(chunk);
      // loop the playlists, or not even
      // just send them to the page.
      // make sure to call ytpl beforehand to get all the details needed in the page
      //  id 
      //  title
      // the playlist link is the id already
      // just need it for the title, what a waste
      let playlists = data.playlists.splice();
      playlists.forEach(item => {
        ytpl(item.link, (err, playlist) => {
        if(err){
          console.log(err);
          return;
        }

        items.push_back({
          playlist.id, 
          playlist.title
        });

      });
    });
  });

  res.on('end', () => {
    req.send(items);
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
});

app.post('/addPlaylist', (req, res) => {
  // send the request to the database and add 
  // the playlist to the user
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
//
