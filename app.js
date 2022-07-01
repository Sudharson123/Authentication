//jshint esversion:6
require("dotenv").config()
const express = require("express")
const body = require("body-parser")
const mongoose = require("mongoose")
const ejs = require("ejs")
const app = express()
const session = require("express-session")
const passport = require("passport")
const localPassportMongoose = require("passport-local-mongoose")
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate")

app.use(body.urlencoded({ extended: true }))
app.set('view engine', 'ejs')
app.use(express.static("public"))
app.use(session({
    secret: "dont expose this secret",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize())
app.use(passport.session())

mongoose.connect("mongodb://localhost:27017/SecretsDB", { useNewUrlParser: true });

const SecretSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleID: String,
    secret:String
})
SecretSchema.plugin(localPassportMongoose)
SecretSchema.plugin(findOrCreate)
const Secret = mongoose.model("secret", SecretSchema)

passport.use(Secret.createStrategy())
passport.serializeUser(function (user, done) {
    done(null, user.id);
    // where is this user.id going? Are we supposed to access this anywhere?
});

// used to deserialize the user
passport.deserializeUser(function (id, done) {
    Secret.findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
    function (accessToken, refreshToken, profile, cb) {
        Secret.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));


app.get("/", function (req, res) {
    res.render("home")
});
app.get("/login", function (req, res) {
    res.render("login")
});
app.get('/logout', function (req, res, next) {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ["profile"] }));

app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });

app.get("/secrets", function (req, res) {
    Secret.find({ "secret": { $ne: null } }, function (err, found) {
        if (err) { res.send(err) }
        else {
            if (found) {
                console.log(found)
                res.render("secrets", { total: found });
            }
        }
    });
}
);
app.get("/submit", function (req, res) {
   
    if (req.isAuthenticated()) {
        res.render("submit")
    }
    else { res.redirect("login") }
}
);
app.post("/submit", function (req, res) {
    const submittedsecret = req.body.secret
    Secret.findById(req.user.id, function (err, found) {
        if (err) { res.send(err) }
        else {
            if (found) {
                found.secret = submittedsecret;
                found.save(function () {
                    res.redirect("/secrets");
                })
            }
        }
    })
});
app.post("/login", function (req, res) {
    const user = new Secret({
        username: req.body.username,
        password: req.body.password
    })
    req.login(user, function (err) {
        if (err) {
            res.send(err)
        }
        else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets")
            })
        }
    })
});

app.post("/register", function (req, res) {
    Secret.register({ username: req.body.username }, req.body.password, function (err, found) {
        if (err) {
            res.send(err)
            res.redirect("/register")
        }
        else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets")
            })
        }
    })
});
app.get("/register", function (req, res) {
    res.render("register")
});

app.listen("3000", function (req, res) {
    console.log("successfully running")
});