//jshint esversion:6
require("dotenv").config()
const express = require("express")
const body = require("body-parser")
const mongoose = require("mongoose")
const ejs = require("ejs")
const app = express()
const encrypt=require("mongoose-encryption")

app.use(body.urlencoded({ extended: true }))
app.set('view engine', 'ejs')
app.use(express.static("public"))
mongoose.connect("mongodb://localhost:27017/SecretsDB", { useNewUrlParser: true });

const SecretSchema = new mongoose.Schema({
    email: String,
    password: String
})
SecretSchema.plugin(encrypt,{secret:process.env.MYSECRET,encryptedFields:["password"]});
const Secret = mongoose.model("secret", SecretSchema)

app.get("/", function (req, res) {
    res.render("home")
});
app.get("/login", function (req, res) {
    res.render("login")
});
app.post("/login", function (req, res) {
    const password = req.body.password
    Secret.findOne({ email: req.body.username }, function (err, found) {
        if (err) { res.send(err) }
        else {
            if (found) {
                if (found.password === password) {
                    res.render("secrets")
                }
                else { res.send("Your Password is Wrong") }
            }
            else { res.send("Email not found") }
        }
    })
})
app.post("/register", function (req, res) {
    const user = new Secret({
        email: req.body.username,
        password: req.body.password
    })
    user.save(function (err) {
        if (!err) { res.send("Registered Successfully") }
        else { res.send(err) }
    })
});
app.get("/register", function (req, res) {
    res.render("register")
});
app.listen("3000", function (req, res) {
    console.log("successfully running")
});