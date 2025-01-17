const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const passport = require("passport");
const nodemailer = require("nodemailer")
const path = require("path");
const multer = require("multer");

// User Model
const User = require("../models/User");

// Set Storage Engine
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "_" + Date.now() + "_" + path.extname(file.originalname));
  },
});

// Init Upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 2000000 },
  fileFilter: function (req, file, cb) {
  checkFileType(file, cb);
  }
}).single("image")

// Check File Type
function checkFileType(file, cb) {
  // Allowed ext
  const filetypes = /jpeg|jpg|png|gif/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true)
  } else {
    cb('Error: Images Only!')
  }
}

// Login Page
router.get("/login", (req, res) => res.render("login"));

// Register Page
router.get("/register", (req, res) => res.render("register"));

// Register Handle
router.post("/register", upload, (req, res) => {
  const { name, email, username, password, password2 } = req.body;
  const image = req.file.filename;
  let errors = [];

  // Check required fields
  if (!name || !email || !username || !image || !password || !password2) {
    errors.push({ msg: "Please fill in all fields" });
  }

  // Check password match
  if (password !== password2) {
    errors.push({ msg: "Passwords do not match" });
  }

  // Check password length
  if (password.length < 6) {
    errors.push({ msg: "Password should be at least 6 characters" });
  }

  if (errors.length > 0) {
    res.render("register", {
      errors,
      name,
      email,
      username,
      image,
      password,
      password2,
    });
  } else {
    // Validation passed
    User.findOne({ email: email }).then((user) => {
      if (user) {
        // User exists
        errors.push({ msg: "Email is already registered" });
        res.render("register", {
          errors,
          name,
          email,
          username,
          image,
          password,
          password2,
        });
      } else {
        const newUser = new User({
          name,
          email,
          username,
          image,
          password,
        });

        // Mash Password
        bcrypt.genSalt(10, (err, salt) =>
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            // Set password to hashed
            newUser.password = hash;
            // Save user
            newUser
              .save()
              .then((user) => {
                 // Email output
                 const output = `
                  <h3>Welcome note from Eventrite</h3>
                  <h6>Hello ${user.username}</h6>
                  <p>You are getting this mail because you created an account with us here at Eventrite.</p>
                  <p>Our main objective is to make events easier to host and reach its targeted audiences and help in publicity.</p>
                  <br>
                  <h6>We sincerely hope you enjoy our services.</h6>
                  <h6>We welcome you again and we are happy to have you from everyone at Evenrite.</h6>
                `;
                // nodemailer
                const transporter = nodemailer.createTransport({
                  service: "hotmail",
                  auth: {
                    user: "eventrite@outlook.com",
                    pass: "Boluwatife1165"
                  }
                })

                const mailOptions = {
                  from: '"Boluwatife from Eventrite" <eventrite@outlook.com>',
                  to: user.email,
                  subject: 'Welcome note from Eventrite',
                  html: output,
                }

                transporter.sendMail(mailOptions, (err, info) => {
                  if (err) {
                    return console.log(err);
                  }
                  console.log(`Sent: ${info.response}`);
                })
                req.flash(
                  "success_msg",
                  "You are now registered and can log in"
                );
                res.redirect("/users/login");
              })
              .catch((err) => console.log(err));
          })
        );
      }
    });
  }
});

// Login Handle
router.post("/login", (req, res, next) => {
  passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/users/login",
    failureFlash: true,
  })(req, res, next);
});

// Logout Handle
router.get("/logout", (req, res) => {
  req.logout();
  req.flash("success_msg", "You are logged out");
  res.redirect("/users/login");
});

module.exports = router;
