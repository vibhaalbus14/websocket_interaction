var express=require("express")
var app=express()
const port = process.env.PORT;
require('dotenv').config();
const mongo_db_uri = process.env.MONGO_URI;


//app.listen(7070,()=>{console.log("express server started at port 7070")})//when http and express servers are on diff ports , this line can be used

app.use(express.urlencoded({extended:true}))//automatically uses body-parser in latest version
app.use(express.json())

var bodyParser=require("body-parser")
app.use(bodyParser())

var router=express.Router()
app.use("/loginPage",router)

var ejs=require("ejs")
app.set("view engine","ejs")

var cookieParser=require("cookie-parser")
app.use(cookieParser())

var expressSession=require("express-session")
app.use(expressSession({
    secret:"keyboard cat",
    cookie:{maxAge:5*60*1000},
    resave:false,
    saveUninitialized:false
}))
    
var http=require("http")
//on same port
var server=http.createServer(app)
//var server=http.createServer()//on different ports
//server.listen(9090,()=>{"http server started at port 9090"})

app.use(express.static(__dirname));

var socketIO=require("socket.io")
var io_server=socketIO(server)

//db connection handling
var mongoose=require("mongoose")
mongoose.connect(mongo_db_uri)
.then(()=>{console.log("connection successfully made to database")})
.catch((err)=>{console.log("not connected to database :"+err)})

mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);})

//graceful disconnection of db on ctrl+c command
//process is an object that represents the currrent node.js process.It provides control over this node.js app

//syntax:process.on("event",callback)

process.on("SIGINT",()=>{
    try{
        mongoose.disconnect()
        console.log("db disconnected successfully")
        process.exit(0)//exit the process with no errors
    }
    catch(err){
        console.log("db not disconnected \n error is " + err)
        process.exit(1)//exit the process with errors
    }
})


var dataSchema=new mongoose.Schema({ username: String,
    email: String,
    password: String,
    gender: String})
var dataModel=mongoose.model("users",dataSchema)


//routing logic
app.get("/",sendToLoginPage)
function sendToLoginPage(req,res){
    res.redirect("/loginPage")
}

app.get("/loginPage",loginPage)
function loginPage(req,res){
    res.render("login")
    }

router.post("/submit",checkCredentials)
function checkCredentials(req,res)
{
   dataModel.findOne({username:req.body.username,password:req.body.password})
   .then((data) => {
    if (data) {
        console.log("login successful");
        res.redirect("/about");
    } else {
        console.log("login failed");
        res.redirect("/signUp");
    }
}).catch((err) => {
    console.log("Error occurred during login: " + err);
    res.redirect("/loginPage");
});
}
   
    
app.get("/signUp",signUp)
function signUp(req,res){
    res.render("signUP")
}

app.post("/signUp/submit",(req,res)=>{
    const new_user=new dataModel({username:req.body.username,
        email: req.body.email,
        password: req.body.password,
        gender: req.body.gender})
    
    new_user.save()
    .then(() => {
        console.log("Sign up successful");
        res.redirect("/loginPage");
    })
    .catch(err => {
        console.log("Sign up unsuccessful: " + err);
        res.redirect("/signUp");
    });})

app.get("/home",vital)
function vital(req,res){
    res.render("home")
}

app.get("/about",aboutUs)
function aboutUs(req,res){
    res.render("about")
}
app.get("/askSignOut",(req,res)=>{
    res.render("signOUT")
})
app.get("/signOut/submit",signOut)
function signOut(req,res){
    console.log("signout successful")
    req.session.destroy()
    res.redirect("/loginPage")
    
}

//socket logic
io_server.on("connect",(client)=>{
    console.log("server connected")
    
    client.on("registerName",(data)=>{ 
        data2=JSON.parse(data)
        msg=data2.username+" connected"
        //client.emit("printInfo",JSON.stringify({info:msg}))
        io_server.sockets.emit("printInfo",JSON.stringify({info:msg}))

    })

    client.on("chatDeliver",(data)=>{
        data2=JSON.parse(data)
        msg=data2.username+" : "+data2.content
        //client.emit("printInfo",JSON.stringify({info:msg}))
       io_server.sockets.emit("printInfo",JSON.stringify({info:msg}))
    })
    
})

//port handling
server.listen(port,()=>{console.log(`http server started at port ${port}.It handles express and socket.io's req and responses from same port`)})

/*
var express=require("express")
var app=express()
app.listen(7070)//one port cannot handle 2 severs and hence when createServer(app) is used,app.listen should be removed

var http=require("http")
var server=http.createServer(app)//http server will automatically listen to req from express app
server.listen(7070)

var socketIo=require("socket.io")
var socket_server=socketIo(server)
*/