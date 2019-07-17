const mongoose = require('mongoose');
const CONFIG = require('../config')
//Se face conexiunea la baza de date cu mongoose
mongoose.connect(CONFIG.DB_ADDRESS, { useNewUrlParser: true })
.then(data => {
	console.log("Connected to DB")
})
.catch(err => {
	console.log(err);
})
//Se extrage contructorul de schema
var Schema = mongoose.Schema;

//Se creeaza schema utilizatorului cu toate constrangerile necesare
var UserSchema = new Schema({
	username: { type: String, required: true, unique: true},
	password: { type: String, required: true},
	confirmareparola : {type : String, required : true, unique : true},
	nr_telefon : {type : Number, required : true, unique : true},
	link_poza : {type : String, unique : true},
	email: { type: String, required: true, unique: true },
	user_data: {type: Object},
	friends : {type : Array, required : true, default : [],
		of : {
			type : Object,
			required : true
		}
	},
	requests_to_confirm : {
		type : Array, 
		required : true,
		default : [],
		of : {type : String, required : true, unique : true}
	},
	sent_requests : {
		type : Array, 
		required : true,
		default : [],
		of : {type : String, required : true, unique : true}
	},
	
	messages : {
		type : Array,
		required : true,
		default : [],
		of : {type : Object, required : true, unique : true}
	}
})

//Se adauga schema sub forma de "Colectie" in baza de date
var User = mongoose.model("users", UserSchema);
//Se exporta modelul de control
module.exports = User;