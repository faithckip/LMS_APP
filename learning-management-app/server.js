//server.js
const express= require('express');
const session = require('express-session');
const bcrypt= require('bcryptjs');
const mysql = require('mysql');
const {check, validationResult} = require('express-validator');
const bodyParser = require('body-parser');

const app = express();
//const port = 3200;

//configure session middleware
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

//create Mysql connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root', //change to mysql password
    database: 'lmsDB'
});

//Connect to MySQL
connection.connect((err) => {
    if (err) {

    console.error('Error connecting to MySQl: ' + err.stack);
return;
}
console.log('Connected to MySQl as id' + connection.threadId);
});

//serve static files from the default directory
//_dirname=LMS_App;
app.use(express.static(__dirname));

//set up middleware to parse incoming JSON data
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({extended: true}));
app.use(bodyParser.urlencoded({extended:true}));

//Define routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

//Define a user representation for clarity
const User ={
   tableName: 'users',
   createUser: function(newUser, callback){
        connection.query('INSERT INTO ' + this.tableName + ' SET ?', newUser, callback);
   },
    getUserByEmail: function(email, callback){
        connection.query('SELECT * FROM ' + this.tableName + ' WHERE email = ?', email, callback); 
   },
    getUserByUsername: function(username, callback){
        connection.query('SELECT * FROM ' + this.tableName + ' WHERE username = ?', username, callback );
    }
};

//Registration route
app.post('/register', [
    //validate email and username fields
    check('email').isEmail(),
    check('username').isAlphanumeric().withMessage('Username must be alphanumeric'),

    //custom validation to check if email and username are unique
    check('email').custom(async (value) =>{
        const user =  User.getUserByEmail(value);
        if (user) {
            throw new Error('Email already exists');
        }
    }),
    check ('username').custom(async (value) =>{
        const user =  User.getUserByUsername(value);
        if (user) {
            throw new Error ('Username already exists');
        }
    }),
], async (req,res) => {
    //check for validation errors
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors: errors.array()});
    }

    //Hash the password
    const saltRounds = 10;
    const hashedPassword= await bcrypt.hash(req.body.password, saltRounds);

    //create a new user object
    const newUser = {
        email: req.body.email,
        username: req.body.username,
        password: hashedPassword,
        full_name: req.body.full_name
    };

    //Insert into MySQL
    User.createUser(newUser, (error, results, fields) =>{
        if (error) {
            console.error('Error inserting user: ' + error.message);
            return res.status(500).json({error: error.message});
        }
        console.log('Inserted a new user with id ' + results.insertId);
        res.status(201).json(newUser);
    });
});

//Login route
app.post('/login', (req,res) => {
    const {username, password} = req.body;
    //Retrieve user from datanase
    connection.query('SELECT * FROM users WHERE username = ?', [username], (err,results) =>{
        if(err) throw err;
        if(results.length === 0){
            res.status(401).send('Invalid username or password');
        } else 
        {
            const user = results[0];
            //compare passwords
            bcrypt.compare(password, user.password, (err, isMatch) =>{
                if (err) throw err;
                if(isMatch){
                    //store user in session
                    req.session.user = user;
                    res.send('Login successful');
                }
                else{
                    res.status(401).send('Invalid username or password');
                }
            });
        }
    });
});
//app.post('/login', (req,res) =>{
    //Extract student data from the request body
    //const {name,age,grade} = req.body();

    //SQL query to insert a new student record into the database
   // const sql = 'INSERT INTO students(name,age,grade) VALUES (?,?,?)';

    //Execute the SQL query with the student data
    //db.query(sql, [name,age,grade], (err, result) => {
        //if(err){
            //console.error('Error adding student: ', err);
            //res.status(500).send('There was an error adding student to the database');
            //return;
        //}
        //console.log('Student added successfully.');
        //res.status(200).send('Student added successfully.');
    //});
//});

//Logout route
app.post('/logout', (req,res) => {
    req.session.destroy();
    res.send('Logout successful');
});

//Dashboard route
app.get('/dashboard', (req, res) => {
    //Assuming you have middleware to handle user authentication and store user information in req.user
    const userFullName = req.user.full_name;
    res.render('dashboard', {fullName: userFullName});
});

//Route to retrieve course content
app.get('/course/:id', (req,res) => {
    const courseId = req.params.id;
    const sql = 'SELECT * FROM courses WHERE id = ?';

    db.query(sql, [courseId], (err, result) =>{
        if(err) {
        throw err;
    }
    //send course content as JSON response
        res.json(result);
    });
});

//app.delete('/deleteStudent/:id', (req,res) => {
    //const id = req.params.id;
    //const sql = 'DELETE from Students WHERE id= ?';
    //db.query(sql, id, (err,result) => {
        //if(err) throw err;
        //res.send('Student deleted  successfully.');
    //});
//});


//start server
const PORT = process.env.PORT || 3200;
app.listen(PORT, ()=> {
    console.log('Server running on port $(PORT)');
});

