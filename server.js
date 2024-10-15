const express = require('express')
const mongoose = require('mongoose')

const app = express();

const bcrypt = require('bcrypt')

mongoose.connect('mongodb://localhost:27017/mydatabase', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})

.then(() => console.log('Mongo successfully connected'))
.catch(err => console.error('error starting the server', err))

app.use(express.json())

const userSchema = new mongoose.Schema({
    firstName: {type: String, required: true},
    lastName: {type: String, required: true},
    username: {type: String, required: true},
    password: {type: String, required: true}
});

const User = mongoose.model('User', userSchema);

app.post('/users', async (req, res) => {
    const {firstName, lastName, username, password} = req.body;

    try{

    }
    catch(error){
        
    }
})


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
});